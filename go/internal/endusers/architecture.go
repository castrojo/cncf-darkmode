package endusers

import (
"bytes"
"encoding/json"
"fmt"
"io"
"net/http"
"regexp"
"strings"

"github.com/yuin/goldmark"
"github.com/yuin/goldmark/extension"
"github.com/yuin/goldmark/renderer/html"
"gopkg.in/yaml.v3"
)

var mdParser = goldmark.New(
goldmark.WithExtensions(extension.GFM),
goldmark.WithRendererOptions(html.WithHardWraps()),
)

const (
archListURL    = "https://api.github.com/repos/cncf/architecture/contents/content/en/architectures"
archRawBaseURL = "https://raw.githubusercontent.com/cncf/architecture/main/content/en/architectures"
archSiteBase   = "https://architecture.cncf.io/architectures"
)

type archFrontmatter struct {
Title           string   `yaml:"title"`
Date            string   `yaml:"date"`
OrgName         string   `yaml:"org_name"`
OrgTeam         string   `yaml:"org_team"`
OrgURL          string   `yaml:"org_url"`
OrgLogoFilename string   `yaml:"org_logo_filename"`
OrgDescription  string   `yaml:"org_description"`
OrgSize         string   `yaml:"org_size"`
UserSize        string   `yaml:"user_size"`
Industries      []string `yaml:"industries"`
Tags            []string `yaml:"tags"`
ReferenceArch   []string `yaml:"reference_architectures"`
}

type githubContentItem struct {
Name string `json:"name"`
Type string `json:"type"`
}

var (
cardHeaderRe      = regexp.MustCompile(`\{\{<\s*card\s+header="([^"]+)"`)
cardLogoRe        = regexp.MustCompile(`!\[[^\]]*\]\((https://raw\.githubusercontent\.com/cncf/artwork[^)]+)\)`)
usingSinceRe      = regexp.MustCompile(`\*\*Using since:\*\*\s*([^\n\r]+)`)
cardpaneRe        = regexp.MustCompile(`(?s)\{\{<\s*cardpane\s*>\}\}.*?\{\{<\s*/cardpane\s*>\}\}`)
relevantHeadingRe = regexp.MustCompile(`(?m)^##\s+Relevant CNCF projects\s*$\n?`)
relImgRe          = regexp.MustCompile(`!\[([^\]]*)\]\(\.?/?(images/[^)]+)\)`)
logoLineRe        = regexp.MustCompile(`(?m)^\s*\[!\[.*?\]\(.*?\)\]\(.*?\)\s*\n?`)
metaBulletRe      = regexp.MustCompile(`(?m)^\s*-\s*\*\*(Using since|Current version):\*\*[^\n]*\n?`)
)

// FetchArchitectures fetches all reference architectures from github.com/cncf/architecture.
func FetchArchitectures(dataset FullDataset) ([]SafeArchitecture, error) {
projectIndex := buildProjectIndex(dataset)
slugs, err := listArchSlugs()
if err != nil {
return nil, fmt.Errorf("listing architecture slugs: %w", err)
}
var architectures []SafeArchitecture
for _, slug := range slugs {
arch, err := fetchOneArch(slug, projectIndex)
if err != nil {
fmt.Printf("warning: skipping architecture %q: %v\n", slug, err)
continue
}
architectures = append(architectures, arch)
}
return architectures, nil
}

func listArchSlugs() ([]string, error) {
req, err := http.NewRequest("GET", archListURL, nil)
if err != nil {
return nil, err
}
req.Header.Set("User-Agent", "castrojo/cncf-darkmode")
req.Header.Set("Accept", "application/vnd.github+json")
resp, err := http.DefaultClient.Do(req)
if err != nil {
return nil, fmt.Errorf("GitHub API request: %w", err)
}
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
return nil, fmt.Errorf("GitHub API status %d", resp.StatusCode)
}
var items []githubContentItem
if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
return nil, fmt.Errorf("decoding GitHub API response: %w", err)
}
var slugs []string
for _, item := range items {
if item.Type == "dir" && item.Name != "" && !strings.HasPrefix(item.Name, "_") {
slugs = append(slugs, item.Name)
}
}
return slugs, nil
}

