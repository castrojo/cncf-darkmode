package projects

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

const fullJSONURL = "https://landscape.cncf.io/data/full.json"

// FetchResult contains the parsed data and the ETag for caching
type FetchResult struct {
	Projects []SafeProject
	ETag     string
	Modified bool
}

// FetchProjects fetches full.json, filters CNCF projects, and returns SafeProject slice.
func FetchProjects(prevETag string) (*FetchResult, error) {
	req, err := http.NewRequest("GET", fullJSONURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	if prevETag != "" {
		req.Header.Set("If-None-Match", prevETag)
	}
	req.Header.Set("User-Agent", "castrojo/cncf-darkmode")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching full.json: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return &FetchResult{ETag: prevETag, Modified: false}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d from landscape.cncf.io", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var dataset FullDataset
	if err := json.Unmarshal(body, &dataset); err != nil {
		return nil, fmt.Errorf("parsing full.json: %w", err)
	}

	p := filterAndConvert(dataset)
	return &FetchResult{
		Projects: p,
		ETag:     resp.Header.Get("ETag"),
		Modified: true,
	}, nil
}

func filterAndConvert(dataset FullDataset) []SafeProject {
	var projects []SafeProject
	for _, item := range dataset.Items {
		if item.Maturity == "" {
			continue
		}
		p := toSafeProject(item, dataset.GitHubData)
		projects = append(projects, p)
	}
	return projects
}

func toSafeProject(item FullItem, ghData map[string]GitHubItem) SafeProject {
	p := SafeProject{
		Name:           item.Name,
		Slug:           Slugify(item.Name),
		HomepageURL:    item.HomepageURL,
		LogoURL:        LogoFullURL(item.LogoURL),
		Maturity:       item.Maturity,
		Category:       item.Category,
		Subcategory:    item.Subcategory,
		TwitterURL:     item.TwitterURL,
		AcceptedDate:   item.AcceptedAt,
		IncubatingDate: item.IncubatingAt,
		GraduatedDate:  item.GraduatedAt,
		ArchivedDate:   item.ArchivedAt,
		DevStatsURL:    item.DevStatsURL,
		BlogURL:        item.BlogURL,
		SlackURL:       item.SlackURL,
		ArtworkURL:     item.ArtworkURL,
		LFXSlug:        item.LFXSlug,
		CloMonitorName: item.CloMonitorName,
	}

	if len(item.Repositories) > 0 {
		p.RepoURL = item.Repositories[0].URL
	}

	if item.Summary != nil {
		if item.Summary.UseCase != "" {
			p.Summary = item.Summary.UseCase
		} else if item.Summary.BusinessUseCase != "" {
			p.Summary = item.Summary.BusinessUseCase
		}
	}

	if len(item.Audits) > 0 {
		latest := item.Audits[len(item.Audits)-1]
		for _, a := range item.Audits {
			if a.Date > latest.Date {
				latest = a
			}
		}
		p.LastAuditDate = latest.Date
		p.LastAuditVendor = latest.Vendor
	}

	if p.RepoURL != "" && ghData != nil {
		if gh, ok := ghData[p.RepoURL]; ok {
			p.Stars = gh.Stars
			p.Forks = gh.Forks
			if gh.Description != "" {
				p.Description = gh.Description
			}
			p.License = gh.License
			p.Topics = gh.Topics
			p.PrimaryLanguage = PrimaryLanguage(gh.Languages)
			if gh.Contributors != nil {
				p.Contributors = gh.Contributors.Count
			}
			if gh.LatestCommit != nil {
				p.LastCommitDate = gh.LatestCommit.TS
			}
			if gh.LatestRelease != nil {
				p.LastReleaseDate = gh.LatestRelease.TS
			}
			if gh.FirstCommit != nil {
				p.FirstCommitDate = gh.FirstCommit.TS
			}
		}
	}

	if p.Description == "" && os.Getenv("PROJECTS_DEBUG") != "" {
		_ = fmt.Sprintf("no description for %s", item.Name)
	}

	return p
}
