package projects

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// State holds persistent sync state for the projects sync
type State struct {
	ETag string `json:"etag"`
}

// LoadSyncState reads the projects sync state from cacheDir.
func LoadSyncState(cacheDir string) State {
	data, err := os.ReadFile(filepath.Join(cacheDir, "state.json"))
	if err != nil {
		return State{}
	}
	var s State
	_ = json.Unmarshal(data, &s)
	return s
}

// SaveSyncState persists the projects sync state.
func SaveSyncState(cacheDir string, s State) error {
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(cacheDir, "state.json"), data, 0644)
}

// LoadPreviousProjects reads the previous projects snapshot from cacheDir.
func LoadPreviousProjects(cacheDir string) ([]byte, error) {
	return os.ReadFile(filepath.Join(cacheDir, "previous_projects.json"))
}

// SavePreviousProjects persists the projects snapshot.
func SavePreviousProjects(cacheDir string, data []byte) error {
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(cacheDir, "previous_projects.json"), data, 0644)
}
