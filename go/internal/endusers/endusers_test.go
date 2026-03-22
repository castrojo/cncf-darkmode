package endusers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// --- differ_test ---

func marshalMembers(t *testing.T, members []SafeMember) []byte {
	t.Helper()
	b, err := json.Marshal(members)
	if err != nil {
		t.Fatalf("marshal members: %v", err)
	}
	return b
}

func TestDiff_NoChanges(t *testing.T) {
	cases := []struct {
		name    string
		members []SafeMember
	}{
		{
			name:    "empty state",
			members: []SafeMember{},
		},
		{
			name: "single member unchanged",
			members: []SafeMember{
				{Name: "Google", Slug: "google", Tier: "Platinum", JoinedAt: "2016-01-01"},
			},
		},
		{
			name: "multiple members unchanged",
			members: []SafeMember{
				{Name: "Google", Slug: "google", Tier: "Platinum"},
				{Name: "Acme Corp", Slug: "acme-corp", Tier: "Silver"},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			prev := marshalMembers(t, tc.members)
			events, _ := Diff(prev, tc.members)
			if len(events) != 0 {
				t.Errorf("expected 0 events, got %d: %+v", len(events), events)
			}
		})
	}
}

func TestDiff_MemberAdded(t *testing.T) {
	cases := []struct {
		name     string
		curr     SafeMember
		wantType string
	}{
		{
			name:     "new platinum member",
			curr:     SafeMember{Name: "Google", Slug: "google", Tier: "Platinum"},
			wantType: "joined",
		},
		{
			name:     "new silver member",
			curr:     SafeMember{Name: "Acme Corp", Slug: "acme-corp", Tier: "Silver"},
			wantType: "joined",
		},
		{
			name:     "new end user member",
			curr:     SafeMember{Name: "Spotify", Slug: "spotify", Tier: "End User", IsEndUser: true},
			wantType: "joined",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			events, _ := Diff([]byte("[]"), []SafeMember{tc.curr})
			if len(events) != 1 {
				t.Fatalf("expected 1 event, got %d", len(events))
			}
			if events[0].Type != tc.wantType {
				t.Errorf("event type = %q, want %q", events[0].Type, tc.wantType)
			}
			if events[0].MemberSlug != tc.curr.Slug {
				t.Errorf("slug = %q, want %q", events[0].MemberSlug, tc.curr.Slug)
			}
			if events[0].ID == "" {
				t.Error("event ID must not be empty")
			}
			if events[0].Tier != tc.curr.Tier {
				t.Errorf("tier = %q, want %q", events[0].Tier, tc.curr.Tier)
			}
		})
	}
}

func TestDiff_TierChanged(t *testing.T) {
	cases := []struct {
		name        string
		prev        SafeMember
		curr        SafeMember
		wantType    string
		wantOldTier string
		wantNewTier string
	}{
		{
			name:        "silver to gold",
			prev:        SafeMember{Name: "Acme Corp", Slug: "acme-corp", Tier: "Silver"},
			curr:        SafeMember{Name: "Acme Corp", Slug: "acme-corp", Tier: "Gold"},
			wantType:    "tier_changed",
			wantOldTier: "Silver",
			wantNewTier: "Gold",
		},
		{
			name:        "gold to platinum",
			prev:        SafeMember{Name: "BigCo", Slug: "bigco", Tier: "Gold"},
			curr:        SafeMember{Name: "BigCo", Slug: "bigco", Tier: "Platinum"},
			wantType:    "tier_changed",
			wantOldTier: "Gold",
			wantNewTier: "Platinum",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			prevJSON := marshalMembers(t, []SafeMember{tc.prev})
			events, _ := Diff(prevJSON, []SafeMember{tc.curr})
			if len(events) != 1 {
				t.Fatalf("expected 1 event, got %d: %+v", len(events), events)
			}
			e := events[0]
			if e.Type != tc.wantType {
				t.Errorf("type = %q, want %q", e.Type, tc.wantType)
			}
			if e.OldTier != tc.wantOldTier {
				t.Errorf("oldTier = %q, want %q", e.OldTier, tc.wantOldTier)
			}
			if e.Tier != tc.wantNewTier {
				t.Errorf("tier = %q, want %q", e.Tier, tc.wantNewTier)
			}
		})
	}
}

// --- fetcher_test ---

func TestFilterAndConvert_OnlyCNCFMembers(t *testing.T) {
	dataset := FullDataset{
		Items: []FullItem{
			{Name: "Acme Corp", Category: "CNCF Members", MemberSubcategory: "Platinum", EndUser: true},
			{Name: "NotAMember", Category: "CNCF Projects"},
			{Name: "Beta Systems", Category: "CNCF Members", MemberSubcategory: "Gold", EndUser: true},
			{Name: "Other Thing", Category: "Serverless"},
		},
		CrunchbaseData: map[string]CrunchbaseItem{},
	}
	got := filterAndConvert(dataset)
	if len(got) != 2 {
		t.Errorf("expected 2 CNCF members, got %d", len(got))
	}
}

func TestFilterAndConvert_ExcludesNonEndUsers(t *testing.T) {
	dataset := FullDataset{
		Items: []FullItem{
			{Name: "Regular Corp", Category: "CNCF Members", MemberSubcategory: "Gold", EndUser: false},
			{Name: "End User Co", Category: "CNCF Members", MemberSubcategory: "Silver", EndUser: true},
		},
		CrunchbaseData: map[string]CrunchbaseItem{},
	}
	got := filterAndConvert(dataset)
	if len(got) != 1 {
		t.Errorf("expected 1 end user member, got %d", len(got))
	}
	if got[0].Name != "End User Co" {
		t.Errorf("expected End User Co, got %s", got[0].Name)
	}
}

