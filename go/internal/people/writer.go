package people

import (
"encoding/json"
"errors"
"fmt"
"log"
"math/rand"
"os"
"path/filepath"
"sort"
"strings"
"time"

"github.com/gorilla/feeds"
)

// WriteChangelog prepends newEvents to the existing changelog.json.
func WriteChangelog(outDir string, newEvents []Event) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
outPath := filepath.Join(outDir, "changelog.json")

var existing []Event
raw, err := os.ReadFile(outPath)
if err != nil && !errors.Is(err, os.ErrNotExist) {
return err
}
if raw != nil {
if err := json.Unmarshal(raw, &existing); err != nil {
existing = nil
}
}

combined := append(newEvents, existing...)

data, err := json.MarshalIndent(combined, "", "  ")
if err != nil {
return err
}
return os.WriteFile(outPath, data, 0o644)
}

// WriteLandscapeLogos writes a normalized project-name → logo-URL map.
func WriteLandscapeLogos(outDir string, logos map[string]string) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
data, err := json.MarshalIndent(logos, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "landscape_logos.json"), data, 0o644)
}

// PatchChangelog updates yearsContributing in existing changelog.json entries.
func PatchChangelog(outDir string, patches map[string]int) error {
outPath := filepath.Join(outDir, "changelog.json")
raw, err := os.ReadFile(outPath)
if err != nil {
return err
}
var events []Event
if err := json.Unmarshal(raw, &events); err != nil {
return err
}
changed := false
for i, e := range events {
if e.Person.Handle == "" || e.Person.YearsContributing > 0 {
continue
}
if years, ok := patches[e.Person.Handle]; ok && years > 0 {
events[i].Person.YearsContributing = years
changed = true
}
}
if !changed {
return nil
}
data, err := json.MarshalIndent(events, "", "  ")
if err != nil {
return err
}
return os.WriteFile(outPath, data, 0o644)
}

// BackfillPersonFields patches existing changelog.json events that are missing
// countryFlag or primaryBadge.
func BackfillPersonFields(outDir string) error {
outPath := filepath.Join(outDir, "changelog.json")
raw, err := os.ReadFile(outPath)
if err != nil {
if errors.Is(err, os.ErrNotExist) {
return nil
}
return err
}
var events []Event
if err := json.Unmarshal(raw, &events); err != nil {
return err
}
changed := false
for i, e := range events {
p := &events[i].Person
if p.CountryFlag == "" && e.Person.Location != "" {
p.CountryFlag = CountryFlag(e.Person.Location)
if p.CountryFlag != "" {
changed = true
}
}
if p.PrimaryBadge == "" && len(e.Person.Category) > 0 {
p.PrimaryBadge = PrimaryBadge(e.Person.Category)
if p.PrimaryBadge != "" {
changed = true
}
}
}
if !changed {
return nil
}
data, err := json.MarshalIndent(events, "", "  ")
if err != nil {
return err
}
return os.WriteFile(outPath, data, 0o644)
}

// Stats holds aggregate community statistics.
type Stats struct {
Total      int            `json:"total"`
Added      int            `json:"added"`
Removed    int            `json:"removed"`
Updated    int            `json:"updated"`
Countries  int            `json:"countries"`
Companies  int            `json:"companies"`
Categories map[string]int `json:"categories"`
}

var statsCategories = []string{
"Kubestronaut",
"Golden-Kubestronaut",
"Ambassadors",
"Technical Oversight Committee",
"End User TAB",
"Governing Board",
"Staff",
"Marketing Committee",
}

