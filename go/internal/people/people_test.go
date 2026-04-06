package people

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// --- privacy_test (CRITICAL security tests) ---

// TestToSafe_EmailNotExposed is the critical privacy guarantee:
// email and wechat values MUST NOT appear in SafePerson JSON output.
func TestToSafe_EmailNotExposed(t *testing.T) {
	p := RawPerson{
		Name:   "Alice",
		Email:  "alice@example.com",
		WeChat: "alice_wechat",
	}
	safe := p.ToSafe()
	data, err := json.Marshal(safe)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(data)
	if strings.Contains(s, "alice@example.com") {
		t.Error("SafePerson JSON must not contain email address")
	}
	if strings.Contains(s, "alice_wechat") {
		t.Error("SafePerson JSON must not contain wechat handle")
	}
}

func TestSafePersonHasNoEmailOrWechat(t *testing.T) {
	raw := RawPerson{
		Name:   "Bob",
		Email:  "bob@secret.com",
		WeChat: "bob_wechat_handle",
	}
	safe := ToSafePerson(raw)
	data, err := json.Marshal(safe)
	if err != nil {
		t.Fatal(err)
	}
	jsonStr := string(data)
	if strings.Contains(jsonStr, "email") {
		t.Error("SafePerson JSON must not contain 'email' field")
	}
	if strings.Contains(jsonStr, "wechat") {
		t.Error("SafePerson JSON must not contain 'wechat' field")
	}
	if strings.Contains(jsonStr, "bob@secret.com") {
		t.Error("SafePerson JSON must not contain email value")
	}
	if strings.Contains(jsonStr, "bob_wechat_handle") {
		t.Error("SafePerson JSON must not contain wechat value")
	}
}

// --- models_test ---

func TestGitHubHandle(t *testing.T) {
	cases := []struct {
		name   string
		github string
		want   string
	}{
		{"normal handle", "https://github.com/castrojo", "castrojo"},
		{"trailing slash trimmed", "https://github.com/castrojo/", "castrojo"},
		{"handle with dot", "https://github.com/yrsuthari.github.io", ""},
		{"handle with question mark", "https://github.com/K-JooHwan?tab=repositories", ""},
		{"org/repo path rejected", "https://github.com/org/repo", ""},
		{"empty string", "", ""},
		{"non-github URL", "https://gitlab.com/user", ""},
		{"hyphenated handle", "https://github.com/some-user", "some-user"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := RawPerson{GitHub: tc.github}
			got := p.GitHubHandle()
			if got != tc.want {
				t.Errorf("GitHubHandle(%q) = %q, want %q", tc.github, got, tc.want)
			}
		})
	}
}

func TestImageURL(t *testing.T) {
	cases := []struct {
		name  string
		image string
		want  string
	}{
		{"empty", "", ""},
		{"filename only", "alice.jpg", ImageBaseURL + "alice.jpg"},
		{"full https URL passthrough", "https://example.com/logo.png", "https://example.com/logo.png"},
		{"full http URL passthrough", "http://example.com/logo.png", "http://example.com/logo.png"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := RawPerson{Image: tc.image}
			got := p.ImageURL()
			if got != tc.want {
				t.Errorf("ImageURL(%q) = %q, want %q", tc.image, got, tc.want)
			}
		})
	}
}

func TestCountryFlag(t *testing.T) {
	cases := []struct {
		name      string
		location  string
		wantEmpty bool
	}{
		{"empty location", "", true},
		{"city comma country", "San Francisco, United States", false},
		{"Tunisia French spelling (Tunisie)", "Tunis, Tunisie", false},
		{"UAE singular typo (United Arab Emirate)", "Dubai, United Arab Emirate", false},
		{"unknown country returns empty", "City, ZZZUnknown9999", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := CountryFlag(tc.location)
			if tc.wantEmpty && got != "" {
				t.Errorf("CountryFlag(%q) = %q, want empty", tc.location, got)
			}
			if !tc.wantEmpty && got == "" {
				t.Errorf("CountryFlag(%q) = empty, want non-empty flag emoji", tc.location)
			}
		})
	}
}

