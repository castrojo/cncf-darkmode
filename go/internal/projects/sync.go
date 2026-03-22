package projects

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

const (
	defaultDataDir  = "../sites/projects/src/data"
	defaultCacheDir = "../.sync-cache/projects"
)

// Sync runs the full projects sync pipeline.
// DataDir and CacheDir default to paths relative to `cd go && go run ./cmd/sync-projects/`.
func Sync() error {
	dataDir := env("PROJECTS_DATA_DIR", defaultDataDir)
	cacheDir := env("PROJECTS_CACHE_DIR", defaultCacheDir)

	s := LoadSyncState(cacheDir)

	fmt.Println("Fetching landscape.cncf.io/data/full.json...")
	result, err := FetchProjects(s.ETag)
	if err != nil {
		return fmt.Errorf("fetch projects: %w", err)
	}

	// Determine project list for LWCN matching — fresh or cached.
	var projects []SafeProject
	if result.Modified {
		projects = result.Projects
	} else {
		fmt.Println("No changes (ETag matched). Loading previous data...")
		prevData, err := LoadPreviousProjects(cacheDir)
		if err != nil {
			return fmt.Errorf("no previous data and no changes: %w", err)
		}
		if err := json.Unmarshal(prevData, &projects); err != nil {
			return fmt.Errorf("invalid previous data: %w", err)
		}
		fmt.Printf("Loaded %d projects from cache\n", len(projects))
	}

	// Always fetch LWCN — it runs on its own ETag cadence.
	fmt.Println("Fetching LWCN newsletter feed...")
	lwcnEvents, lwcnErr := FetchLWCN(cacheDir, projects)
	if lwcnErr != nil {
		log.Printf("LWCN fetch warning (non-fatal): %v", lwcnErr)
	} else if len(lwcnEvents) > 0 {
		fmt.Printf("Fetched %d LWCN newsletter events\n", len(lwcnEvents))
		if err := WriteChangelog(dataDir, lwcnEvents); err != nil {
			log.Printf("LWCN changelog write warning (non-fatal): %v", err)
		}
	} else {
		fmt.Println("LWCN feed unchanged or no new events")
	}

	if !result.Modified {
		return nil
	}

	fmt.Printf("Fetched %d CNCF projects\n", len(result.Projects))

	forksCachePath := cacheDir + "/github_extras.json"
	forksCache, _ := LoadForksCache(forksCachePath)
	token := os.Getenv("GITHUB_TOKEN")
	apiCalls := EnrichForks(result.Projects, forksCache, token)
	if apiCalls > 0 {
		fmt.Printf("Enriched forks for %d projects via GitHub API\n", apiCalls)
		_ = SaveForksCache(forksCachePath, forksCache)
	}

	prevData, _ := LoadPreviousProjects(cacheDir)
	events, updatedAt := Diff(prevData, result.Projects)
	fmt.Printf("Detected %d changelog events\n", len(events))

	if err := WriteChangelog(dataDir, events); err != nil {
		return fmt.Errorf("writing changelog: %w", err)
	}

	if err := WriteProjects(dataDir, result.Projects, updatedAt); err != nil {
		return fmt.Errorf("writing projects: %w", err)
	}

	data, _ := json.MarshalIndent(result.Projects, "", "  ")
	if err := SavePreviousProjects(cacheDir, data); err != nil {
		return fmt.Errorf("saving previous: %w", err)
	}
	if err := SaveSyncState(cacheDir, State{ETag: result.ETag}); err != nil {
		return fmt.Errorf("saving state: %w", err)
	}

	graduated, incubating, sandbox, archived := 0, 0, 0, 0
	for _, p := range result.Projects {
		switch p.Maturity {
		case "graduated":
			graduated++
		case "incubating":
			incubating++
		case "sandbox":
			sandbox++
		case "archived":
			archived++
		}
	}
	fmt.Printf("Breakdown: %d graduated, %d incubating, %d sandbox, %d archived\n",
		graduated, incubating, sandbox, archived)

	return nil
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
