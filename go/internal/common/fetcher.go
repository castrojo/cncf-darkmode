package common

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

// FetchResult holds the response body and ETag for conditional requests
type FetchResult struct {
	Body        []byte
	ETag        string
	NotModified bool
}

// Fetcher makes HTTP requests with ETag support for conditional GET
type Fetcher struct {
	client *http.Client
}

func NewFetcher() *Fetcher {
	return &Fetcher{
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

// Fetch performs a GET request. If etag is non-empty, sends If-None-Match header.
// Returns NotModified=true if server returns 304.
func (f *Fetcher) Fetch(url, etag string) (*FetchResult, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}
	req.Header.Set("User-Agent", "cncf-darkmode/1.0")

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return &FetchResult{NotModified: true, ETag: etag}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d for %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading body: %w", err)
	}

	return &FetchResult{
		Body: body,
		ETag: resp.Header.Get("ETag"),
	}, nil
}
