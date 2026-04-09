package scorecard

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// fakeResponse is a canned HTTP response for use in round-trip tests.
type fakeResponse struct {
	status  int
	body    string
	headers map[string]string
}

// singleResponder returns an http.RoundTripper that answers every request
// with the given fakeResponse.
type singleResponder struct {
	resp fakeResponse
	reqs []*http.Request // captured for inspection
}

func (s *singleResponder) Do(req *http.Request) (*http.Response, error) {
	s.reqs = append(s.reqs, req)
	w := httptest.NewRecorder()
	for k, v := range s.resp.headers {
		w.Header().Set(k, v)
	}
	w.WriteHeader(s.resp.status)
	_, _ = w.Body.WriteString(s.resp.body)
	return w.Result(), nil
}

// sequenceResponder returns responses in order (last is repeated if exhausted).
type sequenceResponder struct {
	responses []fakeResponse
	idx       int
	reqs      []*http.Request
}

func (s *sequenceResponder) Do(req *http.Request) (*http.Response, error) {
	s.reqs = append(s.reqs, req)
	r := s.responses[s.idx]
	if s.idx < len(s.responses)-1 {
		s.idx++
	}
	w := httptest.NewRecorder()
	for k, v := range r.headers {
		w.Header().Set(k, v)
	}
	w.WriteHeader(r.status)
	_, _ = w.Body.WriteString(r.body)
	return w.Result(), nil
}

// samplePayload builds a minimal scorecard API JSON body.
func samplePayload(repo string, score float64) string {
	p := scorecardResponse{
		Repo:  repo,
		Score: score,
		Date:  "2024-03-01",
		Checks: []struct {
			Name          string  `json:"name"`
			Score         int     `json:"score"`
			Reason        string  `json:"reason"`
			Documentation struct {
				Short string `json:"short"`
				URL   string `json:"url"`
			} `json:"documentation"`
		}{
			{Name: "Branch-Protection", Score: 8, Reason: "branch protection enabled"},
			{Name: "License", Score: 10, Reason: "license file detected"},
		},
	}
	b, _ := json.Marshal(p)
	return string(b)
}

// ---------------------------------------------------------------------------
// TestFetchScore_Success — happy path: 200 OK with structured body
// ---------------------------------------------------------------------------

