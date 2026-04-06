package endusers

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

const (
	defaultDataDir  = "../src/data/members"
	defaultCacheDir = "../.sync-cache/endusers"
)

// Sync runs the full endusers sync pipeline.
func Sync() error {
	dataDir := envOr("ENDUSERS_DATA_DIR", defaultDataDir)
	cacheDir := envOr("ENDUSERS_CACHE_DIR", defaultCacheDir)

	s := LoadSyncState(cacheDir)
	fmt.Println("Fetching landscape.cncf.io/data/full.json...")
	result, err := FetchMembers(s.ETag)
	if err != nil {
		return fmt.Errorf("fetch members: %w", err)
	}

	// Always fetch architectures — independent of landscape ETag.
	fmt.Println("Fetching reference architectures from github.com/cncf/architecture...")
	architectures, err := FetchArchitectures(result.Dataset)
	if err != nil {
		log.Printf("warning: architecture fetch failed: %v", err)
	} else {
		if err := WriteArchitectures(dataDir, architectures); err != nil {
			return fmt.Errorf("writing architectures: %w", err)
		}
		fmt.Printf("Wrote %d reference architectures to %s/architectures.json\n", len(architectures), dataDir)
	}

	if !result.Modified {
		fmt.Println("No changes (ETag matched).")
		return nil
	}

	fmt.Printf("Fetched %d CNCF members\n", len(result.Members))

	prevData, _ := LoadPreviousMembers(cacheDir)
	events, updatedAt := Diff(prevData, result.Members)
	fmt.Printf("Detected %d changelog events\n", len(events))

	if err := WriteChangelog(dataDir, events); err != nil {
		return fmt.Errorf("writing changelog: %w", err)
	}
	if err := WriteMembers(dataDir, result.Members, updatedAt); err != nil {
		return fmt.Errorf("writing members: %w", err)
	}

	data, _ := json.MarshalIndent(result.Members, "", "  ")
	_ = SavePreviousMembers(cacheDir, data)
	_ = SaveSyncState(cacheDir, EndusersState{ETag: result.ETag})

	tiers := map[string]int{}
	for _, m := range result.Members {
		tiers[m.Tier]++
	}
	fmt.Printf("Total end users: %d  (Platinum:%d Gold:%d Silver:%d EndUser:%d Academic:%d Nonprofit:%d)\n",
		len(result.Members), tiers["Platinum"], tiers["Gold"], tiers["Silver"], tiers["End User"], tiers["Academic"], tiers["Nonprofit"])

	return nil
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
