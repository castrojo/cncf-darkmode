// Command enrich reads src/data/projects/projects.json, fetches an OpenSSF
// Scorecard score for each project that has a github.com repoUrl, and writes
// the aggregated results to src/data/projects/openssf-scores.json.
//
// Flags:
//
//	--dry-run      Print results to stdout instead of writing to disk.
//	--best-effort  Continue on per-project fetch errors instead of exiting.
//
// ETag cache file: src/data/projects/openssf-etags.json
// (written alongside openssf-scores.json, loaded on subsequent runs to avoid
// redundant API calls when data has not changed).
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/castrojo/cncf-darkmode/internal/scorecard"
)

// ScoreEntry is a single project's enriched scorecard data written to
// openssf-scores.json.  The map is keyed by project slug.
type ScoreEntry struct {
	Repo      string                `json:"repo"`
	Score     float64               `json:"score"`
	Date      string                `json:"date"`
	Checks    []scorecard.CheckResult `json:"checks"`
	FetchedAt string                `json:"fetchedAt"`
}

// minimalProject contains only the fields we need from projects.json.
type minimalProject struct {
	Slug    string `json:"slug"`
	RepoURL string `json:"repoUrl"`
}

func main() {
	dryRun := flag.Bool("dry-run", false, "print results to stdout instead of writing files")
	bestEffort := flag.Bool("best-effort", false, "continue on per-project errors instead of exiting non-zero")
	dataDir := flag.String("data-dir", defaultDataDir(), "directory containing projects.json and where output is written")
	flag.Parse()

	if err := run(*dryRun, *bestEffort, *dataDir); err != nil {
		log.Fatalf("enrich: %v", err)
	}
}

func defaultDataDir() string {
	// Default path when invoked as: cd go && go run ./cmd/enrich/...
	return "../src/data/projects"
}

func run(dryRun, bestEffort bool, dataDir string) error {
	// ------------------------------------------------------------------ load
	projectsPath := filepath.Join(dataDir, "projects.json")
	projectsData, err := os.ReadFile(projectsPath)
	if err != nil {
		return fmt.Errorf("reading %s: %w", projectsPath, err)
	}

	var projects []minimalProject
	if err := json.Unmarshal(projectsData, &projects); err != nil {
		return fmt.Errorf("parsing projects.json: %w", err)
	}

	// ---------------------------------------------------------- load ETag cache
	etagsPath := filepath.Join(dataDir, "openssf-etags.json")
	etags := loadETagCache(etagsPath)

	// ---------------------------------------------------------- load existing scores
	scoresPath := filepath.Join(dataDir, "openssf-scores.json")
	scores := loadScores(scoresPath)

	// ------------------------------------------------------------------ enrich
	client := scorecard.NewClient()
	fetchedAt := time.Now().UTC().Format(time.RFC3339)
	var fetchErrors []string

	for _, p := range projects {
		owner, repo, ok := parseGitHubRepo(p.RepoURL)
		if !ok {
			continue // skip non-GitHub projects
		}

		prevETag := etags[p.Slug]
		result, newETag, err := client.FetchScore(owner, repo, prevETag)
		if err != nil {
			msg := fmt.Sprintf("%s (%s/%s): %v", p.Slug, owner, repo, err)
			if bestEffort {
				log.Printf("warning: %s", msg)
				fetchErrors = append(fetchErrors, msg)
				continue
			}
			return fmt.Errorf("fetching scorecard for %s: %w", p.Slug, err)
		}

		if result == nil {
			// 304 Not Modified — keep existing entry unchanged.
			fmt.Printf("  %-30s unchanged (ETag matched)\n", p.Slug)
			continue
		}

		entry := ScoreEntry{
			Repo:      result.Repo,
			Score:     result.Score,
			Date:      result.Date,
			Checks:    result.Checks,
			FetchedAt: fetchedAt,
		}
		scores[p.Slug] = entry
		etags[p.Slug] = newETag
		fmt.Printf("  %-30s score=%.1f  date=%s\n", p.Slug, result.Score, result.Date)
	}

	// ------------------------------------------------------------------ output
	scoresJSON, err := json.MarshalIndent(scores, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling scores: %w", err)
	}

	if dryRun {
		fmt.Println("\n--- openssf-scores.json (dry run) ---")
		fmt.Println(string(scoresJSON))
		if len(fetchErrors) > 0 {
			fmt.Printf("\n%d fetch error(s):\n", len(fetchErrors))
			for _, e := range fetchErrors {
				fmt.Println(" ", e)
			}
		}
		return nil
	}

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("creating data dir: %w", err)
	}
	if err := os.WriteFile(scoresPath, scoresJSON, 0644); err != nil {
		return fmt.Errorf("writing openssf-scores.json: %w", err)
	}
	fmt.Printf("Wrote %s (%d entries)\n", scoresPath, len(scores))

	etagsJSON, err := json.MarshalIndent(etags, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling etags: %w", err)
	}
	if err := os.WriteFile(etagsPath, etagsJSON, 0644); err != nil {
		return fmt.Errorf("writing openssf-etags.json: %w", err)
	}

	if len(fetchErrors) > 0 {
		fmt.Printf("%d project(s) had fetch errors (--best-effort, continuing)\n", len(fetchErrors))
	}
	return nil
}

// parseGitHubRepo extracts owner and repo from a github.com URL.
// Returns ok=false for non-GitHub or unparseable URLs.
func parseGitHubRepo(repoURL string) (owner, repo string, ok bool) {
	if repoURL == "" {
		return "", "", false
	}
	// Accept: https://github.com/owner/repo[/...]
	if !strings.Contains(repoURL, "github.com/") {
		return "", "", false
	}
	idx := strings.Index(repoURL, "github.com/")
	rest := repoURL[idx+len("github.com/"):]
	// Trim trailing slash or subpaths.
	parts := strings.SplitN(rest, "/", 3)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

// loadETagCache reads persisted ETags from disk; returns empty map on any error.
func loadETagCache(path string) map[string]string {
	m := make(map[string]string)
	data, err := os.ReadFile(path)
	if err != nil {
		return m
	}
	_ = json.Unmarshal(data, &m)
	return m
}

// loadScores reads existing openssf-scores.json; returns empty map on any error.
func loadScores(path string) map[string]ScoreEntry {
	m := make(map[string]ScoreEntry)
	data, err := os.ReadFile(path)
	if err != nil {
		return m
	}
	_ = json.Unmarshal(data, &m)
	return m
}
