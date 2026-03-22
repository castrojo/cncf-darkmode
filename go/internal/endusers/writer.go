package endusers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

// WriteMembers writes the members list to outDir/members.json
func WriteMembers(outDir string, members []SafeMember, updatedAt map[string]string) error {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		return err
	}
	for i, m := range members {
		if updatedAt != nil {
			if ts, ok := updatedAt[m.Slug]; ok && ts != "" {
				members[i].UpdatedAt = ts
			}
		}
		if members[i].UpdatedAt == "" && m.JoinedAt != "" {
			members[i].UpdatedAt = m.JoinedAt
		}
	}
	sort.Slice(members, func(i, j int) bool {
		return members[i].JoinedAt > members[j].JoinedAt
	})
	data, err := json.MarshalIndent(members, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outDir, "members.json"), data, 0644)
}

// WriteArchitectures writes the architectures list to outDir/architectures.json.
func WriteArchitectures(outDir string, architectures []SafeArchitecture) error {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		return err
	}
	sort.Slice(architectures, func(i, j int) bool {
		return architectures[i].SubmittedAt > architectures[j].SubmittedAt
	})
	data, err := json.MarshalIndent(architectures, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outDir, "architectures.json"), data, 0644)
}

// WriteChangelog merges newEvents with existing changelog.json and writes.
func WriteChangelog(outDir string, newEvents []Event) error {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		return err
	}
	outPath := filepath.Join(outDir, "changelog.json")

	var existing []Event
	if data, err := os.ReadFile(outPath); err == nil {
		_ = json.Unmarshal(data, &existing)
	}

	all := append(newEvents, existing...)
	sort.Slice(all, func(i, j int) bool { return all[i].Timestamp > all[j].Timestamp })
	data, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outPath, data, 0644)
}