func fetchOneArch(slug string, projectIndex map[string]string) (SafeArchitecture, error) {
rawURL := fmt.Sprintf("%s/%s/index.md", archRawBaseURL, slug)
resp, err := http.Get(rawURL) //nolint:noctx
if err != nil {
return SafeArchitecture{}, fmt.Errorf("fetching index.md: %w", err)
}
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
return SafeArchitecture{}, fmt.Errorf("raw fetch status %d for %s", resp.StatusCode, rawURL)
}
body, err := io.ReadAll(resp.Body)
if err != nil {
return SafeArchitecture{}, fmt.Errorf("reading response body: %w", err)
}
fm, content, err := parseFrontmatter(string(body))
if err != nil {
return SafeArchitecture{}, fmt.Errorf("parsing frontmatter: %w", err)
}
orgLogoURL := ""
if fm.OrgLogoFilename != "" {
orgLogoURL = fmt.Sprintf("%s/%s/%s", archRawBaseURL, slug, fm.OrgLogoFilename)
}
projects := extractProjects(content, projectIndex)
stripped := cardpaneRe.ReplaceAllString(content, "")
stripped = relevantHeadingRe.ReplaceAllString(stripped, "")
stripped = rewriteImageURLs(stripped, slug)
bodyHTML, err := renderMarkdown(stripped)
if err != nil {
fmt.Printf("warning: markdown render failed for %s: %v\n", slug, err)
bodyHTML = ""
}
return SafeArchitecture{
Slug:           slug,
Title:          strings.TrimSpace(fm.Title),
OrgName:        strings.TrimSpace(fm.OrgName),
OrgTeam:        strings.TrimSpace(fm.OrgTeam),
OrgUrl:         strings.TrimSpace(fm.OrgURL),
OrgLogoUrl:     orgLogoURL,
OrgDescription: strings.TrimSpace(fm.OrgDescription),
OrgSize:        strings.TrimSpace(fm.OrgSize),
UserSize:       strings.TrimSpace(fm.UserSize),
Industries:     fm.Industries,
Tags:           fm.Tags,
RefArchTypes:   fm.ReferenceArch,
ArchUrl:        fmt.Sprintf("%s/%s/", archSiteBase, slug),
SubmittedAt:    strings.TrimSpace(fm.Date),
Projects:       projects,
BodyHTML:       bodyHTML,
}, nil
}

func parseFrontmatter(raw string) (archFrontmatter, string, error) {
if !strings.HasPrefix(strings.TrimLeft(raw, "\r\n"), "---") {
return archFrontmatter{}, raw, fmt.Errorf("no frontmatter opening delimiter")
}
raw = strings.TrimLeft(raw, "\r\n")
rest := raw[3:]
idx := strings.Index(rest, "\n---")
if idx < 0 {
return archFrontmatter{}, raw, fmt.Errorf("no frontmatter closing delimiter")
}
yamlBlock := rest[:idx]
body := rest[idx+4:]
var fm archFrontmatter
if err := yaml.Unmarshal([]byte(yamlBlock), &fm); err != nil {
return archFrontmatter{}, body, fmt.Errorf("yaml unmarshal: %w", err)
}
return fm, body, nil
}

func extractProjects(body string, index map[string]string) []ArchProject {
cardMatches := cardHeaderRe.FindAllStringIndex(body, -1)
if len(cardMatches) == 0 {
return nil
}
var projects []ArchProject
seen := make(map[string]bool)
for i, match := range cardMatches {
headerMatch := cardHeaderRe.FindStringSubmatch(body[match[0]:])
if len(headerMatch) < 2 {
continue
}
name := strings.TrimSpace(headerMatch[1])
key := strings.ToLower(name)
if seen[key] {
continue
}
seen[key] = true
cardEnd := len(body)
if i+1 < len(cardMatches) {
cardEnd = cardMatches[i+1][0]
}
cardBody := body[match[0]:cardEnd]
logoURL := ""
if m := cardLogoRe.FindStringSubmatch(cardBody); len(m) >= 2 {
logoURL = m[1]
}
usingSince := ""
if m := usingSinceRe.FindStringSubmatch(cardBody); len(m) >= 2 {
usingSince = strings.TrimSpace(m[1])
}
maturity := index[key]
description := extractDescription(cardBody)
projects = append(projects, ArchProject{
Name:        name,
LogoUrl:     logoURL,
Maturity:    maturity,
UsingSince:  usingSince,
Description: description,
})
}
return projects
}

func rewriteImageURLs(body, slug string) string {
base := fmt.Sprintf(
"https://raw.githubusercontent.com/cncf/architecture/main/content/en/architectures/%s",
slug,
)
return relImgRe.ReplaceAllStringFunc(body, func(match string) string {
m := relImgRe.FindStringSubmatch(match)
if len(m) < 3 {
return match
}
return fmt.Sprintf("![%s](%s/%s)", m[1], base, m[2])
})
}

func renderMarkdown(src string) (string, error) {
var buf bytes.Buffer
if err := mdParser.Convert([]byte(src), &buf); err != nil {
return "", fmt.Errorf("markdown render: %w", err)
}
return buf.String(), nil
}

func extractDescription(cardBody string) string {
s := logoLineRe.ReplaceAllString(cardBody, "")
s = metaBulletRe.ReplaceAllString(s, "")
var parts []string
for _, line := range strings.Split(s, "\n") {
if t := strings.TrimSpace(line); t != "" && !strings.HasPrefix(t, "{{") {
parts = append(parts, t)
}
}
return strings.Join(parts, " ")
}

func buildProjectIndex(dataset FullDataset) map[string]string {
index := make(map[string]string)
for _, item := range dataset.Items {
if item.Category == "CNCF Members" || item.Name == "" {
continue
}
maturity := strings.ToLower(item.Project)
if maturity == "" {
continue
}
index[strings.ToLower(item.Name)] = maturity
}
return index
}
