package people

import (
"context"
"encoding/json"
"fmt"
"io"
"net/http"
"time"

"github.com/shurcooL/githubv4"
"golang.org/x/oauth2"
)

// cncfOrgs are the key CNCF-umbrella GitHub orgs we search for first contribution.
var cncfOrgs = []string{
"cncf", "kubernetes", "prometheus", "envoyproxy", "opentelemetry",
"containerd", "helm", "fluentd", "open-policy-agent", "jaegertracing",
}

// GitHubClient wraps the GitHub GraphQL API for user enrichment.
type GitHubClient struct {
gql        *githubv4.Client
httpClient *http.Client
token      string
}

// NewGitHubClient creates a GitHubClient authenticated with token.
func NewGitHubClient(ctx context.Context, token string) *GitHubClient {
var hc *http.Client
if token != "" {
ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
hc = oauth2.NewClient(ctx, ts)
} else {
hc = &http.Client{}
}
return &GitHubClient{gql: githubv4.NewClient(hc), httpClient: hc, token: token}
}

var userQuery struct {
User struct {
AvatarURL string
Bio       string
Location  string
Pronouns  string
Repositories struct {
TotalCount int
} `graphql:"repositories(privacy: PUBLIC)"`
ContributionsCollection struct {
ContributionCalendar struct {
TotalContributions int
}
} `graphql:"contributionsCollection"`
} `graphql:"user(login: $login)"`
}

// Enrich fetches GitHub stats for a user handle, using the API cache.
// Falls back to empty stats on error (non-fatal — enrichment is best-effort).
func (c *GitHubClient) Enrich(ctx context.Context, handle string, cache *APICache) UserStats {
if stats, ok := cache.Get(handle); ok {
return stats
}

vars := map[string]interface{}{
"login": githubv4.String(handle),
}

if err := c.gql.Query(ctx, &userQuery, vars); err != nil {
fmt.Printf("warn: enrich %s: %v\n", handle, err)
return UserStats{}
}

stats := UserStats{
AvatarURL:     userQuery.User.AvatarURL,
Location:      userQuery.User.Location,
Bio:           userQuery.User.Bio,
Pronouns:      userQuery.User.Pronouns,
Contributions: userQuery.User.ContributionsCollection.ContributionCalendar.TotalContributions,
PublicRepos:   userQuery.User.Repositories.TotalCount,
}
cache.Set(handle, stats)
return stats
}

// EnrichProfile is an alias for Enrich, used for maintainer profile enrichment.
func (c *GitHubClient) EnrichProfile(ctx context.Context, handle string, cache *APICache) UserStats {
return c.Enrich(ctx, handle, cache)
}

// EnrichCNCFYears searches for the user's earliest commit in CNCF orgs and
// sets YearsContributing on the cached stats.
func (c *GitHubClient) EnrichCNCFYears(ctx context.Context, handle string, cache *APICache) {
stats, ok := cache.Get(handle)
if ok && stats.YearsContributing > 0 {
return
}
if !ok {
stats = UserStats{}
}

// Rate limit: search API is 30 req/min
time.Sleep(2 * time.Second)

var firstYear int
for _, org := range cncfOrgs {
year := searchEarliestCommitYear(ctx, c.httpClient, c.token, handle, org)
if year > 0 && (firstYear == 0 || year < firstYear) {
firstYear = year
}
if firstYear > 0 {
break
}
}

if firstYear > 0 {
stats.YearsContributing = time.Now().Year() - firstYear + 1
cache.Set(handle, stats)
}
}

type searchCommitsResponse struct {
TotalCount int `json:"total_count"`
Items      []struct {
Commit struct {
Author struct {
Date string `json:"date"`
} `json:"author"`
} `json:"commit"`
} `json:"items"`
}

func searchEarliestCommitYear(ctx context.Context, hc *http.Client, token, handle, org string) int {
url := fmt.Sprintf(
"https://api.github.com/search/commits?q=author:%s+org:%s&sort=author-date&order=asc&per_page=1",
handle, org,
)
req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
if err != nil {
return 0
}
if token != "" {
req.Header.Set("Authorization", "Bearer "+token)
}
req.Header.Set("Accept", "application/vnd.github+json")
req.Header.Set("User-Agent", "castrojo/cncf-darkmode")

resp, err := hc.Do(req)
if err != nil || resp.StatusCode != http.StatusOK {
if resp != nil {
resp.Body.Close()
}
return 0
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)
if err != nil {
return 0
}

var result searchCommitsResponse
if err := json.Unmarshal(body, &result); err != nil || len(result.Items) == 0 {
return 0
}

dateStr := result.Items[0].Commit.Author.Date
if len(dateStr) < 4 {
return 0
}
var year int
fmt.Sscanf(dateStr[:4], "%d", &year)
return year
}