func TestFetchScore_Success(t *testing.T) {
	responder := &singleResponder{
		resp: fakeResponse{
			status: http.StatusOK,
			body:   samplePayload("github.com/kubernetes/kubernetes", 8.5),
			headers: map[string]string{
				"ETag": `"etag-k8s"`,
			},
		},
	}
	c := newTestClient(responder)
	result, etag, err := c.FetchScore("kubernetes", "kubernetes", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Score != 8.5 {
		t.Errorf("score = %v, want 8.5", result.Score)
	}
	if result.Date != "2024-03-01" {
		t.Errorf("date = %q, want %q", result.Date, "2024-03-01")
	}
	if len(result.Checks) != 2 {
		t.Errorf("checks len = %d, want 2", len(result.Checks))
	}
	if result.Checks[0].Name != "Branch-Protection" {
		t.Errorf("check[0].Name = %q, want Branch-Protection", result.Checks[0].Name)
	}
	if etag != `"etag-k8s"` {
		t.Errorf("etag = %q, want %q", etag, `"etag-k8s"`)
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_ThreeProjects — 3 distinct projects returned correctly
// ---------------------------------------------------------------------------

func TestFetchScore_ThreeProjects(t *testing.T) {
	projects := []struct {
		owner string
		repo  string
		score float64
	}{
		{"kubernetes", "kubernetes", 8.5},
		{"prometheus", "prometheus", 7.2},
		{"opentelemetry", "opentelemetry-collector", 6.9},
	}

	for _, p := range projects {
		t.Run(p.owner+"/"+p.repo, func(t *testing.T) {
			responder := &singleResponder{
				resp: fakeResponse{
					status:  http.StatusOK,
					body:    samplePayload("github.com/"+p.owner+"/"+p.repo, p.score),
					headers: map[string]string{"ETag": `"etag-` + p.repo + `"`},
				},
			}
			c := newTestClient(responder)
			result, _, err := c.FetchScore(p.owner, p.repo, "")
			if err != nil {
				t.Fatalf("FetchScore(%s/%s): %v", p.owner, p.repo, err)
			}
			if result.Score != p.score {
				t.Errorf("score = %v, want %v", result.Score, p.score)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_ETagCaching — second call with matching ETag returns nil result
// ---------------------------------------------------------------------------

func TestFetchScore_ETagCaching(t *testing.T) {
	const etag = `"etag-abc123"`

	// First call: 200 with ETag.
	firstResponder := &singleResponder{
		resp: fakeResponse{
			status:  http.StatusOK,
			body:    samplePayload("github.com/argo/argo-cd", 7.0),
			headers: map[string]string{"ETag": etag},
		},
	}
	c := newTestClient(firstResponder)
	result1, returnedETag, err := c.FetchScore("argo", "argo-cd", "")
	if err != nil {
		t.Fatalf("first fetch: %v", err)
	}
	if result1 == nil {
		t.Fatal("first fetch: expected non-nil result")
	}
	if returnedETag != etag {
		t.Errorf("first fetch etag = %q, want %q", returnedETag, etag)
	}

	// Second call: 304 Not Modified (ETag matches).
	secondResponder := &singleResponder{
		resp: fakeResponse{
			status: http.StatusNotModified,
		},
	}
	c2 := newTestClient(secondResponder)
	result2, returnedETag2, err2 := c2.FetchScore("argo", "argo-cd", etag)
	if err2 != nil {
		t.Fatalf("second fetch (304): %v", err2)
	}
	if result2 != nil {
		t.Error("second fetch (304): expected nil result to signal no update needed")
	}
	if returnedETag2 != etag {
		t.Errorf("second fetch etag = %q, want %q (should preserve old ETag)", returnedETag2, etag)
	}

	// Verify If-None-Match was sent in second request.
	if len(secondResponder.reqs) < 1 {
		t.Fatal("no request captured by second responder")
	}
	sentETag := secondResponder.reqs[0].Header.Get("If-None-Match")
	if sentETag != etag {
		t.Errorf("If-None-Match = %q, want %q", sentETag, etag)
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_RateLimit — 429 triggers backoff then succeeds on retry
// ---------------------------------------------------------------------------

func TestFetchScore_RateLimit(t *testing.T) {
	seq := &sequenceResponder{
		responses: []fakeResponse{
			{
				status: http.StatusTooManyRequests,
				headers: map[string]string{"Retry-After": "2"},
			},
			{
				status:  http.StatusOK,
				body:    samplePayload("github.com/fluxcd/flux2", 7.8),
				headers: map[string]string{"ETag": `"etag-flux"`},
			},
		},
	}
	var sleptDurations []time.Duration
	c := &Client{
		http: seq,
		sleepFn: func(d time.Duration) {
			sleptDurations = append(sleptDurations, d)
		},
	}

	result, _, err := c.FetchScore("fluxcd", "flux2", "")
	if err != nil {
		t.Fatalf("expected success after retry, got: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Score != 7.8 {
		t.Errorf("score = %v, want 7.8", result.Score)
	}

	// Verify backoff was triggered with Retry-After value (2s).
	if len(sleptDurations) == 0 {
		t.Error("expected at least one sleep for rate limit backoff")
	}
	if sleptDurations[0] != 2*time.Second {
		t.Errorf("rate limit sleep = %v, want 2s (from Retry-After header)", sleptDurations[0])
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_RateLimitFallbackDelay — 429 without Retry-After uses 30s default
// ---------------------------------------------------------------------------

func TestFetchScore_RateLimitFallbackDelay(t *testing.T) {
	seq := &sequenceResponder{
		responses: []fakeResponse{
			{status: http.StatusTooManyRequests}, // no Retry-After header
			{
				status:  http.StatusOK,
				body:    samplePayload("github.com/envoyproxy/envoy", 8.1),
				headers: map[string]string{"ETag": `"etag-envoy"`},
			},
		},
	}
	var sleptDurations []time.Duration
	c := &Client{
		http: seq,
		sleepFn: func(d time.Duration) {
			sleptDurations = append(sleptDurations, d)
		},
	}

	result, _, err := c.FetchScore("envoyproxy", "envoy", "")
	if err != nil {
		t.Fatalf("expected success, got: %v", err)
	}
	if result == nil || result.Score != 8.1 {
		t.Errorf("unexpected result: %+v", result)
	}
	if len(sleptDurations) == 0 {
		t.Fatal("expected sleep for rate limit fallback")
	}
	if sleptDurations[0] != defaultBackoff {
		t.Errorf("fallback sleep = %v, want %v", sleptDurations[0], defaultBackoff)
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_RetryOn5xx — 500 triggers exponential backoff, 3 attempts
// ---------------------------------------------------------------------------

func TestFetchScore_RetryOn5xx(t *testing.T) {
	seq := &sequenceResponder{
		responses: []fakeResponse{
			{status: http.StatusInternalServerError},
			{status: http.StatusServiceUnavailable},
			{
				status:  http.StatusOK,
				body:    samplePayload("github.com/containerd/containerd", 9.0),
				headers: map[string]string{"ETag": `"etag-containerd"`},
			},
		},
	}
	var sleptDurations []time.Duration
	c := &Client{
		http: seq,
		sleepFn: func(d time.Duration) {
			sleptDurations = append(sleptDurations, d)
		},
	}

	result, _, err := c.FetchScore("containerd", "containerd", "")
	if err != nil {
		t.Fatalf("expected success after 2 retries, got: %v", err)
	}
	if result.Score != 9.0 {
		t.Errorf("score = %v, want 9.0", result.Score)
	}

	// Should have slept twice: 1s then 2s (exponential backoff).
	if len(sleptDurations) != 2 {
		t.Errorf("expected 2 sleeps, got %d: %v", len(sleptDurations), sleptDurations)
	}
	if sleptDurations[0] != time.Second {
		t.Errorf("first sleep = %v, want 1s", sleptDurations[0])
	}
	if sleptDurations[1] != 2*time.Second {
		t.Errorf("second sleep = %v, want 2s", sleptDurations[1])
	}
	// 3 total requests sent.
	if len(seq.reqs) != 3 {
		t.Errorf("expected 3 requests, got %d", len(seq.reqs))
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_AllAttemptsExhausted — 3x 500 returns error
// ---------------------------------------------------------------------------

func TestFetchScore_AllAttemptsExhausted(t *testing.T) {
	seq := &sequenceResponder{
		responses: []fakeResponse{
			{status: http.StatusInternalServerError},
			{status: http.StatusInternalServerError},
			{status: http.StatusInternalServerError},
		},
	}
	c := &Client{http: seq, sleepFn: func(d time.Duration) {}}

	result, _, err := c.FetchScore("failorg", "failrepo", "")
	if err == nil {
		t.Fatal("expected error after all attempts exhausted")
	}
	if result != nil {
		t.Errorf("expected nil result on error, got %+v", result)
	}
	if !strings.Contains(err.Error(), "all 3 attempts failed") {
		t.Errorf("error message %q should mention '3 attempts failed'", err.Error())
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_NotFound — 404 returns error immediately (no retry)
// ---------------------------------------------------------------------------

func TestFetchScore_NotFound(t *testing.T) {
	responder := &singleResponder{
		resp: fakeResponse{status: http.StatusNotFound},
	}
	c := newTestClient(responder)

	result, _, err := c.FetchScore("ghost", "norepo", "")
	if err == nil {
		t.Fatal("expected error for 404")
	}
	if result != nil {
		t.Error("expected nil result for 404")
	}
	if len(responder.reqs) != 1 {
		t.Errorf("expected 1 request (no retry on 404), got %d", len(responder.reqs))
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_URLConstruction — verify correct API URL is called
// ---------------------------------------------------------------------------

func TestFetchScore_URLConstruction(t *testing.T) {
	cases := []struct {
		owner   string
		repo    string
		wantSuf string
	}{
		{"kubernetes", "kubernetes", "/kubernetes/kubernetes"},
		{"cncf", "cncf-darkmode", "/cncf/cncf-darkmode"},
		{"open-telemetry", "opentelemetry-go", "/open-telemetry/opentelemetry-go"},
	}

	for _, tc := range cases {
		t.Run(tc.owner+"/"+tc.repo, func(t *testing.T) {
			responder := &singleResponder{
				resp: fakeResponse{
					status:  http.StatusOK,
					body:    samplePayload("github.com/"+tc.owner+"/"+tc.repo, 5.0),
					headers: map[string]string{},
				},
			}
			c := newTestClient(responder)
			_, _, err := c.FetchScore(tc.owner, tc.repo, "")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(responder.reqs) == 0 {
				t.Fatal("no request captured")
			}
			url := responder.reqs[0].URL.String()
			if !strings.HasSuffix(url, tc.wantSuf) {
				t.Errorf("URL = %q, want suffix %q", url, tc.wantSuf)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_UserAgentHeader — verify User-Agent is set
// ---------------------------------------------------------------------------

func TestFetchScore_UserAgentHeader(t *testing.T) {
	responder := &singleResponder{
		resp: fakeResponse{
			status:  http.StatusOK,
			body:    samplePayload("github.com/test/test", 5.0),
			headers: map[string]string{},
		},
	}
	c := newTestClient(responder)
	_, _, err := c.FetchScore("test", "test", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(responder.reqs) == 0 {
		t.Fatal("no request captured")
	}
	ua := responder.reqs[0].Header.Get("User-Agent")
	if ua != "castrojo/cncf-darkmode" {
		t.Errorf("User-Agent = %q, want %q", ua, "castrojo/cncf-darkmode")
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_NoETagSentOnFirstCall — first call must not send If-None-Match
// ---------------------------------------------------------------------------

func TestFetchScore_NoETagSentOnFirstCall(t *testing.T) {
	responder := &singleResponder{
		resp: fakeResponse{
			status:  http.StatusOK,
			body:    samplePayload("github.com/spiffe/spiffe", 7.5),
			headers: map[string]string{"ETag": `"etag-spiffe"`},
		},
	}
	c := newTestClient(responder)
	_, _, err := c.FetchScore("spiffe", "spiffe", "") // empty prevETag
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(responder.reqs) == 0 {
		t.Fatal("no request captured")
	}
	ifNoneMatch := responder.reqs[0].Header.Get("If-None-Match")
	if ifNoneMatch != "" {
		t.Errorf("If-None-Match = %q, want empty string on first call", ifNoneMatch)
	}
}

// ---------------------------------------------------------------------------
// TestFetchScore_LiveServer — integration test against a real httptest.Server
// ---------------------------------------------------------------------------

func TestFetchScore_LiveServer(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return 304 if If-None-Match matches.
		if r.Header.Get("If-None-Match") == `"v1"` {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("ETag", `"v1"`)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		payload := samplePayload("github.com/cncf/cncf", 8.0)
		_, _ = w.Write([]byte(payload))
	}))
	defer ts.Close()

	// Override the API base for this test by pointing to test server.
	// We bypass apiBase by calling the client directly via a custom Doer that
	// rewrites the host.
	rewire := &hostRewriter{base: ts.URL, inner: ts.Client()}
	c := &Client{http: rewire, sleepFn: func(d time.Duration) {}}

	// First fetch: should get result + ETag.
	result, etag, err := c.FetchScore("cncf", "cncf", "")
	if err != nil {
		t.Fatalf("live server first fetch: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result from live server")
	}
	if result.Score != 8.0 {
		t.Errorf("score = %v, want 8.0", result.Score)
	}
	if etag != `"v1"` {
		t.Errorf("etag = %q, want %q", etag, `"v1"`)
	}

	// Second fetch with same ETag: should get nil result (304).
	result2, etag2, err2 := c.FetchScore("cncf", "cncf", etag)
	if err2 != nil {
		t.Fatalf("live server second fetch: %v", err2)
	}
	if result2 != nil {
		t.Errorf("expected nil result on 304, got %+v", result2)
	}
	if etag2 != `"v1"` {
		t.Errorf("etag after 304 = %q, want %q", etag2, `"v1"`)
	}
}

// hostRewriter rewrites the URL host to redirect requests to the test server.
type hostRewriter struct {
	base  string // e.g. "http://127.0.0.1:PORT"
	inner *http.Client
}

func (h *hostRewriter) Do(req *http.Request) (*http.Response, error) {
	// Replace everything before the path with the test server base.
	cloned := req.Clone(req.Context())
	cloned.URL.Scheme = "http"
	cloned.URL.Host = strings.TrimPrefix(h.base, "http://")
	return h.inner.Do(cloned)
}
