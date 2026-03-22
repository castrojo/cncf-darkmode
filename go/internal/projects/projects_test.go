package projects

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// --- differ_test ---

func marshalProjects(t *testing.T, projects []SafeProject) []byte {
	t.Helper()
	b, err := json.Marshal(projects)
	if err != nil {
		t.Fatalf("marshal projects: %v", err)
	}
	return b
}

func TestDiff_NoChanges(t *testing.T) {
	cases := []struct {
		name     string
		projects []SafeProject
	}{
		{
			name:     "empty state",
			projects: []SafeProject{},
		},
		{
			name: "single project unchanged",
			projects: []SafeProject{
				{Name: "Kubernetes", Slug: "kubernetes", Maturity: "graduated", AcceptedDate: "2016-03-10"},
			},
		},
		{
			name: "multiple projects unchanged",
			projects: []SafeProject{
				{Name: "Prometheus", Slug: "prometheus", Maturity: "graduated"},
				{Name: "Argo", Slug: "argo", Maturity: "graduated"},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			prev := marshalProjects(t, tc.projects)
			events, _ := Diff(prev, tc.projects)
			if len(events) != 0 {
				t.Errorf("expected 0 events, got %d: %+v", len(events), events)
			}
		})
	}
}

func TestDiff_ProjectAdded(t *testing.T) {
	cases := []struct {
		name     string
		curr     SafeProject
		wantType string
	}{
		{
			name:     "new graduated project",
			curr:     SafeProject{Name: "Kubernetes", Slug: "kubernetes", Maturity: "graduated"},
			wantType: "accepted",
		},
		{
			name:     "new sandbox project",
			curr:     SafeProject{Name: "Argo", Slug: "argo", Maturity: "sandbox"},
			wantType: "accepted",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			events, _ := Diff([]byte("[]"), []SafeProject{tc.curr})
			if len(events) != 1 {
				t.Fatalf("expected 1 event, got %d", len(events))
			}
			if events[0].Type != tc.wantType {
				t.Errorf("event type = %q, want %q", events[0].Type, tc.wantType)
			}
			if events[0].ProjectSlug != tc.curr.Slug {
				t.Errorf("slug = %q, want %q", events[0].ProjectSlug, tc.curr.Slug)
			}
			if events[0].ID == "" {
				t.Error("event ID must not be empty")
			}
		})
	}
}

func TestDiff_ProjectRemoved(t *testing.T) {
	cases := []struct {
		name string
		prev SafeProject
	}{
		{
			name: "graduated project removed",
			prev: SafeProject{Name: "Kubernetes", Slug: "kubernetes", Maturity: "graduated"},
		},
		{
			name: "sandbox project removed",
			prev: SafeProject{Name: "Argo", Slug: "argo", Maturity: "sandbox"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			prevJSON := marshalProjects(t, []SafeProject{tc.prev})
			events, _ := Diff(prevJSON, []SafeProject{})
			if len(events) != 1 {
				t.Fatalf("expected 1 event, got %d", len(events))
			}
			if events[0].Type != "removed" {
				t.Errorf("event type = %q, want %q", events[0].Type, "removed")
			}
			if events[0].ProjectSlug != tc.prev.Slug {
				t.Errorf("slug = %q, want %q", events[0].ProjectSlug, tc.prev.Slug)
			}
		})
	}
}

func TestDiff_MaturityChanged(t *testing.T) {
	cases := []struct {
		name       string
		prev       SafeProject
		curr       SafeProject
		wantType   string
		wantOldMat string
		wantNewMat string
	}{
		{
			name:       "sandbox to incubating",
			prev:       SafeProject{Name: "Argo", Slug: "argo", Maturity: "sandbox"},
			curr:       SafeProject{Name: "Argo", Slug: "argo", Maturity: "incubating"},
			wantType:   "promoted",
			wantOldMat: "sandbox",
			wantNewMat: "incubating",
		},
		{
			name:       "incubating to graduated",
			prev:       SafeProject{Name: "Prometheus", Slug: "prometheus", Maturity: "incubating"},
			curr:       SafeProject{Name: "Prometheus", Slug: "prometheus", Maturity: "graduated"},
			wantType:   "promoted",
			wantOldMat: "incubating",
			wantNewMat: "graduated",
		},
		{
			name:       "graduated to archived",
			prev:       SafeProject{Name: "OldProject", Slug: "oldproject", Maturity: "graduated"},
			curr:       SafeProject{Name: "OldProject", Slug: "oldproject", Maturity: "archived"},
			wantType:   "archived",
			wantOldMat: "graduated",
			wantNewMat: "archived",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			prevJSON := marshalProjects(t, []SafeProject{tc.prev})
			events, _ := Diff(prevJSON, []SafeProject{tc.curr})
			if len(events) != 1 {
				t.Fatalf("expected 1 event, got %d: %+v", len(events), events)
			}
			e := events[0]
			if e.Type != tc.wantType {
				t.Errorf("type = %q, want %q", e.Type, tc.wantType)
			}
			if e.OldMaturity != tc.wantOldMat {
				t.Errorf("oldMaturity = %q, want %q", e.OldMaturity, tc.wantOldMat)
			}
			if e.Maturity != tc.wantNewMat {
				t.Errorf("maturity = %q, want %q", e.Maturity, tc.wantNewMat)
			}
		})
	}
}

// --- fetcher_test ---

