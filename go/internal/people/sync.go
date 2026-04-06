package people

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/semaphore"
)

const (
	defaultPeopleDataDir  = "../src/data/people"
	defaultPeopleCacheDir = "../.sync-cache/people"
)

// Sync runs the full people sync pipeline.
func Sync() error {
	ctx := context.Background()
	token := os.Getenv("GITHUB_TOKEN")
	dataDir := envOrPeople("PEOPLE_DATA_DIR", defaultPeopleDataDir)
	cacheDir := envOrPeople("PEOPLE_CACHE_DIR", defaultPeopleCacheDir)

	// ── State ──────────────────────────────────────────────────────────────
	stateMgr, err := NewStateManager(cacheDir)
	if err != nil {
		return fmt.Errorf("state manager: %w", err)
	}
	cached, err := stateMgr.LoadState()
	if err != nil {
		return fmt.Errorf("load state: %w", err)
	}

	fc := NewFetcherClient(ctx, token)

	// ── Init API cache + client ────────────────────────────────────────────
	var apiCache *APICache
	var ghClient *GitHubClient
	if token != "" {
		apiCache, err = LoadAPICache(cacheDir)
		if err != nil {
			log.Printf("warn: load api cache: %v", err)
		}
		ghClient = NewGitHubClient(ctx, token)
	}

	// ── Check people upstream ──────────────────────────────────────────────
	latestPeopleSHA, err := fc.LatestSHA(ctx)
	if err != nil {
		return fmt.Errorf("latest people SHA: %w", err)
	}

	latestFoundationSHA, err := fc.LatestFoundationSHA(ctx)
	if err != nil {
		log.Printf("warn: latest foundation SHA: %v — skipping maintainers sync", err)
		latestFoundationSHA = cached.FoundationSHA
	}

	syncPeople := latestPeopleSHA != cached.LastSHA
	syncFoundation := latestFoundationSHA != cached.FoundationSHA

	// ── Sync landscape logos (via ETag on full.json) ───────────────────────
	logos, newLogoETag, logoModified, err := fc.FetchLandscapeLogos(ctx, cached.LandscapeETag)
	if err != nil {
		log.Printf("warn: fetch landscape logos: %v — keeping existing landscape_logos.json", err)
	} else if logoModified {
		if err := WriteLandscapeLogos(dataDir, logos); err != nil {
			return fmt.Errorf("write landscape_logos.json: %w", err)
		}
		log.Printf("wrote landscape_logos.json (%d entries)", len(logos))
		cached.LandscapeETag = newLogoETag
	} else {
		log.Printf("landscape logos unchanged (ETag match) — skipping logo sync")
	}

	// ── Sync maintainers ───────────────────────────────────────────────────
	if syncFoundation {
		log.Printf("cncf/foundation updated — syncing maintainers")

		logoMap := map[string]string{}
		if logoData, err := os.ReadFile(fmt.Sprintf("%s/landscape_logos.json", dataDir)); err == nil {
			_ = json.Unmarshal(logoData, &logoMap)
		}

		maintainers, newETag, notModified, err := fc.FetchMaintainersCSV(ctx, cached.FoundationETag, logoMap)
		if err != nil {
			log.Printf("warn: fetch maintainers CSV: %v — keeping existing maintainers.json", err)
		} else if notModified {
			log.Printf("maintainers CSV unchanged (ETag match) — skipping write")
			cached.FoundationSHA = latestFoundationSHA
		} else {
			existingMaintainers, _ := LoadMaintainers(dataDir)
			existingByHandle := make(map[string]SafeMaintainer, len(existingMaintainers))
			for _, m := range existingMaintainers {
				existingByHandle[m.Handle] = m
			}

			now := time.Now().UTC()
			for i, m := range maintainers {
				if existing, ok := existingByHandle[m.Handle]; ok {
					if maintainerDataChanged(existing, m) {
						maintainers[i].UpdatedAt = now
						if apiCache != nil {
							apiCache.Invalidate(m.Handle)
						}
					} else {
						maintainers[i].UpdatedAt = existing.UpdatedAt
						maintainers[i].YearsContributing = existing.YearsContributing
						maintainers[i].Location = existing.Location
						maintainers[i].Bio = existing.Bio
						maintainers[i].CountryFlag = existing.CountryFlag
					}
				} else {
					maintainers[i].UpdatedAt = now
				}
			}

			if err := WriteMaintainers(dataDir, maintainers); err != nil {
				return fmt.Errorf("write maintainers.json: %w", err)
			}
			log.Printf("wrote maintainers.json (%d maintainers)", len(maintainers))
			cached.FoundationSHA = latestFoundationSHA
			cached.FoundationETag = newETag
		}
	} else {
		log.Printf("cncf/foundation unchanged — skipping maintainers CSV sync")
	}

	// ── Sync people ────────────────────────────────────────────────────────
	var events []Event
	var currentMap map[string]RawPerson

	if syncPeople {
		log.Printf("cncf/people updated — syncing")

		people, err := fc.FetchPeople(ctx, latestPeopleSHA)
		if err != nil {
			return fmt.Errorf("fetch people: %w", err)
		}
		log.Printf("fetched %d people", len(people))

		currentMap = RawPeopleMap(people)

		previous, err := stateMgr.LoadPrevious()
		if err != nil {
			return fmt.Errorf("load previous: %w", err)
		}

		now := time.Now().UTC()
		events = Compute(previous, currentMap, now)
		log.Printf("delta: %d events", len(events))

		if err := WriteChangelog(dataDir, events); err != nil {
			return fmt.Errorf("write changelog: %w", err)
		}
		if err := WriteChangelogPages(dataDir, events); err != nil {
			log.Printf("warn: write changelog pages: %v", err)
		}
		if err := BackfillPersonFields(dataDir); err != nil {
			log.Printf("warn: backfill person fields: %v", err)
		}
		if err := WriteRSS(dataDir, events); err != nil {
			log.Printf("warn: write RSS: %v", err)
		}
		if err := WriteStats(dataDir); err != nil {
			log.Printf("warn: write stats.json: %v", err)
		}
		if err := WritePeopleIndex(dataDir, events); err != nil {
			log.Printf("warn: write people index: %v", err)
		}
		if err := WriteLeadershipRoles(dataDir, people); err != nil {
			log.Printf("warn: write leadership-roles.json: %v", err)
		}
		if err := WriteStaffSupport(dataDir, people); err != nil {
			log.Printf("WriteStaffSupport: %v", err)
		}

		activeHandles := make(map[string]bool, len(currentMap))
		for _, p := range currentMap {
			if h := p.GitHubHandle(); h != "" {
				activeHandles[h] = true
			}
		}
		if err := WriteEmeritusFromEvents(dataDir, events, activeHandles); err != nil {
			log.Printf("warn: write emeritus: %v", err)
		}

		leadershipHandles := loadLeadershipHandles(dataDir)
		heroMaintainers, _ := LoadMaintainers(dataDir)
		heroEvents := events
		if fullRaw, err2 := os.ReadFile(dataDir + "/changelog.json"); err2 == nil {
			var fullEvents []Event
			if err2 := json.Unmarshal(fullRaw, &fullEvents); err2 == nil {
				heroEvents = fullEvents
			}
		}
		if err := WriteHeroRotations(dataDir, heroEvents, heroMaintainers, leadershipHandles); err != nil {
			log.Printf("warn: write hero rotations: %v", err)
		}

		if err := stateMgr.SavePrevious(currentMap); err != nil {
			return fmt.Errorf("save previous: %w", err)
		}
		if err := stateMgr.SaveState(PeopleState{
			LastSHA:        latestPeopleSHA,
			LandscapeETag:  cached.LandscapeETag,
			FoundationSHA:  cached.FoundationSHA,
			FoundationETag: cached.FoundationETag,
			UpdatedAt:      now,
		}); err != nil {
			return fmt.Errorf("save state: %w", err)
		}
		log.Printf("done — people SHA %s", shortSHA(latestPeopleSHA))
	} else {
		log.Printf("cncf/people unchanged — skipping people sync")
		now := time.Now().UTC()
		if err := stateMgr.SaveState(PeopleState{
			LastSHA:        cached.LastSHA,
			LandscapeETag:  cached.LandscapeETag,
			FoundationSHA:  cached.FoundationSHA,
			FoundationETag: cached.FoundationETag,
			UpdatedAt:      now,
		}); err != nil {
			return fmt.Errorf("save state: %w", err)
		}
		if err := BackfillPersonFields(dataDir); err != nil {
			log.Printf("warn: backfill person fields: %v", err)
		}
		if err := WriteStats(dataDir); err != nil {
			log.Printf("warn: write stats.json: %v", err)
		}
		if existingRaw, err2 := os.ReadFile(dataDir + "/changelog.json"); err2 == nil {
			var existingEvents []Event
			if err2 := json.Unmarshal(existingRaw, &existingEvents); err2 == nil {
				if err := WriteChangelogPages(dataDir, existingEvents); err != nil {
					log.Printf("warn: write changelog pages: %v", err)
				}
				if err := WritePeopleIndex(dataDir, existingEvents); err != nil {
					log.Printf("warn: write people index: %v", err)
				}
				leadershipHandles := loadLeadershipHandles(dataDir)
				heroMaintainers, _ := LoadMaintainers(dataDir)
				if err := WriteHeroRotations(dataDir, existingEvents, heroMaintainers, leadershipHandles); err != nil {
					log.Printf("warn: write hero rotations: %v", err)
				}
			}
		}
	}

	if err := ensureChangelog(dataDir); err != nil {
		return fmt.Errorf("ensure changelog: %w", err)
	}

	// ── Maintainer profile backfill ────────────────────────────────────────
	if apiCache != nil {
		maintainers, err := LoadMaintainers(dataDir)
		if err == nil && len(maintainers) > 0 {
			const cap = 200
			enriched, cncfYearsEnriched, changed := 0, 0, false

			type maintainerTarget struct {
				idx    int
				handle string
			}
			var profileTargets []maintainerTarget
			for i, m := range maintainers {
				if m.Handle == "" {
					continue
				}
				stats, ok := apiCache.Get(m.Handle)
				if ok && stats.AvatarURL != "" {
					if maintainers[i].Location != stats.Location || maintainers[i].Bio != stats.Bio {
						maintainers[i].Location = stats.Location
						maintainers[i].Bio = stats.Bio
						maintainers[i].CountryFlag = CountryFlag(stats.Location)
						changed = true
					}
					if stats.YearsContributing > 0 && maintainers[i].YearsContributing != stats.YearsContributing {
						maintainers[i].YearsContributing = stats.YearsContributing
						changed = true
					}
				} else if enriched < cap {
					profileTargets = append(profileTargets, maintainerTarget{i, m.Handle})
					enriched++
				}
			}

			var muM sync.Mutex
			semM := semaphore.NewWeighted(5)
			gM, gMctx := errgroup.WithContext(ctx)
			for _, t := range profileTargets {
				t := t
				gM.Go(func() error {
					if err := semM.Acquire(gMctx, 1); err != nil {
						return nil
					}
					defer semM.Release(1)
					time.Sleep(100 * time.Millisecond)
					stats := ghClient.EnrichProfile(gMctx, t.handle, apiCache)
					if stats.AvatarURL != "" {
						muM.Lock()
						maintainers[t.idx].Location = stats.Location
						maintainers[t.idx].Bio = stats.Bio
						maintainers[t.idx].CountryFlag = CountryFlag(stats.Location)
						changed = true
						muM.Unlock()
					}
					return nil
				})
			}
			if err := gM.Wait(); err != nil {
				log.Printf("warn: enrich maintainer workers: %v", err)
			}

			for _, t := range profileTargets {
				if cncfYearsEnriched >= 10 {
					break
				}
				if s, ok := apiCache.Get(t.handle); !ok || s.YearsContributing == 0 {
					ghClient.EnrichCNCFYears(ctx, t.handle, apiCache)
					cncfYearsEnriched++
				}
				if s, ok := apiCache.Get(t.handle); ok && s.YearsContributing > 0 && maintainers[t.idx].YearsContributing != s.YearsContributing {
					maintainers[t.idx].YearsContributing = s.YearsContributing
					changed = true
				}
			}
			if changed {
				if err := WriteMaintainers(dataDir, maintainers); err != nil {
					log.Printf("warn: write maintainers: %v", err)
				}
			}
			if enriched > 0 {
				log.Printf("maintainer backfill: enriched %d profiles (cap %d)", enriched, cap)
			}
			if err := apiCache.Save(); err != nil {
				log.Printf("warn: save api cache: %v", err)
			}
		}
	}

	// ── People enrichment ──────────────────────────────────────────────────
	if apiCache != nil && len(events) > 0 {
		const enrichCap = 200
		type enrichTarget struct {
			idx    int
			handle string
			etype  EventType
		}
		var targets []enrichTarget
		for i, e := range events {
			if len(targets) >= enrichCap {
				break
			}
			if e.Person.Handle == "" {
				continue
			}
			if e.Type == EventAdded || e.Type == EventUpdated {
				targets = append(targets, enrichTarget{i, e.Person.Handle, e.Type})
			}
		}

		var mu sync.Mutex
		sem := semaphore.NewWeighted(5)
		g, gctx := errgroup.WithContext(ctx)
		for _, t := range targets {
			t := t
			if t.etype == EventUpdated {
				apiCache.Invalidate(t.handle)
			}
			g.Go(func() error {
				if err := sem.Acquire(gctx, 1); err != nil {
					return nil
				}
				defer sem.Release(1)
				time.Sleep(100 * time.Millisecond)
				stats := ghClient.Enrich(gctx, t.handle, apiCache)
				if stats.AvatarURL != "" {
					mu.Lock()
					events[t.idx].Person.AvatarURL = stats.AvatarURL
					events[t.idx].Person.Contributions = stats.Contributions
					events[t.idx].Person.PublicRepos = stats.PublicRepos
					if events[t.idx].Person.Pronouns == "" && stats.Pronouns != "" {
						events[t.idx].Person.Pronouns = stats.Pronouns
					}
					if events[t.idx].Person.Location == "" && stats.Location != "" {
						events[t.idx].Person.Location = stats.Location
						events[t.idx].Person.CountryFlag = CountryFlag(stats.Location)
					}
					mu.Unlock()
				}
				return nil
			})
		}
		if err := g.Wait(); err != nil {
			log.Printf("warn: enrich workers: %v", err)
		}
		log.Printf("enriched %d people (cap %d per run)", len(targets), enrichCap)

		for _, t := range targets {
			ghClient.EnrichCNCFYears(ctx, t.handle, apiCache)
			if s, ok := apiCache.Get(t.handle); ok {
				events[t.idx].Person.YearsContributing = s.YearsContributing
			}
		}

		if err := apiCache.Save(); err != nil {
			log.Printf("warn: save api cache: %v", err)
		}
	}

	if apiCache != nil {
		if backfilled, err := BackfillFromCache(dataDir, apiCache); err != nil {
			log.Printf("warn: backfill from cache: %v", err)
		} else if len(backfilled) > 0 {
			if err := WritePeopleIndex(dataDir, backfilled); err != nil {
				log.Printf("warn: re-write people-index after backfill: %v", err)
			}
		}
	}

	return nil
}

func shortSHA(sha string) string {
	if len(sha) >= 8 {
		return sha[:8]
	}
	return "(none)"
}

func ensureChangelog(outDir string) error {
	path := outDir + "/changelog.json"
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := os.MkdirAll(outDir, 0o755); err != nil {
			return err
		}
		return os.WriteFile(path, []byte("[]"), 0o644)
	}
	return nil
}

func maintainerDataChanged(a, b SafeMaintainer) bool {
	if a.Name != b.Name ||
		strings.TrimSpace(a.Company) != strings.TrimSpace(b.Company) ||
		strings.TrimSpace(a.Maturity) != strings.TrimSpace(b.Maturity) {
		return true
	}
	if len(a.Projects) != len(b.Projects) {
		return true
	}
	aSet := make(map[string]bool, len(a.Projects))
	for _, p := range a.Projects {
		aSet[p] = true
	}
	for _, p := range b.Projects {
		if !aSet[p] {
			return true
		}
	}
	return false
}

func loadLeadershipHandles(outDir string) []string {
	path := outDir + "/leadership.json"
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var cfg struct {
		Handles []string `json:"handles"`
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	return cfg.Handles
}

func envOrPeople(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
