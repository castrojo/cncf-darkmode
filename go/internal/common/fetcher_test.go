package common_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/castrojo/cncf-darkmode/go/internal/common"
)

func TestFetcherETag304(t *testing.T) {
	const etag = `"abc123"`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("If-None-Match") == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("ETag", etag)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"data":"test"}`)) //nolint:errcheck
	}))
	defer srv.Close()

	f := common.NewFetcher()

	// First fetch — gets the data
	result, err := f.Fetch(srv.URL, "")
	if err != nil {
		t.Fatal(err)
	}
	if result.NotModified {
		t.Error("first fetch should not be NotModified")
	}
	if result.ETag != etag {
		t.Errorf("expected ETag %s, got %s", etag, result.ETag)
	}

	// Second fetch with ETag — should get 304
	result2, err := f.Fetch(srv.URL, etag)
	if err != nil {
		t.Fatal(err)
	}
	if !result2.NotModified {
		t.Error("second fetch with matching ETag should be NotModified")
	}
}

func TestFetcherNon200Error(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	f := common.NewFetcher()
	_, err := f.Fetch(srv.URL, "")
	if err == nil {
		t.Error("expected error for non-200 response")
	}
}

func TestFetcherReturnsBody(t *testing.T) {
	const body = `{"hello":"world"}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(body)) //nolint:errcheck
	}))
	defer srv.Close()

	f := common.NewFetcher()
	result, err := f.Fetch(srv.URL, "")
	if err != nil {
		t.Fatal(err)
	}
	if string(result.Body) != body {
		t.Errorf("body = %q, want %q", string(result.Body), body)
	}
}