// WriteStats reads changelog.json from outDir, computes aggregate stats, and writes stats.json.
func WriteStats(outDir string) error {
changelogPath := filepath.Join(outDir, "changelog.json")
raw, err := os.ReadFile(changelogPath)
if err != nil {
if errors.Is(err, os.ErrNotExist) {
return nil
}
return err
}

var events []Event
if err := json.Unmarshal(raw, &events); err != nil {
return fmt.Errorf("unmarshal changelog: %w", err)
}

seen := make(map[string]struct{})
var people []SafePerson
for _, e := range events {
key := e.Person.GitHub
if key == "" {
key = e.Person.Name
}
if _, ok := seen[key]; ok {
continue
}
seen[key] = struct{}{}
if e.Type != EventRemoved {
people = append(people, e.Person)
}
}

var added, removed, updated int
for _, e := range events {
switch e.Type {
case EventAdded:
added++
case EventRemoved:
removed++
case EventUpdated:
updated++
}
}

countrySet := make(map[string]struct{})
for _, p := range people {
if p.Location == "" {
continue
}
parts := strings.Split(p.Location, ",")
country := strings.TrimSpace(parts[len(parts)-1])
if country != "" {
countrySet[country] = struct{}{}
}
}

companySet := make(map[string]struct{})
for _, p := range people {
if p.Company != "" {
companySet[p.Company] = struct{}{}
}
}

cats := make(map[string]int, len(statsCategories))
for _, cat := range statsCategories {
for _, p := range people {
for _, c := range p.Category {
if c == cat {
cats[cat]++
break
}
}
}
}

stats := Stats{
Total:      len(people),
Added:      added,
Removed:    removed,
Updated:    updated,
Countries:  len(countrySet),
Companies:  len(companySet),
Categories: cats,
}

data, err := json.MarshalIndent(stats, "", "  ")
if err != nil {
return err
}
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "stats.json"), data, 0o644)
}

// WriteRSS generates an RSS feed from events and writes it to outDir/feed.xml.
func WriteRSS(outDir string, events []Event) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}

feed := &feeds.Feed{
Title:       "CNCF People",
Link:        &feeds.Link{Href: "https://castrojo.github.io/people-website/"},
Description: "Activity feed — who's joining the cloud native community",
Author:      &feeds.Author{Name: "CNCF People"},
Created:     time.Now(),
}

for _, e := range events {
title := fmt.Sprintf("%s %s", e.Type, e.Person.Name)
link := e.Person.GitHub
if link == "" {
link = "https://github.com"
}
feed.Items = append(feed.Items, &feeds.Item{
Id:      e.ID,
Title:   title,
Link:    &feeds.Link{Href: link},
Created: e.Timestamp,
})
}

rss, err := feed.ToRss()
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "feed.xml"), []byte(rss), 0o644)
}

// WriteMaintainers writes the maintainer list to outDir/maintainers.json.
func WriteMaintainers(outDir string, maintainers []SafeMaintainer) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
sort.Slice(maintainers, func(i, j int) bool {
return maintainers[i].UpdatedAt.After(maintainers[j].UpdatedAt)
})
data, err := json.MarshalIndent(maintainers, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "maintainers.json"), data, 0o644)
}

// LoadMaintainers reads the existing maintainers.json from disk.
func LoadMaintainers(outDir string) ([]SafeMaintainer, error) {
path := filepath.Join(outDir, "maintainers.json")
data, err := os.ReadFile(path)
if errors.Is(err, os.ErrNotExist) {
return nil, nil
}
if err != nil {
return nil, err
}
var m []SafeMaintainer
return m, json.Unmarshal(data, &m)
}

// WriteChangelogPages splits changelog events into fixed-size pages.
func WriteChangelogPages(outDir string, events []Event) error {
const pageSize = 500
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
totalPages := (len(events) + pageSize - 1) / pageSize
if totalPages == 0 {
totalPages = 1
}
for page := 0; page < totalPages; page++ {
start := page * pageSize
end := start + pageSize
if end > len(events) {
end = len(events)
}
pageEvents := events[start:end]
data, err := json.MarshalIndent(pageEvents, "", "  ")
if err != nil {
return fmt.Errorf("marshal changelog page %d: %w", page, err)
}
path := filepath.Join(outDir, fmt.Sprintf("changelog-%d.json", page))
if err := os.WriteFile(path, data, 0o644); err != nil {
return err
}
}
meta := map[string]int{
"totalEvents": len(events),
"totalPages":  totalPages,
"pageSize":    pageSize,
}
metaData, err := json.MarshalIndent(meta, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "changelog-meta.json"), metaData, 0o644)
}

// WritePeopleIndex writes a deduplicated snapshot of the current community to people-index.json.
func WritePeopleIndex(outDir string, events []Event) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
seen := make(map[string]struct{})
var people []SafePerson
for _, e := range events {
key := e.Person.GitHub
if key == "" {
key = e.Person.Name
}
if _, ok := seen[key]; ok {
continue
}
seen[key] = struct{}{}
if e.Type != EventRemoved {
people = append(people, e.Person)
}
}
data, err := json.MarshalIndent(people, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "people-index.json"), data, 0o644)
}

