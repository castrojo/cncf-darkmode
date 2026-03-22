package projects

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

// WriteProjects sorts and writes the project list to outDir/projects.json.
func WriteProjects(outDir string, projects []SafeProject, updatedAt map[string]string) error {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		return err
	}
	for i, p := range projects {
		if updatedAt != nil {
			if ts, ok := updatedAt[p.Slug]; ok && ts != "" {
				projects[i].UpdatedAt = ts
			}
		}
		if projects[i].UpdatedAt == "" {
			projects[i].UpdatedAt = LatestMilestoneDate(p)
		}
	}
	sort.Slice(projects, func(i, j int) bool {
		return LatestMilestoneDate(projects[i]) > LatestMilestoneDate(projects[j])
	})

	data, err := json.MarshalIndent(projects, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(outDir, "projects.json"), data, 0644)
}

// WriteChangelog merges newEvents with existing changelog.json (newest-first) and writes.
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
	sort.Slice(all, func(i, j int) bool {
		return all[i].Timestamp > all[j].Timestamp
	})

	data, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outPath, data, 0644)
}