func TestFilterAndConvert_OnlyCNCFProjects(t *testing.T) {
	dataset := FullDataset{
		Items: []FullItem{
			{Name: "Kubernetes", Maturity: "graduated"},
			{Name: "NotACNCFProject", Maturity: ""},
			{Name: "Prometheus", Maturity: "graduated"},
			{Name: "AlsoNotCNCF"},
		},
		GitHubData: map[string]GitHubItem{},
	}
	got := filterAndConvert(dataset)
	if len(got) != 2 {
		t.Errorf("expected 2 CNCF projects (non-empty maturity), got %d", len(got))
	}
}

func TestToSafeProject_BasicFields(t *testing.T) {
	item := FullItem{
		Name:     "TestProject",
		Maturity: "sandbox",
	}
	p := toSafeProject(item, nil)
	if p.Name != "TestProject" {
		t.Errorf("expected name TestProject, got %s", p.Name)
	}
	if p.Maturity != "sandbox" {
		t.Errorf("expected maturity sandbox, got %s", p.Maturity)
	}
	if p.Slug == "" {
		t.Error("expected non-empty slug")
	}
}

func TestToSafeProject_RepoURL(t *testing.T) {
	item := FullItem{
		Name:     "WithRepo",
		Maturity: "incubating",
		Repositories: []Repository{
			{URL: "https://github.com/example/project"},
		},
	}
	p := toSafeProject(item, nil)
	if p.RepoURL != "https://github.com/example/project" {
		t.Errorf("expected repo URL, got %q", p.RepoURL)
	}
}

func TestToSafeProject_Summary(t *testing.T) {
	item := FullItem{
		Name:     "WithSummary",
		Maturity: "graduated",
		Summary:  &ProjectSummary{UseCase: "orchestrates containers"},
	}
	p := toSafeProject(item, nil)
	if p.Summary != "orchestrates containers" {
		t.Errorf("expected summary, got %q", p.Summary)
	}
}

// --- writer_test ---

func TestWriteProjects_ProducesValidJSON(t *testing.T) {
	tmp := t.TempDir()

	projects := []SafeProject{
		{Name: "Kubernetes", Slug: "kubernetes", Maturity: "graduated", GraduatedDate: "2018-03-06"},
		{Name: "Prometheus", Slug: "prometheus", Maturity: "graduated", GraduatedDate: "2018-08-09"},
	}

	if err := WriteProjects(tmp, projects, nil); err != nil {
		t.Fatalf("WriteProjects: %v", err)
	}

	outPath := filepath.Join(tmp, "projects.json")
	data, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var result []SafeProject
	if err := json.Unmarshal(data, &result); err != nil {
		t.Errorf("output is not valid JSON: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 projects in output, got %d", len(result))
	}
	raw := string(data)
	if !strings.Contains(raw, "kubernetes") {
		t.Error("output JSON does not contain 'kubernetes'")
	}
}

func TestWriteProjects_SortsByLatestMilestone(t *testing.T) {
	tmp := t.TempDir()

	projects := []SafeProject{
		{Name: "Older", Slug: "older", Maturity: "graduated", GraduatedDate: "2016-01-01"},
		{Name: "Newer", Slug: "newer", Maturity: "graduated", GraduatedDate: "2023-06-15"},
	}

	if err := WriteProjects(tmp, projects, nil); err != nil {
		t.Fatalf("WriteProjects: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(tmp, "projects.json"))
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var result []SafeProject
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(result) < 2 {
		t.Fatalf("expected at least 2 results, got %d", len(result))
	}
	if result[0].Slug != "newer" {
		t.Errorf("first project = %q, want %q (should be sorted newest first)", result[0].Slug, "newer")
	}
}

func TestWriteChangelog_MergesWithExisting(t *testing.T) {
	tmp := t.TempDir()

	// Write an existing changelog
	existing := []Event{
		{ID: "old-id", Type: "accepted", ProjectName: "OldProject", ProjectSlug: "oldproject",
			Maturity: "sandbox", Timestamp: "2020-01-01T00:00:00Z", Description: "old"},
	}
	existingData, _ := json.Marshal(existing)
	_ = os.WriteFile(filepath.Join(tmp, "changelog.json"), existingData, 0644)

	newEvents := []Event{
		{ID: "new-id", Type: "accepted", ProjectName: "NewProject", ProjectSlug: "newproject",
			Maturity: "graduated", Timestamp: "2024-01-01T00:00:00Z", Description: "new"},
	}

	if err := WriteChangelog(tmp, newEvents); err != nil {
		t.Fatalf("WriteChangelog: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(tmp, "changelog.json"))
	if err != nil {
		t.Fatalf("ReadFile changelog: %v", err)
	}

	var result []Event
	if err := json.Unmarshal(data, &result); err != nil {
		t.Errorf("output is not valid JSON: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 merged events, got %d", len(result))
	}
	if result[0].ProjectSlug != "newproject" {
		t.Errorf("first event slug = %q, want %q (should be newest first)", result[0].ProjectSlug, "newproject")
	}
}

// --- models_test ---

func TestSlugify(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"Kubernetes", "kubernetes"},
		{"Open Policy Agent", "open-policy-agent"},
		{"cert-manager", "cert-manager"},
		{"SPIFFE/SPIRE", "spiffe-spire"},
		{"", ""},
	}
	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			got := Slugify(tc.input)
			if got != tc.want {
				t.Errorf("Slugify(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestLogoFullURL(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"", ""},
		{"https://example.com/logo.svg", "https://example.com/logo.svg"},
		{"logos/kubernetes.svg", "https://landscape.cncf.io/logos/kubernetes.svg"},
	}
	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			got := LogoFullURL(tc.input)
			if got != tc.want {
				t.Errorf("LogoFullURL(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}