// LeadershipEntry is the output format for toc.json, tab.json, gb.json, and marketing.json.
type LeadershipEntry struct {
Handle   string `json:"handle"`
Name     string `json:"name"`
Title    string `json:"title"`
ImageURL string `json:"imageUrl,omitempty"`
}

func leadershipSortKey(title string) int {
lower := strings.ToLower(title)
switch {
case strings.HasPrefix(lower, "chair"):
return 0
case strings.HasPrefix(lower, "vice"):
return 1
default:
return 2
}
}

func writeLeadershipJSON(outDir, filename, category string, people []RawPerson, roleFunc func(RawPerson) string) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
var entries []LeadershipEntry
for _, p := range people {
hasCat := false
for _, c := range p.Category {
if c == category {
hasCat = true
break
}
}
if !hasCat {
continue
}
handle := p.GitHubHandle()
if handle == "" {
log.Printf("warn: %s member %q has no GitHub handle", category, p.Name)
}
title := roleFunc(p)
if title == "" {
title = "Member"
}
entries = append(entries, LeadershipEntry{
Handle:   handle,
Name:     p.Name,
Title:    title,
ImageURL: p.ImageURL(),
})
}
sort.Slice(entries, func(i, j int) bool {
ki, kj := leadershipSortKey(entries[i].Title), leadershipSortKey(entries[j].Title)
if ki != kj {
return ki < kj
}
return entries[i].Name < entries[j].Name
})
data, err := json.MarshalIndent(entries, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, filename), data, 0o644)
}

// WriteTOC generates toc.json.
func WriteTOC(outDir string, people []RawPerson) error {
return writeLeadershipJSON(outDir, "toc.json", "Technical Oversight Committee", people,
func(p RawPerson) string { return p.TOCRole })
}

// WriteTAB generates tab.json.
func WriteTAB(outDir string, people []RawPerson) error {
return writeLeadershipJSON(outDir, "tab.json", "End User TAB", people,
func(p RawPerson) string { return p.TABRole })
}

// WriteGB generates gb.json.
func WriteGB(outDir string, people []RawPerson) error {
return writeLeadershipJSON(outDir, "gb.json", "Governing Board", people,
func(p RawPerson) string { return p.GBRole })
}

// WriteMarketing generates marketing.json.
func WriteMarketing(outDir string, people []RawPerson) error {
return writeLeadershipJSON(outDir, "marketing.json", "Marketing Committee", people,
func(p RawPerson) string { return "" })
}

// LeadershipRoles is the unified output format for leadership-roles.json.
type LeadershipRoles struct {
TOC       []LeadershipEntry `json:"toc"`
TAB       []LeadershipEntry `json:"tab"`
GB        []LeadershipEntry `json:"governing-board"`
Marketing []LeadershipEntry `json:"marketing"`
}

func buildLeadershipEntries(category string, people []RawPerson, roleFunc func(RawPerson) string) []LeadershipEntry {
var entries []LeadershipEntry
for _, p := range people {
hasCat := false
for _, c := range p.Category {
if c == category {
hasCat = true
break
}
}
if !hasCat {
continue
}
handle := p.GitHubHandle()
if handle == "" {
log.Printf("warn: %s member %q has no GitHub handle", category, p.Name)
}
title := roleFunc(p)
if title == "" {
title = "Member"
}
entries = append(entries, LeadershipEntry{Handle: handle, Name: p.Name, Title: title, ImageURL: p.ImageURL()})
}
sort.Slice(entries, func(i, j int) bool {
ki, kj := leadershipSortKey(entries[i].Title), leadershipSortKey(entries[j].Title)
if ki != kj {
return ki < kj
}
return entries[i].Name < entries[j].Name
})
return entries
}

