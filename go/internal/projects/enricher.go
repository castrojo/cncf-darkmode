package projects

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const staleTTL = 90 * 24 * time.Hour

// GitHubExtra holds cached fork data for a single repo.
type GitHubExtra struct {
	Forks     int       `json:"forks"`
	FetchedAt time.Time `json:"fetched_at"`
}

type githubRepoResponse struct {
	ForksCount int `json:"forks_count"`
}

// LoadForksCache reads the extras cache from disk. Returns an empty map if the file
// does not exist.
func LoadForksCache(path string) (map[string]GitHubExtra, error) {
	cache := make(map[string]GitHubExtra)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return cache, nil
	}
	if err != nil {
		return cache, err
	}
	if err := json.Unmarshal(data, &cache); err != nil {
		return cache, err
	}
	return cache, nil
}

// SaveForksCache writes the extras cache to disk, creating parent directories as
// needed.
func SaveForksCache(path string, cache map[string]GitHubExtra) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cache, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// repoPath extracts "owner/repo" from a GitHub URL. Returns "" for non-GitHub
// URLs or malformed ones.
func repoPath(repoURL string) string {
	trimmed := strings.TrimPrefix(repoURL, "https://github.com/")
	if trimmed == repoURL {
		return ""
	}
	trimmed = strings.TrimSuffix(strings.TrimSuffix(trimmed, "/"), ".git")
	parts := strings.SplitN(trimmed, "/", 3)
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return ""
	}
	return parts[0] + "/" + parts[1]
}

// fetchForks calls the GitHub REST API for the given "owner/repo" path and
// returns the forks count.
func fetchForks(ownerRepo, token string) (int, error) {
	url := "https://api.github.com/repos/" + ownerRepo
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "castrojo/cncf-darkmode")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("GitHub API returned %d for %s", resp.StatusCode, ownerRepo)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var gr githubRepoResponse
	if err := json.Unmarshal(body, &gr); err != nil {
		return 0, err
	}
	return gr.ForksCount, nil
}

// EnrichForks fills in Forks on each project using the cache and (optionally)
// live GitHub API calls. Returns the number of API calls made.
func EnrichForks(projects []SafeProject, cache map[string]GitHubExtra, token string) int {
	now := time.Now()
	calls := 0
	const maxCalls = 50

	for i := range projects {
		p := &projects[i]

		if p.Forks > 0 {
			continue
		}

		repo := repoPath(p.RepoURL)
		if repo == "" {
			continue
		}

		extra, cached := cache[p.RepoURL]

		if cached && extra.Forks > 0 {
			p.Forks = extra.Forks
		}

		fresh := cached && now.Sub(extra.FetchedAt) < staleTTL
		if fresh {
			continue
		}

		if token == "" || calls >= maxCalls {
			continue
		}

		forks, err := fetchForks(repo, token)
		if err != nil {
			continue
		}

		p.Forks = forks
		cache[p.RepoURL] = GitHubExtra{Forks: forks, FetchedAt: now}
		calls++
	}

	return calls
}
