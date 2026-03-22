package people

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	cacheFile = "api_cache.json"
	cacheTTL  = 90 * 24 * time.Hour
)

// UserStats holds enrichment data fetched from the GitHub API.
type UserStats struct {
	AvatarURL         string    `json:"avatarUrl"`
	Location          string    `json:"location,omitempty"`
	Bio               string    `json:"bio,omitempty"`
	Pronouns          string    `json:"pronouns,omitempty"`
	Contributions     int       `json:"contributions"`
	PublicRepos       int       `json:"publicRepos"`
	YearsContributing int       `json:"yearsContributing"`
	FetchedAt         time.Time `json:"fetchedAt"`
}

// APICache stores per-user API results with a TTL to avoid re-fetching.
// All methods are safe for concurrent use.
type APICache struct {
	mu    sync.RWMutex
	path  string
	data  map[string]UserStats
	dirty bool
}

// LoadAPICache reads the cache from cacheDir. Returns an empty cache if not found.
func LoadAPICache(cacheDir string) (*APICache, error) {
	path := filepath.Join(cacheDir, cacheFile)
	c := &APICache{path: path, data: make(map[string]UserStats)}

	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return c, nil
	}
	if err != nil {
		return c, err
	}
	return c, json.Unmarshal(raw, &c.data)
}

// Get returns cached stats for a handle if present and not expired.
func (c *APICache) Get(handle string) (UserStats, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	s, ok := c.data[handle]
	if !ok || time.Since(s.FetchedAt) > cacheTTL {
		return UserStats{}, false
	}
	return s, true
}

// Set stores stats for a handle and marks the cache dirty.
func (c *APICache) Set(handle string, s UserStats) {
	s.FetchedAt = time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[handle] = s
	c.dirty = true
}

// Invalidate removes a cached entry, forcing re-fetch on next Get.
func (c *APICache) Invalidate(handle string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.data, handle)
	c.dirty = true
}

// Save writes the cache to disk only if it was modified.
func (c *APICache) Save() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.dirty {
		return nil
	}
	data, err := json.MarshalIndent(c.data, "", "  ")
	if err != nil {
		return err
	}
	c.dirty = false
	return os.WriteFile(c.path, data, 0o644)
}