func TestToSafeMember_BasicFields(t *testing.T) {
	item := FullItem{
		Name:              "Test Member",
		Category:          "CNCF Members",
		MemberSubcategory: "Silver",
		HomepageURL:       "https://example.com",
	}
	m := toSafeMember(item, nil)
	if m.Name != "Test Member" {
		t.Errorf("expected name 'Test Member', got %q", m.Name)
	}
	if m.Slug == "" {
		t.Error("expected non-empty slug")
	}
	if m.Tier == "" {
		t.Error("expected non-empty tier")
	}
	if m.HomepageURL != "https://example.com" {
		t.Errorf("expected homepage URL, got %q", m.HomepageURL)
	}
}

func TestToSafeMember_CrunchbaseEnrichment(t *testing.T) {
	item := FullItem{
		Name:          "Enriched Corp",
		Category:      "CNCF Members",
		CrunchbaseURL: "https://crunchbase.com/org/enriched",
	}
	cbData := map[string]CrunchbaseItem{
		"https://crunchbase.com/org/enriched": {
			Description: "A great company",
			Country:     "Canada",
			City:        "Toronto",
		},
	}
	m := toSafeMember(item, cbData)
	if m.Description != "A great company" {
		t.Errorf("expected description from crunchbase, got %q", m.Description)
	}
	if m.Country != "Canada" {
		t.Errorf("expected country Canada, got %q", m.Country)
	}
}

// --- models_test ---

func TestSlugify(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Google", "google"},
		{"Red Hat", "red-hat"},
		{"IBM Corp.", "ibm-corp"},
		{"CNCF Inc.", "cncf-inc"},
		{"A & B Systems", "a-b-systems"},
		{"", ""},
		{"Multiple   Spaces", "multiple-spaces"},
		{"123 Numbers", "123-numbers"},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := Slugify(tc.input)
			if got != tc.want {
				t.Errorf("Slugify(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestNormalizeTier(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Platinum", "Platinum"},
		{"platinum member", "Platinum"},
		{"Gold", "Gold"},
		{"gold sponsorship", "Gold"},
		{"Silver", "Silver"},
		{"End User Supporter", "End User"},
		{"end user", "End User"},
		{"Academic Institution", "Academic"},
		{"Nonprofit Organization", "Nonprofit"},
		{"Non-Profit", "Nonprofit"},
		{"", ""},
		{"Unknown Tier", "Unknown Tier"},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := NormalizeTier(tc.input)
			if got != tc.want {
				t.Errorf("NormalizeTier(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

// --- writer_test ---

func TestWriteMembers_ProducesValidJSON(t *testing.T) {
	tmp := t.TempDir()

	members := []SafeMember{
		{Name: "Google", Slug: "google", Tier: "Platinum", JoinedAt: "2016-03-10"},
		{Name: "Acme Corp", Slug: "acme-corp", Tier: "Silver", JoinedAt: "2020-06-01"},
	}

	if err := WriteMembers(tmp, members, nil); err != nil {
		t.Fatalf("WriteMembers: %v", err)
	}

	outPath := filepath.Join(tmp, "members.json")
	data, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var result []SafeMember
	if err := json.Unmarshal(data, &result); err != nil {
		t.Errorf("output is not valid JSON: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 members in output, got %d", len(result))
	}
	raw := string(data)
	if !strings.Contains(raw, "google") {
		t.Error("output JSON does not contain 'google'")
	}
}

func TestWriteMembers_SortsByJoinedAt(t *testing.T) {
	tmp := t.TempDir()

	members := []SafeMember{
		{Name: "Older Corp", Slug: "older-corp", Tier: "Silver", JoinedAt: "2015-01-01"},
		{Name: "Newer Corp", Slug: "newer-corp", Tier: "Gold", JoinedAt: "2023-09-15"},
	}

	if err := WriteMembers(tmp, members, nil); err != nil {
		t.Fatalf("WriteMembers: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(tmp, "members.json"))
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var result []SafeMember
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(result) < 2 {
		t.Fatalf("expected at least 2 results, got %d", len(result))
	}
	if result[0].Slug != "newer-corp" {
		t.Errorf("first member = %q, want %q (should be sorted newest joinedAt first)", result[0].Slug, "newer-corp")
	}
}

func TestWriteChangelog_MergesWithExisting(t *testing.T) {
	tmp := t.TempDir()

	// Write existing changelog
	existing := []Event{
		{ID: "old-id", Type: "joined", MemberName: "Old Member", MemberSlug: "old-member",
			Tier: "Silver", Timestamp: "2020-01-01T00:00:00Z", Description: "old"},
	}
	existingData, _ := json.Marshal(existing)
	_ = os.WriteFile(filepath.Join(tmp, "changelog.json"), existingData, 0644)

	newEvents := []Event{
		{ID: "new-id", Type: "joined", MemberName: "New Member", MemberSlug: "new-member",
			Tier: "Gold", Timestamp: "2024-06-01T00:00:00Z", Description: "new"},
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
	if result[0].MemberSlug != "new-member" {
		t.Errorf("first event slug = %q, want %q (newest first)", result[0].MemberSlug, "new-member")
	}
}
