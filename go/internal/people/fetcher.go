package people

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	githubapi "github.com/google/go-github/v68/github"
	"golang.org/x/oauth2"
)

const (
	cncfOwner         = "cncf"
	cncfRepo          = "people"
	peopleFile        = "people.json"
	fullJSONURL       = "https://landscape.cncf.io/data/full.json"
	landscapeLogoBase = "https://landscape.cncf.io/"
	foundationOwner   = "cncf"
	foundationRepo    = "foundation"
	maintainersFile   = "project-maintainers.csv"
	maintainersRawURL = "https://raw.githubusercontent.com/cncf/foundation/main/project-maintainers.csv"
)

// FetcherClient wraps the GitHub REST API client for data fetching.
type FetcherClient struct {
	gh *githubapi.Client
}

// NewFetcherClient creates a FetcherClient. token may be empty for unauthenticated requests.
func NewFetcherClient(ctx context.Context, token string) *FetcherClient {
	var hc *http.Client
	if token != "" {
		ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
		hc = oauth2.NewClient(ctx, ts)
	}
	return &FetcherClient{gh: githubapi.NewClient(hc)}
}

// LatestSHA returns the latest commit SHA for the people.json file in cncf/people.
func (c *FetcherClient) LatestSHA(ctx context.Context) (string, error) {
	commits, _, err := c.gh.Repositories.ListCommits(ctx, cncfOwner, cncfRepo, &githubapi.CommitsListOptions{
		Path:        peopleFile,
		ListOptions: githubapi.ListOptions{PerPage: 1},
	})
	if err != nil {
		return "", fmt.Errorf("list commits: %w", err)
	}
	if len(commits) == 0 {
		return "", fmt.Errorf("no commits found for %s", peopleFile)
	}
	return commits[0].GetSHA(), nil
}

type fullJSONItem struct {
	Name string `json:"name"`
	Logo string `json:"logo"`
}

type fullJSONData struct {
	Items []fullJSONItem `json:"items"`
}

func parseLandscapeFullJSON(body []byte) (map[string]string, error) {
	var data fullJSONData
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("parse full.json: %w", err)
	}
	logos := make(map[string]string)
	for _, item := range data.Items {
		if item.Name == "" || item.Logo == "" {
			continue
		}
		url := landscapeLogoBase + item.Logo
		logos[item.Name] = url
		logos[strings.ToLower(item.Name)] = url
	}
	return logos, nil
}

// FetchLandscapeLogos downloads the CNCF landscape full.json and returns a name→logo map.
func (c *FetcherClient) FetchLandscapeLogos(ctx context.Context, prevETag string) (map[string]string, string, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullJSONURL, nil)
	if err != nil {
		return nil, "", false, fmt.Errorf("build request: %w", err)
	}
	if prevETag != "" {
		req.Header.Set("If-None-Match", prevETag)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", false, fmt.Errorf("fetch full.json: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return nil, prevETag, false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, "", false, fmt.Errorf("fetch full.json: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", false, fmt.Errorf("read full.json: %w", err)
	}

	logos, err := parseLandscapeFullJSON(body)
	if err != nil {
		return nil, "", false, err
	}
	return logos, resp.Header.Get("ETag"), true, nil
}

