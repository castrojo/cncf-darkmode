package projects

import (
	"strings"
	"unicode"
)

// FullDataset is the top-level full.json structure
type FullDataset struct {
	Items          []FullItem             `json:"items"`
	GitHubData     map[string]GitHubItem  `json:"github_data"`
	CrunchbaseData map[string]interface{} `json:"crunchbase_data"`
}

// FullItem is a single landscape item
type FullItem struct {
	Name           string          `json:"name"`
	Category       string          `json:"category"`
	Subcategory    string          `json:"subcategory"`
	HomepageURL    string          `json:"homepage_url"`
	LogoURL        string          `json:"logo"`
	Maturity       string          `json:"maturity"`
	AcceptedAt     string          `json:"accepted_at"`
	IncubatingAt   string          `json:"incubating_at"`
	GraduatedAt    string          `json:"graduated_at"`
	ArchivedAt     string          `json:"archived_at"`
	TwitterURL     string          `json:"twitter_url"`
	DevStatsURL    string          `json:"devstats_url"`
	BlogURL        string          `json:"blog_url"`
	SlackURL       string          `json:"slack_url"`
	ArtworkURL     string          `json:"artwork_url"`
	LFXSlug        string          `json:"lfx_slug"`
	CloMonitorName string          `json:"clomonitor_name"`
	Repositories   []Repository    `json:"repositories"`
	Summary        *ProjectSummary `json:"summary"`
	Audits         []Audit         `json:"audits"`
}

type Repository struct {
	URL string `json:"url"`
}

type ProjectSummary struct {
	BusinessUseCase string `json:"business_use_case"`
	UseCase         string `json:"use_case"`
}

type Audit struct {
	Date   string `json:"date"`
	Type   string `json:"type"`
	URL    string `json:"url"`
	Vendor string `json:"vendor"`
}

// GitHubItem is the pre-enriched GitHub data from full.json github_data map
type GitHubItem struct {
	Stars         int             `json:"stars"`
	Forks         int             `json:"forks"`
	Description   string          `json:"description"`
	License       string          `json:"license"`
	Topics        []string        `json:"topics"`
	Languages     map[string]int  `json:"languages"`
	Contributors  *GitHubContribs `json:"contributors"`
	LatestCommit  *GitHubCommit   `json:"latest_commit"`
	LatestRelease *GitHubRelease  `json:"latest_release"`
	FirstCommit   *GitHubCommit   `json:"first_commit"`
}

type GitHubContribs struct {
	Count int `json:"count"`
}

type GitHubCommit struct {
	TS string `json:"ts"`
}

type GitHubRelease struct {
	TS string `json:"ts"`
}

// SafeProject is the output struct written to projects.json
type SafeProject struct {
	Name            string   `json:"name"`
	Slug            string   `json:"slug"`
	Description     string   `json:"description,omitempty"`
	HomepageURL     string   `json:"homepageUrl,omitempty"`
	RepoURL         string   `json:"repoUrl,omitempty"`
	LogoURL         string   `json:"logoUrl"`
	Maturity        string   `json:"maturity"`
	Category        string   `json:"category"`
	Subcategory     string   `json:"subcategory"`
	TwitterURL      string   `json:"twitterUrl,omitempty"`
	AcceptedDate    string   `json:"acceptedDate,omitempty"`
	IncubatingDate  string   `json:"incubatingDate,omitempty"`
	GraduatedDate   string   `json:"graduatedDate,omitempty"`
	ArchivedDate    string   `json:"archivedDate,omitempty"`
	DevStatsURL     string   `json:"devStatsUrl,omitempty"`
	BlogURL         string   `json:"blogUrl,omitempty"`
	SlackURL        string   `json:"slackUrl,omitempty"`
	ArtworkURL      string   `json:"artworkUrl,omitempty"`
	LFXSlug         string   `json:"lfxSlug,omitempty"`
	CloMonitorName  string   `json:"cloMonitorName,omitempty"`
	Summary         string   `json:"summary,omitempty"`
	Stars           int      `json:"stars,omitempty"`
	Forks           int      `json:"forks,omitempty"`
	Contributors    int      `json:"contributors,omitempty"`
	LastCommitDate  string   `json:"lastCommitDate,omitempty"`
	LastReleaseDate string   `json:"lastReleaseDate,omitempty"`
	FirstCommitDate string   `json:"firstCommitDate,omitempty"`
	License         string   `json:"license,omitempty"`
	PrimaryLanguage string   `json:"primaryLanguage,omitempty"`
	Topics          []string `json:"topics,omitempty"`
	LastAuditDate   string   `json:"lastAuditDate,omitempty"`
	LastAuditVendor string   `json:"lastAuditVendor,omitempty"`
	UpdatedAt       string   `json:"updatedAt"`
}

// MentionedProject is a CNCF project referenced in a newsletter event
type MentionedProject struct {
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	LogoURL  string `json:"logoUrl"`
	Maturity string `json:"maturity"`
}

// Event is a changelog entry
type Event struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // accepted|promoted|archived|updated|removed|newsletter
	ProjectName string `json:"projectName,omitempty"`
	ProjectSlug string `json:"projectSlug,omitempty"`
	LogoURL     string `json:"logoUrl"`
	Maturity    string `json:"maturity,omitempty"`
	OldMaturity string `json:"oldMaturity,omitempty"`
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
	// LWCN newsletter-specific fields
	LWCNIssueURL      string             `json:"lwcnIssueUrl,omitempty"`
	LWCNTitle         string             `json:"lwcnTitle,omitempty"`
	LWCNWelcome       string             `json:"lwcnWelcome,omitempty"`
	MentionedProjects []MentionedProject `json:"mentionedProjects,omitempty"`
}

// Slugify converts a project name to a URL-safe slug
func Slugify(name string) string {
	s := strings.ToLower(name)
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	result := b.String()
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	return strings.Trim(result, "-")
}

// PrimaryLanguage returns the language with the most bytes
func PrimaryLanguage(languages map[string]int) string {
	best := ""
	max := 0
	for lang, count := range languages {
		if count > max {
			max = count
			best = lang
		}
	}
	return best
}

// LogoFullURL converts a relative logo path to a full URL
func LogoFullURL(logo string) string {
	if logo == "" {
		return ""
	}
	if strings.HasPrefix(logo, "http") {
		return logo
	}
	return "https://landscape.cncf.io/" + logo
}

// LatestMilestoneDate returns the most recent milestone date for sorting
func LatestMilestoneDate(p SafeProject) string {
	dates := []string{p.ArchivedDate, p.GraduatedDate, p.IncubatingDate, p.AcceptedDate}
	for _, d := range dates {
		if d != "" {
			return d
		}
	}
	return p.UpdatedAt
}
