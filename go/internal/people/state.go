package people

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

const (
	stateFile    = "state.json"
	previousFile = "previous_people.json"
)

// PeopleState tracks the last processed commit SHAs for both watched repos.
type PeopleState struct {
	LastSHA        string    `json:"lastSha"`
	LandscapeETag  string    `json:"landscapeETag"`
	FoundationSHA  string    `json:"foundationSha"`
	FoundationETag string    `json:"foundationETag"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// StateManager handles loading and saving sync state to cacheDir.
type StateManager struct {
	cacheDir string
}

// NewStateManager creates a StateManager rooted at cacheDir (created if absent).
func NewStateManager(cacheDir string) (*StateManager, error) {
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return nil, err
	}
	return &StateManager{cacheDir: cacheDir}, nil
}

// LoadState reads the cached state. Returns a zero State if not found.
func (m *StateManager) LoadState() (PeopleState, error) {
	var s PeopleState
	data, err := os.ReadFile(filepath.Join(m.cacheDir, stateFile))
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	return s, json.Unmarshal(data, &s)
}

// SaveState writes the state to cache.
func (m *StateManager) SaveState(s PeopleState) error {
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(m.cacheDir, stateFile), data, 0o644)
}

// LoadPrevious reads the previous people map from cache.
func (m *StateManager) LoadPrevious() (map[string]RawPerson, error) {
	result := make(map[string]RawPerson)
	data, err := os.ReadFile(filepath.Join(m.cacheDir, previousFile))
	if errors.Is(err, os.ErrNotExist) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	return result, json.Unmarshal(data, &result)
}

// SavePrevious writes the current people map to cache for the next run.
func (m *StateManager) SavePrevious(people map[string]RawPerson) error {
	data, err := json.MarshalIndent(people, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(m.cacheDir, previousFile), data, 0o644)
}