// FetchPeople downloads people.json at the given commit SHA.
func (c *FetcherClient) FetchPeople(ctx context.Context, sha string) ([]RawPerson, error) {
	opts := &githubapi.RepositoryContentGetOptions{Ref: sha}
	file, _, _, err := c.gh.Repositories.GetContents(ctx, cncfOwner, cncfRepo, peopleFile, opts)
	if err != nil {
		return nil, fmt.Errorf("get contents: %w", err)
	}

	downloadURL := file.GetDownloadURL()
	if downloadURL == "" {
		return nil, fmt.Errorf("no download URL for %s", peopleFile)
	}

	resp, err := http.Get(downloadURL) //nolint:noctx
	if err != nil {
		return nil, fmt.Errorf("download people.json: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var people []RawPerson
	if err := json.Unmarshal(body, &people); err != nil {
		return nil, fmt.Errorf("parse people.json: %w", err)
	}
	return people, nil
}

// LatestFoundationSHA returns the latest commit SHA touching project-maintainers.csv.
func (c *FetcherClient) LatestFoundationSHA(ctx context.Context) (string, error) {
	commits, _, err := c.gh.Repositories.ListCommits(ctx, foundationOwner, foundationRepo, &githubapi.CommitsListOptions{
		Path:        maintainersFile,
		ListOptions: githubapi.ListOptions{PerPage: 1},
	})
	if err != nil {
		return "", fmt.Errorf("list foundation commits: %w", err)
	}
	if len(commits) == 0 {
		return "", fmt.Errorf("no commits found for %s", maintainersFile)
	}
	return commits[0].GetSHA(), nil
}

// FetchMaintainersCSV downloads project-maintainers.csv with conditional GET.
func (c *FetcherClient) FetchMaintainersCSV(ctx context.Context, cachedETag string, logos map[string]string) ([]SafeMaintainer, string, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, maintainersRawURL, nil)
	if err != nil {
		return nil, "", false, fmt.Errorf("build request: %w", err)
	}
	if cachedETag != "" {
		req.Header.Set("If-None-Match", cachedETag)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, "", false, fmt.Errorf("download maintainers CSV: %w", err)
	}
	defer resp.Body.Close()

	newETag := resp.Header.Get("ETag")

	if resp.StatusCode == http.StatusNotModified {
		return nil, newETag, true, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, "", false, fmt.Errorf("download maintainers CSV: HTTP %d", resp.StatusCode)
	}

	maintainers, err := parseMaintainersCSV(resp.Body, logos)
	if err != nil {
		return nil, newETag, false, err
	}
	return maintainers, newETag, false, nil
}

// parseMaintainersCSV parses the sparse project-maintainers.csv format.
func parseMaintainersCSV(r io.Reader, logos map[string]string) ([]SafeMaintainer, error) {
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1

	if _, err := reader.Read(); err != nil {
		return nil, fmt.Errorf("read CSV header: %w", err)
	}

	logoLower := make(map[string]string, len(logos))
	for k, v := range logos {
		logoLower[strings.ToLower(k)] = v
	}
	resolveLogoURL := func(project string) string {
		key := strings.ToLower(project)
		if v, ok := logoLower[key]; ok {
			return v
		}
		if idx := strings.Index(key, ":"); idx > 0 {
			if v, ok := logoLower[strings.TrimSpace(key[:idx])]; ok {
				return v
			}
		}
		if idx := strings.Index(key, "("); idx > 0 {
			if v, ok := logoLower[strings.TrimSpace(key[:idx])]; ok {
				return v
			}
		}
		parts := strings.Fields(key)
		for n := len(parts) - 1; n > 0; n-- {
			if v, ok := logoLower[strings.Join(parts[:n], " ")]; ok {
				return v
			}
		}
		return ""
	}

	type maintainerEntry struct {
		name           string
		company        string
		projects       []string
		projectDetails []ProjectDetail
		maturity       string
		ownersURL      string
		logoURL        string
	}

	byHandle := make(map[string]*maintainerEntry)
	order := make([]string, 0, 2200)

	var curMaturity, curProject string

	rows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read CSV rows: %w", err)
	}

	for _, row := range rows {
		if len(row) < 5 {
			continue
		}
		if m := strings.TrimSpace(row[0]); m != "" {
			curMaturity = m
		}
		if p := strings.TrimSpace(row[1]); p != "" {
			curProject = titleCase(p)
		}

		name := strings.TrimSpace(row[2])
		company := strings.TrimSpace(row[3])
		handle := strings.ToLower(strings.TrimSpace(row[4]))
		ownersURL := ""
		if len(row) >= 6 {
			ownersURL = strings.TrimSpace(row[5])
		}

		if handle == "" || name == "" {
			continue
		}

		if _, seen := byHandle[handle]; !seen {
			byHandle[handle] = &maintainerEntry{
				name:      name,
				company:   company,
				ownersURL: ownersURL,
				logoURL:   resolveLogoURL(curProject),
			}
			order = append(order, handle)
		}

		e := byHandle[handle]
		e.projects = append(e.projects, curProject)
		e.projectDetails = append(e.projectDetails, ProjectDetail{Name: curProject, Maturity: strings.TrimSpace(curMaturity)})
		e.maturity = HigherMaturity(e.maturity, curMaturity)
		if e.company == "" && company != "" {
			e.company = company
		}
		if HigherMaturity(curMaturity, e.maturity) == curMaturity {
			if logo := resolveLogoURL(curProject); logo != "" {
				e.logoURL = logo
			}
			if ownersURL != "" {
				e.ownersURL = ownersURL
			}
		}
	}

	result := make([]SafeMaintainer, 0, len(order))
	for _, handle := range order {
		e := byHandle[handle]
		avatarURL := ""
		if handle != "" {
			avatarURL = "https://avatars.githubusercontent.com/" + handle
		}
		result = append(result, SafeMaintainer{
			Name:           e.name,
			Handle:         handle,
			Company:        e.company,
			Projects:       e.projects,
			ProjectDetails: e.projectDetails,
			Maturity:       strings.TrimSpace(e.maturity),
			AvatarURL:      avatarURL,
			OwnersURL:      e.ownersURL,
			LogoURL:        e.logoURL,
		})
	}
	return result, nil
}

func titleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) == 0 {
			continue
		}
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}