func TestPrimaryBadge(t *testing.T) {
	cases := []struct {
		name string
		cats []string
		want string
	}{
		{"empty slice", nil, ""},
		{"single unknown category", []string{"SomeRole"}, "SomeRole"},
		{"golden kubestronaut beats kubestronaut", []string{"Kubestronaut", "Golden-Kubestronaut"}, "Golden-Kubestronaut"},
		{"kubestronaut beats ambassadors", []string{"Ambassadors", "Kubestronaut"}, "Kubestronaut"},
		{"staff returned when only option", []string{"Staff"}, "Staff"},
		{"first category returned when no priority match", []string{"UnknownA", "UnknownB"}, "UnknownA"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := PrimaryBadge(tc.cats)
			if got != tc.want {
				t.Errorf("PrimaryBadge(%v) = %q, want %q", tc.cats, got, tc.want)
			}
		})
	}
}

// --- differ_test ---

func TestCompute_NoChanges(t *testing.T) {
	person := RawPerson{Name: "Alice", Company: "Acme"}
	prev := map[string]RawPerson{"alice": person}
	curr := map[string]RawPerson{"alice": person}
	got := Compute(prev, curr, time.Now())
	if len(got) != 0 {
		t.Errorf("expected 0 events for no changes, got %d", len(got))
	}
}

func TestCompute_PersonAdded(t *testing.T) {
	prev := map[string]RawPerson{}
	curr := map[string]RawPerson{"alice": {Name: "Alice"}}
	got := Compute(prev, curr, time.Now())
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	if got[0].Type != EventAdded {
		t.Errorf("expected EventAdded, got %q", got[0].Type)
	}
	if got[0].Person.Name != "Alice" {
		t.Errorf("expected person name Alice, got %q", got[0].Person.Name)
	}
}

func TestCompute_PersonRemoved(t *testing.T) {
	prev := map[string]RawPerson{"alice": {Name: "Alice"}}
	curr := map[string]RawPerson{}
	got := Compute(prev, curr, time.Now())
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	if got[0].Type != EventRemoved {
		t.Errorf("expected EventRemoved, got %q", got[0].Type)
	}
}

func TestCompute_PersonUpdated(t *testing.T) {
	prev := map[string]RawPerson{"alice": {Name: "Alice", Company: "Acme"}}
	curr := map[string]RawPerson{"alice": {Name: "Alice", Company: "NewCorp"}}
	got := Compute(prev, curr, time.Now())
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	if got[0].Type != EventUpdated {
		t.Errorf("expected EventUpdated, got %q", got[0].Type)
	}
	if len(got[0].Changes) == 0 {
		t.Error("expected at least one field change for updated event")
	}
	found := false
	for _, ch := range got[0].Changes {
		if ch.Field == "Company" && ch.From == "Acme" && ch.To == "NewCorp" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected Company change Acme→NewCorp in %+v", got[0].Changes)
	}
}

func TestCompute_FirstRunCap(t *testing.T) {
	const total = 6000
	curr := make(map[string]RawPerson, total)
	for i := 0; i < total; i++ {
		key := fmt.Sprintf("person%d", i)
		curr[key] = RawPerson{Name: key}
	}
	got := Compute(map[string]RawPerson{}, curr, time.Now())
	if len(got) > firstRunPeopleCap {
		t.Errorf("first-run cap: expected ≤%d events, got %d", firstRunPeopleCap, len(got))
	}
}

func TestCompute_FirstRunCap_NormalRun(t *testing.T) {
	const total = 100
	prev := map[string]RawPerson{"seed": {Name: "Seed"}}
	curr := make(map[string]RawPerson, total+1)
	curr["seed"] = RawPerson{Name: "Seed"}
	for i := 0; i < total; i++ {
		key := fmt.Sprintf("new%d", i)
		curr[key] = RawPerson{Name: key}
	}
	got := Compute(prev, curr, time.Now())
	if len(got) != total {
		t.Errorf("non-first-run: expected %d events, got %d", total, len(got))
	}
}

// --- fetcher_test (parseMaintainersCSV and parseLandscapeFullJSON) ---