// WriteLeadershipRoles writes a unified leadership-roles.json.
func WriteLeadershipRoles(outDir string, people []RawPerson) error {
roles := LeadershipRoles{
TOC:       buildLeadershipEntries("Technical Oversight Committee", people, func(p RawPerson) string { return p.TOCRole }),
TAB:       buildLeadershipEntries("End User TAB", people, func(p RawPerson) string { return p.TABRole }),
GB:        buildLeadershipEntries("Governing Board", people, func(p RawPerson) string { return p.GBRole }),
Marketing: buildLeadershipEntries("Marketing Committee", people, func(RawPerson) string { return "" }),
}
if roles.TOC == nil {
roles.TOC = []LeadershipEntry{}
}
if roles.TAB == nil {
roles.TAB = []LeadershipEntry{}
}
if roles.GB == nil {
roles.GB = []LeadershipEntry{}
}
if roles.Marketing == nil {
roles.Marketing = []LeadershipEntry{}
}
data, err := json.MarshalIndent(roles, "", "  ")
if err != nil {
return err
}
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "leadership-roles.json"), data, 0o644)
}

// EmeritusEntry records a former CNCF community member.
type EmeritusEntry struct {
Handle      string   `json:"handle"`
Name        string   `json:"name"`
Category    []string `json:"category"`
RemovedDate string   `json:"removedDate"`
}

// WriteEmeritusFromEvents appends newly removed people to people-emeritus.json.
func WriteEmeritusFromEvents(outDir string, removed []Event, activeHandles map[string]bool) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
outPath := filepath.Join(outDir, "people-emeritus.json")

var existing []EmeritusEntry
if raw, err := os.ReadFile(outPath); err == nil {
_ = json.Unmarshal(raw, &existing)
} else if !errors.Is(err, os.ErrNotExist) {
return err
}

seen := make(map[string]bool, len(existing))
for _, e := range existing {
if e.Handle != "" {
seen[e.Handle] = true
}
}

for _, ev := range removed {
if ev.Type != EventRemoved {
continue
}
handle := ev.Person.Handle
if handle == "" || activeHandles[handle] || seen[handle] {
continue
}
seen[handle] = true
existing = append(existing, EmeritusEntry{
Handle:      handle,
Name:        ev.Person.Name,
Category:    ev.Person.Category,
RemovedDate: ev.Timestamp.Format("2006-01-02"),
})
}

data, err := json.MarshalIndent(existing, "", "  ")
if err != nil {
return err
}
return os.WriteFile(outPath, data, 0o644)
}

// HeroRotations is the output structure written to heroes.json.
type HeroRotations struct {
GeneratedAt         time.Time        `json:"generatedAt"`
Everyone            []SafePerson     `json:"everyone"`
Ambassadors         []SafePerson     `json:"ambassadors"`
Kubestronauts       []SafePerson     `json:"kubestronauts"`
GoldenKubestronauts []SafePerson     `json:"goldenKubestronauts"`
Maintainers         []SafeMaintainer `json:"maintainers"`
CNCFLeadership      []SafePerson     `json:"cncfLeadership"`
Emeritus            []SafePerson     `json:"emeritus"`
}

func dailyPick[T any](items []T, n int) []T {
if len(items) == 0 {
return []T{}
}
if n >= len(items) {
result := make([]T, len(items))
copy(result, items)
return result
}
now := time.Now().UTC()
seed := int64(now.Year()*10000 + int(now.Month())*100 + now.Day())
r := rand.New(rand.NewSource(seed))
shuffled := make([]T, len(items))
copy(shuffled, items)
r.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
cursor := (now.YearDay() * n) % len(shuffled)
result := make([]T, 0, n)
for len(result) < n {
result = append(result, shuffled[cursor%len(shuffled)])
cursor++
}
return result
}

func isSheHerTheyThem(p SafePerson) bool {
pr := strings.ToLower(strings.TrimSpace(p.Pronouns))
return strings.Contains(pr, "she") || strings.Contains(pr, "they")
}

func dailyPickDiverse(items []SafePerson, n int) []SafePerson {
if len(items) == 0 || n == 0 {
return []SafePerson{}
}

var diverse, rest []SafePerson
for _, p := range items {
if isSheHerTheyThem(p) {
diverse = append(diverse, p)
} else {
rest = append(rest, p)
}
}

if len(diverse) == 0 || n <= 1 {
return dailyPick(items, n)
}

result := dailyPick(diverse, 1)
picked := result[0]

remaining := make([]SafePerson, 0, len(rest)+len(diverse)-1)
remaining = append(remaining, rest...)
for _, p := range diverse {
if p.Handle != picked.Handle || p.Name != picked.Name {
remaining = append(remaining, p)
}
}
result = append(result, dailyPick(remaining, n-1)...)
return result
}

