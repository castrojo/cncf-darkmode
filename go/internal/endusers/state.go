package endusers

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// EndusersState holds persistent sync state
type EndusersState struct {
	ETag string `json:"etag"`
}

// LoadSyncState reads persisted state from cacheDir.
func LoadSyncState(cacheDir string) EndusersState {
	data, err := os.ReadFile(filepath.Join(cacheDir, "state.json"))
	if err != nil {
		return EndusersState{}
	}
	var s EndusersState
	_ = json.Unmarshal(data, &s)
	return s
}

// SaveSyncState persists state to cacheDir.
func SaveSyncState(cacheDir string, s EndusersState) error {
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return err
	}
	data, _ := json.MarshalIndent(s, "", "  ")
	return os.WriteFile(filepath.Join(cacheDir, "state.json"), data, 0644)
}

// LoadPreviousMembers reads the previous members snapshot from cacheDir.
func LoadPreviousMembers(cacheDir string) ([]byte, error) {
	return os.ReadFile(filepath.Join(cacheDir, "previous_members.json"))
}

// SavePreviousMembers persists the members snapshot to cacheDir.
func SavePreviousMembers(cacheDir string, data []byte) error {
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(cacheDir, "previous_members.json"), data, 0644)
}