func TestTitleCase(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"kubernetes steering", "Kubernetes Steering"},
		{"youki", "Youki"},
		{"", ""},
		{"CNCF", "CNCF"},
		{"argo cd", "Argo Cd"},
		{"the update framework", "The Update Framework"},
	}
	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			got := titleCase(tc.input)
			if got != tc.want {
				t.Errorf("titleCase(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestParseMaintainersCSV_SparseRows(t *testing.T) {
	csvData := "maturity,project,name,company,handle,ownersURL\n" +
		"Graduated,Kubernetes,Alice Smith,ACME Corp,alice,https://example.com\n" +
		",,Bob Jones,BobCo,bob,\n" +
		"Incubating,Argo,Carol Lee,Inc,carol,\n"

	logos := map[string]string{
		"kubernetes": "https://logos.example.com/kubernetes.png",
	}

	maintainers, err := parseMaintainersCSV(strings.NewReader(csvData), logos)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(maintainers) != 3 {
		t.Fatalf("expected 3 maintainers, got %d", len(maintainers))
	}

	alice := maintainers[0]
	if alice.Handle != "alice" {
		t.Errorf("alice.Handle = %q, want 'alice'", alice.Handle)
	}
	if len(alice.Projects) != 1 || alice.Projects[0] != "Kubernetes" {
		t.Errorf("alice.Projects = %v, want [Kubernetes]", alice.Projects)
	}
	if alice.Maturity != "Graduated" {
		t.Errorf("alice.Maturity = %q, want 'Graduated'", alice.Maturity)
	}
	if alice.LogoURL == "" {
		t.Error("alice.LogoURL should be resolved from logos map, got empty")
	}

	bob := maintainers[1]
	if len(bob.Projects) != 1 || bob.Projects[0] != "Kubernetes" {
		t.Errorf("sparse row: bob.Projects = %v, want [Kubernetes]", bob.Projects)
	}
	if bob.Maturity != "Graduated" {
		t.Errorf("sparse row: bob.Maturity = %q, want 'Graduated'", bob.Maturity)
	}

	carol := maintainers[2]
	if len(carol.Projects) != 1 || carol.Projects[0] != "Argo" {
		t.Errorf("carol.Projects = %v, want [Argo]", carol.Projects)
	}
	if carol.Maturity != "Incubating" {
		t.Errorf("carol.Maturity = %q, want 'Incubating'", carol.Maturity)
	}
}

func TestParseMaintainersCSV_EmptyBody(t *testing.T) {
	csvData := "maturity,project,name,company,handle,ownersURL\n"
	maintainers, err := parseMaintainersCSV(strings.NewReader(csvData), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(maintainers) != 0 {
		t.Errorf("expected 0 maintainers, got %d", len(maintainers))
	}
}

func TestParseMaintainersCSV_DeduplicatesHandles(t *testing.T) {
	csvData := "maturity,project,name,company,handle,ownersURL\n" +
		"Graduated,Kubernetes,Alice Smith,Acme,alice,\n" +
		"Incubating,Argo,Alice Smith,Acme,alice,\n"

	maintainers, err := parseMaintainersCSV(strings.NewReader(csvData), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(maintainers) != 1 {
		t.Fatalf("expected 1 deduplicated maintainer, got %d", len(maintainers))
	}
	if len(maintainers[0].Projects) != 2 {
		t.Errorf("expected 2 projects for alice, got %v", maintainers[0].Projects)
	}
	if maintainers[0].Maturity != "Graduated" {
		t.Errorf("expected Maturity = Graduated (highest), got %q", maintainers[0].Maturity)
	}
}

func TestParseLandscapeFullJSON_ExtractsLogos(t *testing.T) {
	body := []byte(`{"items":[
		{"name":"Kubernetes","logo":"logos/kubernetes.svg"},
		{"name":"Prometheus","logo":"logos/prometheus.svg"}
	]}`)
	logos, err := parseLandscapeFullJSON(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if logos["Kubernetes"] != "https://landscape.cncf.io/logos/kubernetes.svg" {
		t.Errorf("Kubernetes logo = %q, want full URL", logos["Kubernetes"])
	}
	if logos["prometheus"] != "https://landscape.cncf.io/logos/prometheus.svg" {
		t.Errorf("lowercase key missing or wrong: %q", logos["prometheus"])
	}
}

func TestParseLandscapeFullJSON_SkipsEmptyNameOrLogo(t *testing.T) {
	body := []byte(`{"items":[
		{"name":"","logo":"logos/a.svg"},
		{"name":"HasLogo","logo":""},
		{"name":"Valid","logo":"logos/valid.svg"}
	]}`)
	logos, err := parseLandscapeFullJSON(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := logos[""]; ok {
		t.Error("empty-name entry should be skipped")
	}
	if _, ok := logos["HasLogo"]; ok {
		t.Error("empty-logo entry should be skipped")
	}
	if logos["Valid"] != "https://landscape.cncf.io/logos/valid.svg" {
		t.Errorf("Valid logo = %q", logos["Valid"])
	}
}

func TestParseLandscapeFullJSON_InvalidJSON(t *testing.T) {
	_, err := parseLandscapeFullJSON([]byte("not json"))
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

// --- writer_test ---

func makeTestPerson(name, handle string, categories []string, pronouns string) SafePerson {
	return SafePerson{
		Name:     name,
		Handle:   handle,
		Category: categories,
		Pronouns: pronouns,
	}
}

func makeTestMaintainer(name, handle string) SafeMaintainer {
	return SafeMaintainer{
		Name:   name,
		Handle: handle,
	}
}

func TestCategoryBalancedPick_MixedCategories(t *testing.T) {
	ambassadors := make([]SafePerson, 10)
	for i := range ambassadors {
		ambassadors[i] = makeTestPerson("Ambassador"+string(rune('A'+i)), "amb"+string(rune('a'+i)), []string{"Ambassadors"}, "")
	}
	kubestronauts := make([]SafePerson, 20)
	for i := range kubestronauts {
		kubestronauts[i] = makeTestPerson("Kube"+string(rune('A'+i)), "kube"+string(rune('a'+i)), []string{"Kubestronaut"}, "")
	}
	maintainers := make([]SafeMaintainer, 10)
	for i := range maintainers {
		maintainers[i] = makeTestMaintainer("Maintainer"+string(rune('A'+i)), "maint"+string(rune('a'+i)))
	}

	result := categoryBalancedPick(ambassadors, kubestronauts, maintainers, 8)
	if len(result) != 8 {
		t.Fatalf("expected 8 results, got %d", len(result))
	}

	ambassadorFound := false
	for _, p := range result {
		for _, cat := range p.Category {
			if cat == "Ambassadors" {
				ambassadorFound = true
			}
		}
	}
	if !ambassadorFound {
		t.Error("expected at least one Ambassador in Everyone rotation, found none")
	}

	kubeFound := false
	for _, p := range result {
		for _, cat := range p.Category {
			if cat == "Kubestronaut" {
				kubeFound = true
			}
		}
	}
	if !kubeFound {
		t.Error("expected at least one Kubestronaut in Everyone rotation, found none")
	}

	maintainerFound := false
	for _, p := range result {
		for _, cat := range p.Category {
			if cat == "Maintainer" {
				maintainerFound = true
			}
		}
	}
	if !maintainerFound {
		t.Error("expected at least one Maintainer in Everyone rotation, found none")
	}
}

func TestCategoryBalancedPick_NoDuplicates(t *testing.T) {
	alice := makeTestPerson("Alice", "alice", []string{"Ambassadors", "Kubestronaut"}, "she/her")
	ambassadors := []SafePerson{alice}
	for i := 0; i < 5; i++ {
		ambassadors = append(ambassadors, makeTestPerson("Amb"+string(rune('B'+i)), "amb"+string(rune('b'+i)), []string{"Ambassadors"}, ""))
	}
	kubestronauts := []SafePerson{alice}
	for i := 0; i < 15; i++ {
		kubestronauts = append(kubestronauts, makeTestPerson("Kube"+string(rune('A'+i)), "kube"+string(rune('a'+i)), []string{"Kubestronaut"}, ""))
	}
	maintainers := make([]SafeMaintainer, 5)
	for i := range maintainers {
		maintainers[i] = makeTestMaintainer("Maint"+string(rune('A'+i)), "maint"+string(rune('a'+i)))
	}

	result := categoryBalancedPick(ambassadors, kubestronauts, maintainers, 8)

	seen := make(map[string]int)
	for _, p := range result {
		seen[p.Handle]++
	}
	for handle, count := range seen {
		if count > 1 {
			t.Errorf("handle %q appears %d times in result (expected 1)", handle, count)
		}
	}
}

func TestWriteLeadershipRoles_WritesAllSections(t *testing.T) {
	dir := t.TempDir()

	people := []RawPerson{
		{Name: "Alice Chair", GitHub: "https://github.com/alicechair", Category: []string{"Technical Oversight Committee"}, TOCRole: "Chair"},
		{Name: "Bob Member", GitHub: "https://github.com/bobmember", Category: []string{"End User TAB"}, TABRole: "Member"},
		{Name: "Carol GB", GitHub: "https://github.com/carolgb", Category: []string{"Governing Board"}, GBRole: "Vice Chair"},
		{Name: "Dana Marketing", GitHub: "https://github.com/danamarketing", Category: []string{"Marketing Committee"}},
	}

	if err := WriteLeadershipRoles(dir, people); err != nil {
		t.Fatalf("WriteLeadershipRoles: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "leadership-roles.json"))
	if err != nil {
		t.Fatalf("leadership-roles.json not created: %v", err)
	}

	var roles LeadershipRoles
	if err := json.Unmarshal(data, &roles); err != nil {
		t.Fatalf("unmarshal leadership-roles.json: %v", err)
	}

	if len(roles.TOC) != 1 || roles.TOC[0].Name != "Alice Chair" {
		t.Errorf("TOC: expected Alice Chair, got %v", roles.TOC)
	}
	if len(roles.TAB) != 1 || roles.TAB[0].Name != "Bob Member" {
		t.Errorf("TAB: expected Bob Member, got %v", roles.TAB)
	}
	if len(roles.GB) != 1 || roles.GB[0].Name != "Carol GB" {
		t.Errorf("GB: expected Carol GB, got %v", roles.GB)
	}
	if len(roles.Marketing) != 1 || roles.Marketing[0].Name != "Dana Marketing" {
		t.Errorf("Marketing: expected Dana Marketing, got %v", roles.Marketing)
	}
}

func TestWriteLeadershipRoles_EmptyPeopleProducesEmptySections(t *testing.T) {
	dir := t.TempDir()

	if err := WriteLeadershipRoles(dir, nil); err != nil {
		t.Fatalf("WriteLeadershipRoles: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "leadership-roles.json"))
	if err != nil {
		t.Fatalf("leadership-roles.json not created: %v", err)
	}

	var roles LeadershipRoles
	if err := json.Unmarshal(data, &roles); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(roles.TOC)+len(roles.TAB)+len(roles.GB)+len(roles.Marketing) != 0 {
		t.Errorf("expected all sections empty, got %+v", roles)
	}
}

// TestWriteLeadershipRoles_ImageURLPreservedForMembersWithNoHandle verifies that
// imageUrl is written to leadership-roles.json so that the deploy sync does not
// wipe photos for TAB/TOC/GB members who have no GitHub handle.
// Regression: LeadershipEntry had no ImageURL field — every sync produced
// entries with empty imageUrl, causing hero photo placeholders on /people/.
func TestWriteLeadershipRoles_ImageURLPreservedForMembersWithNoHandle(t *testing.T) {
	dir := t.TempDir()

	people := []RawPerson{
		// Member with image but no GitHub handle — the broken case
		{Name: "Katie Gamanji", Image: "katie-gamanji.jpg", Category: []string{"End User TAB"}, TABRole: "Member"},
		// Member with both handle and image — image should still be written
		{Name: "Alice Chair", GitHub: "https://github.com/alicechair", Image: "alice.jpg", Category: []string{"Technical Oversight Committee"}, TOCRole: "Chair"},
		// Member with handle but no image — imageUrl should be empty
		{Name: "Bob Member", GitHub: "https://github.com/bobmember", Category: []string{"End User TAB"}, TABRole: "Member"},
	}

	if err := WriteLeadershipRoles(dir, people); err != nil {
		t.Fatalf("WriteLeadershipRoles: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "leadership-roles.json"))
	if err != nil {
		t.Fatalf("leadership-roles.json not created: %v", err)
	}

	var roles LeadershipRoles
	if err := json.Unmarshal(data, &roles); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	// Find Katie — no handle, must have imageUrl
	var katie *LeadershipEntry
	for i := range roles.TAB {
		if roles.TAB[i].Name == "Katie Gamanji" {
			katie = &roles.TAB[i]
		}
	}
	if katie == nil {
		t.Fatal("Katie Gamanji not found in TAB")
	}
	wantKatie := ImageBaseURL + "katie-gamanji.jpg"
	if katie.ImageURL != wantKatie {
		t.Errorf("Katie Gamanji imageUrl = %q, want %q", katie.ImageURL, wantKatie)
	}

	// Find Alice — has handle AND image, imageUrl must still be written
	var alice *LeadershipEntry
	for i := range roles.TOC {
		if roles.TOC[i].Name == "Alice Chair" {
			alice = &roles.TOC[i]
		}
	}
	if alice == nil {
		t.Fatal("Alice Chair not found in TOC")
	}
	wantAlice := ImageBaseURL + "alice.jpg"
	if alice.ImageURL != wantAlice {
		t.Errorf("Alice Chair imageUrl = %q, want %q", alice.ImageURL, wantAlice)
	}

	// Find Bob — handle but no image, imageUrl must be empty
	var bob *LeadershipEntry
	for i := range roles.TAB {
		if roles.TAB[i].Name == "Bob Member" {
			bob = &roles.TAB[i]
		}
	}
	if bob == nil {
		t.Fatal("Bob Member not found in TAB")
	}
	if bob.ImageURL != "" {
		t.Errorf("Bob Member imageUrl = %q, want empty", bob.ImageURL)
	}
}