func categoryBalancedPick(ambassadors, kubestronauts []SafePerson, maintainers []SafeMaintainer, n int) []SafePerson {
if n <= 0 {
return []SafePerson{}
}

ambQuota := n * 3 / 8
kubeQuota := n * 3 / 8
maintQuota := n - ambQuota - kubeQuota

if ambQuota > len(ambassadors) {
ambQuota = len(ambassadors)
}
if kubeQuota > len(kubestronauts) {
kubeQuota = len(kubestronauts)
}
if maintQuota > len(maintainers) {
maintQuota = len(maintainers)
}

picked := make([]SafePerson, 0, n)
seen := make(map[string]struct{})

for _, p := range dailyPickDiverse(ambassadors, ambQuota) {
key := p.Handle
if key == "" {
key = p.Name
}
if _, dup := seen[key]; !dup {
seen[key] = struct{}{}
picked = append(picked, p)
}
}

for _, p := range dailyPickDiverse(kubestronauts, kubeQuota+len(ambassadors)) {
if len(picked)-ambQuota >= kubeQuota {
break
}
key := p.Handle
if key == "" {
key = p.Name
}
if _, dup := seen[key]; !dup {
seen[key] = struct{}{}
picked = append(picked, p)
}
}

maintSafe := make([]SafePerson, 0, len(maintainers))
for _, m := range maintainers {
maintSafe = append(maintSafe, SafePerson{
Name:              m.Name,
Handle:            m.Handle,
Company:           m.Company,
Location:          m.Location,
CountryFlag:       m.CountryFlag,
Bio:               m.Bio,
Category:          []string{"Maintainer"},
YearsContributing: m.YearsContributing,
AvatarURL:         m.AvatarURL,
})
}
for _, p := range dailyPick(maintSafe, maintQuota) {
key := p.Handle
if key == "" {
key = p.Name
}
if _, dup := seen[key]; !dup {
seen[key] = struct{}{}
picked = append(picked, p)
}
}

return picked
}

// WriteHeroRotations writes the daily hero rotation to heroes.json.
func WriteHeroRotations(outDir string, events []Event, maintainers []SafeMaintainer, leadershipHandles []string) error {
if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}

seen := make(map[string]struct{})
var allPeople []SafePerson
pools := map[string][]SafePerson{
"Ambassadors":         {},
"Kubestronaut":        {},
"Golden-Kubestronaut": {},
}
byHandle := map[string]SafePerson{}

for _, e := range events {
if e.Type == EventRemoved {
continue
}
key := e.Person.GitHub
if key == "" {
key = e.Person.Name
}
if _, ok := seen[key]; ok {
continue
}
seen[key] = struct{}{}
allPeople = append(allPeople, e.Person)
if e.Person.Handle != "" {
byHandle[e.Person.Handle] = e.Person
}
for _, cat := range e.Person.Category {
if _, ok := pools[cat]; ok {
pools[cat] = append(pools[cat], e.Person)
}
}
}
_ = allPeople

leadership := []SafePerson{}
for _, h := range leadershipHandles {
if p, ok := byHandle[h]; ok {
leadership = append(leadership, p)
}
}

var emeritusPeople []SafePerson
if raw, err := os.ReadFile(filepath.Join(outDir, "people-emeritus.json")); err == nil {
var entries []EmeritusEntry
if json.Unmarshal(raw, &entries) == nil {
for _, e := range entries {
if e.Handle == "" {
continue
}
emeritusPeople = append(emeritusPeople, SafePerson{
Name:     e.Name,
Handle:   e.Handle,
Category: e.Category,
})
}
}
}

rotations := HeroRotations{
GeneratedAt:         time.Now().UTC(),
Everyone:            categoryBalancedPick(pools["Ambassadors"], pools["Kubestronaut"], maintainers, 8),
Ambassadors:         dailyPickDiverse(pools["Ambassadors"], 8),
Kubestronauts:       dailyPickDiverse(pools["Kubestronaut"], 4),
GoldenKubestronauts: dailyPickDiverse(pools["Golden-Kubestronaut"], 4),
Maintainers:         dailyPick(maintainers, 8),
CNCFLeadership:      leadership,
Emeritus:            dailyPickDiverse(emeritusPeople, 8),
}

