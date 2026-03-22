package common

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

const DefaultTTLDays = 90

type CacheEntry struct {
	Data     json.RawMessage `json:"data"`
	CachedAt time.Time       `json:"cached_at"`
	TTLDays  int             `json:"ttl_days"`
}

type Cache struct {
	dir string
}

func NewCache(dir string) *Cache {
	return &Cache{dir: dir}
}

func (c *Cache) key(name string) string {
	return filepath.Join(c.dir, name+".json")
}

func (c *Cache) Get(name string, v any) (bool, error) {
	data, err := os.ReadFile(c.key(name))
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	var entry CacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return false, nil
	}
	ttl := entry.TTLDays
	if ttl == 0 {
		ttl = DefaultTTLDays
	}
	if time.Since(entry.CachedAt) > time.Duration(ttl)*24*time.Hour {
		return false, nil // expired
	}
	return true, json.Unmarshal(entry.Data, v)
}

func (c *Cache) Set(name string, v any, ttlDays int) error {
	if err := os.MkdirAll(c.dir, 0755); err != nil {
		return err
	}
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if ttlDays == 0 {
		ttlDays = DefaultTTLDays
	}
	entry := CacheEntry{
		Data:     data,
		CachedAt: time.Now(),
		TTLDays:  ttlDays,
	}
	entryData, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(c.key(name), entryData, 0644)
}
