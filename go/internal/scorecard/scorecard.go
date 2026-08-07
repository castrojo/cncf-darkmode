// Package scorecard provides an HTTP client for the OpenSSF Scorecard API.
//
// Endpoint: https://api.securityscorecards.dev/projects/github.com/<owner>/<repo>
//
// Features:
//   - ETag-based caching: sends If-None-Match on subsequent fetches, skips update on 304
//   - Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s) on 5xx / network errors
//   - Rate limit backoff: respects Retry-After header on 429; falls back to 30s delay if absent
//   - No authentication required — public unauthenticated API
package scorecard

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

const (
	apiBase        = "https://api.securityscorecards.dev/projects/github.com"
	maxAttempts    = 3
	defaultBackoff = 30 * time.Second
)

// CheckResult represents a single Scorecard check.
type CheckResult struct {
	Name          string `json:"name"`
	Score         int    `json:"score"`
	Reason        string `json:"reason"`
	Documentation struct {
		Short string `json:"short"`
		URL   string `json:"url"`
	} `json:"documentation"`
}

// ScoreResult is the structured result returned by FetchScore.
type ScoreResult struct {
	Repo   string        `json:"repo"`
	Score  float64       `json:"score"`
	Date   string        `json:"date"`
	Checks []CheckResult `json:"checks"`
}

// scorecardResponse is the raw JSON shape returned by the API.
type scorecardResponse struct {
	Repo  string  `json:"repo"`
	Score float64 `json:"score"`
	Date  string  `json:"date"`
	// Checks in the API response use a different structure at the top level.
	Checks []struct {
		Name          string  `json:"name"`
		Score         int     `json:"score"`
		Reason        string  `json:"reason"`
		Documentation struct {
			Short string `json:"short"`
			URL   string `json:"url"`
		} `json:"documentation"`
	} `json:"checks"`
}

// Doer is an interface for HTTP clients, allowing test injection.
type Doer interface {
	Do(req *http.Request) (*http.Response, error)
}

// Client is the OpenSSF Scorecard HTTP client.
type Client struct {
	http    Doer
	sleepFn func(d time.Duration) // injectable for tests
}

// NewClient creates a Client with the default http.DefaultClient and real time.Sleep.
func NewClient() *Client {
	return &Client{
		http:    http.DefaultClient,
		sleepFn: time.Sleep,
	}
}

// newTestClient creates a Client with injected http Doer and no-op sleepFn for fast tests.
func newTestClient(doer Doer) *Client {
	return &Client{
		http:    doer,
		sleepFn: func(d time.Duration) {}, // no-op
	}
}

// FetchScore fetches the OpenSSF Scorecard result for owner/repo.
//
// prevETag may be empty on first call. When the server returns 304 Not Modified,
// FetchScore returns (nil, prevETag, nil) — the caller should keep its cached value.
//
// Returns (result, newETag, error).
func (c *Client) FetchScore(owner, repo, prevETag string) (*ScoreResult, string, error) {
	url := fmt.Sprintf("%s/%s/%s", apiBase, owner, repo)

	var lastErr error
	backoff := time.Second

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, "", fmt.Errorf("building request: %w", err)
		}
		req.Header.Set("User-Agent", "castrojo/cncf-darkmode")
		if prevETag != "" {
			req.Header.Set("If-None-Match", prevETag)
		}

		resp, err := c.http.Do(req)
		if err != nil {
			// Network error — retry with backoff.
			lastErr = fmt.Errorf("attempt %d: network error: %w", attempt, err)
			if attempt < maxAttempts {
				c.sleepFn(backoff)
				backoff *= 2
			}
			continue
		}

		switch {
		case resp.StatusCode == http.StatusNotModified:
			resp.Body.Close()
			// Caller keeps cached ScoreResult unchanged.
			return nil, prevETag, nil

		case resp.StatusCode == http.StatusTooManyRequests:
			resp.Body.Close()
			delay := defaultBackoff
			if ra := resp.Header.Get("Retry-After"); ra != "" {
				if secs, err := strconv.Atoi(ra); err == nil && secs > 0 {
					delay = time.Duration(secs) * time.Second
				}
			}
			lastErr = fmt.Errorf("attempt %d: rate limited (429), waiting %s", attempt, delay)
			if attempt < maxAttempts {
				c.sleepFn(delay)
			}
			continue

		case resp.StatusCode >= 500:
			resp.Body.Close()
			lastErr = fmt.Errorf("attempt %d: server error %d", attempt, resp.StatusCode)
			if attempt < maxAttempts {
				c.sleepFn(backoff)
				backoff *= 2
			}
			continue

		case resp.StatusCode == http.StatusNotFound:
			resp.Body.Close()
			return nil, "", fmt.Errorf("scorecard not found for %s/%s (404)", owner, repo)

		case resp.StatusCode != http.StatusOK:
			resp.Body.Close()
			return nil, "", fmt.Errorf("unexpected status %d for %s/%s", resp.StatusCode, owner, repo)
		}

		// 200 OK — parse body.
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, "", fmt.Errorf("reading response body: %w", err)
		}

		var raw scorecardResponse
		if err := json.Unmarshal(body, &raw); err != nil {
			return nil, "", fmt.Errorf("parsing scorecard JSON for %s/%s: %w", owner, repo, err)
		}

		checks := make([]CheckResult, 0, len(raw.Checks))
		for _, c := range raw.Checks {
			checks = append(checks, CheckResult{
				Name:   c.Name,
				Score:  c.Score,
				Reason: c.Reason,
				Documentation: struct {
					Short string `json:"short"`
					URL   string `json:"url"`
				}{
					Short: c.Documentation.Short,
					URL:   c.Documentation.URL,
				},
			})
		}

		result := &ScoreResult{
			Repo:   raw.Repo,
			Score:  raw.Score,
			Date:   raw.Date,
			Checks: checks,
		}

		newETag := resp.Header.Get("ETag")
		if newETag == "" {
			newETag = prevETag // keep old if server omits
		}
		return result, newETag, nil
	}

	return nil, "", fmt.Errorf("all %d attempts failed for %s/%s: %w", maxAttempts, owner, repo, lastErr)
}