data, err := json.MarshalIndent(rotations, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "heroes.json"), data, 0o644)
}

// StaffAssignment is a single entry in staff-assignments.json.
type StaffAssignment struct {
Handle     string `json:"handle,omitempty"`
Name       string `json:"name,omitempty"`
ImageURL   string `json:"imageUrl,omitempty"`
ProfileURL string `json:"profileUrl,omitempty"`
}

// StaffSupportEntry is the enriched output written to staff-support.json.
type StaffSupportEntry struct {
Handle     string `json:"handle,omitempty"`
Name       string `json:"name"`
ImageURL   string `json:"imageUrl,omitempty"`
ProfileURL string `json:"profileUrl,omitempty"`
}

// WriteStaffSupport reads staff-assignments.json, enriches, and writes staff-support.json.
func WriteStaffSupport(outDir string, people []RawPerson) error {
assignPath := filepath.Join(outDir, "staff-assignments.json")
raw, err := os.ReadFile(assignPath)
if err != nil {
if errors.Is(err, os.ErrNotExist) {
log.Printf("warn: WriteStaffSupport: %s not found — skipping", assignPath)
return nil
}
return err
}

var assignments map[string][]StaffAssignment
if err := json.Unmarshal(raw, &assignments); err != nil {
return fmt.Errorf("parse staff-assignments.json: %w", err)
}

byHandle := make(map[string]RawPerson, len(people))
for _, p := range people {
if h := p.GitHubHandle(); h != "" {
byHandle[strings.ToLower(h)] = p
}
}

result := make(map[string][]StaffSupportEntry, len(assignments))
for tab, entries := range assignments {
out := make([]StaffSupportEntry, 0, len(entries))
for _, entry := range entries {
if entry.Handle != "" {
p, found := byHandle[strings.ToLower(entry.Handle)]
var name, imageURL string
if found {
name = p.Name
imageURL = p.ImageURL()
} else {
name = entry.Handle
}
out = append(out, StaffSupportEntry{
Handle:   entry.Handle,
Name:     name,
ImageURL: imageURL,
})
} else {
out = append(out, StaffSupportEntry{
Name:       entry.Name,
ImageURL:   entry.ImageURL,
ProfileURL: entry.ProfileURL,
})
}
}
result[tab] = out
}

if err := os.MkdirAll(outDir, 0o755); err != nil {
return err
}
data, err := json.MarshalIndent(result, "", "  ")
if err != nil {
return err
}
return os.WriteFile(filepath.Join(outDir, "staff-support.json"), data, 0o644)
}

// BackfillFromCache patches changelog.json events that are missing enrichment from cache.
func BackfillFromCache(outDir string, cache *APICache) ([]Event, error) {
outPath := filepath.Join(outDir, "changelog.json")
raw, err := os.ReadFile(outPath)
if err != nil {
if errors.Is(err, os.ErrNotExist) {
return nil, nil
}
return nil, err
}
var events []Event
if err := json.Unmarshal(raw, &events); err != nil {
return nil, err
}
changed := false
for i, e := range events {
if e.Person.Handle == "" {
continue
}
stats, ok := cache.Get(e.Person.Handle)
if !ok {
continue
}
p := &events[i].Person
if p.AvatarURL == "" && p.Handle != "" {
p.AvatarURL = "https://avatars.githubusercontent.com/" + p.Handle
changed = true
}
if p.Pronouns == "" && stats.Pronouns != "" {
p.Pronouns = stats.Pronouns
changed = true
}
if p.Location == "" && stats.Location != "" {
p.Location = stats.Location
p.CountryFlag = CountryFlag(stats.Location)
changed = true
}
if p.YearsContributing == 0 && stats.YearsContributing > 0 {
p.YearsContributing = stats.YearsContributing
changed = true
}
}
if !changed {
return events, nil
}
data, err := json.MarshalIndent(events, "", "  ")
if err != nil {
return nil, err
}
return events, os.WriteFile(outPath, data, 0o644)
}
