package common

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// SyncState persists ETags and other sync metadata between runs
type SyncState struct {
	ETags map[string]string `json:"etags"`
}

func LoadState(cacheDir string) (*SyncState, error) {
	path := filepath.Join(cacheDir, "sync-state.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return &SyncState{ETags: make(map[string]string)}, nil
	}
	if err != nil {
		return nil, err
	}
	var s SyncState
	if err := json.Unmarshal(data, &s); err != nil {
		return &SyncState{ETags: make(map[string]string)}, nil
	}
	if s.ETags == nil {
		s.ETags = make(map[string]string)
	}
	return &s, nil
}

func SaveState(cacheDir string, s *SyncState) error {
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(cacheDir, "sync-state.json"), data, 0644)
}
