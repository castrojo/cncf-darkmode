package endusers

import (
	"strings"
	"unicode"
)

// FullDataset is the top-level full.json structure
type FullDataset struct {
	Items          []FullItem                `json:"items"`
	CrunchbaseData map[string]CrunchbaseItem `json:"crunchbase_data"`
}

// FullItem is one landscape item
type FullItem struct {
	Name              string `json:"name"`
	Category          string `json:"category"`
	Subcategory       string `json:"subcategory"`
	MemberSubcategory string `json:"member_subcategory"`
	HomepageURL       string `json:"homepage_url"`
	LogoURL           string `json:"logo"`
	JoinedAt          string `json:"joined_at"`
	EndUser           bool   `json:"enduser"`
	TwitterURL        string `json:"twitter_url"`
	CrunchbaseURL     string `json:"crunchbase_url"`
	// Project maturity level for CNCF projects
	Project string `json:"project,omitempty"`
}

// CrunchbaseItem is the pre-enriched company data
type CrunchbaseItem struct {
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	City            string         `json:"city"`
	Country         string         `json:"country"`
	Region          string         `json:"region"`
	CompanyType     string         `json:"company_type"`
	NumEmployeesMin int            `json:"num_employees_min"`
	NumEmployeesMax int            `json:"num_employees_max"`
	Funding         int64          `json:"funding"`
	FundingRounds   []FundingRound `json:"funding_rounds"`
	Categories      []string       `json:"categories"`
	LinkedInURL     string         `json:"linkedin_url"`
	TwitterURL      string         `json:"twitter_url"`
	StockExchange   string         `json:"stock_exchange"`
	Ticker          string         `json:"ticker"`
}

// FundingRound is a single funding event
type FundingRound struct {
	Amount      int64  `json:"amount"`
	AnnouncedOn string `json:"announced_on"`
	Kind        string `json:"kind"`
}

// SafeMember is the output struct written to members.json
type SafeMember struct {
	Name          string   `json:"name"`
	Slug          string   `json:"slug"`
	Description   string   `json:"description,omitempty"`
	HomepageURL   string   `json:"homepageUrl,omitempty"`
	LogoURL       string   `json:"logoUrl"`
	Tier          string   `json:"tier"`
	IsEndUser     bool     `json:"isEndUser"`
	JoinedAt      string   `json:"joinedAt,omitempty"`
	TwitterURL    string   `json:"twitterUrl,omitempty"`
	LinkedInURL   string   `json:"linkedInUrl,omitempty"`
	City          string   `json:"city,omitempty"`
	Country       string   `json:"country,omitempty"`
	CountryFlag   string   `json:"countryFlag,omitempty"`
	Region        string   `json:"region,omitempty"`
	CompanyType   string   `json:"companyType,omitempty"`
	EmployeesMin  int      `json:"employeesMin,omitempty"`
	EmployeesMax  int      `json:"employeesMax,omitempty"`
	TotalFunding  int64    `json:"totalFunding,omitempty"`
	Industries    []string `json:"industries,omitempty"`
	StockExchange string   `json:"stockExchange,omitempty"`
	Ticker        string   `json:"ticker,omitempty"`
	UpdatedAt     string   `json:"updatedAt"`
}

// Event is a changelog entry
type Event struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // joined|left|tier_changed|updated
	MemberName  string `json:"memberName"`
	MemberSlug  string `json:"memberSlug"`
	LogoURL     string `json:"logoUrl"`
	Tier        string `json:"tier"`
	OldTier     string `json:"oldTier,omitempty"`
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
}

// SafeArchitecture is a CNCF reference architecture entry
type SafeArchitecture struct {
	Slug           string       `json:"slug"`
	Title          string       `json:"title"`
	OrgName        string       `json:"orgName"`
	OrgTeam        string       `json:"orgTeam,omitempty"`
	OrgUrl         string       `json:"orgUrl,omitempty"`
	OrgLogoUrl     string       `json:"orgLogoUrl"`
	OrgDescription string       `json:"orgDescription,omitempty"`
	OrgSize        string       `json:"orgSize,omitempty"`
	UserSize       string       `json:"userSize,omitempty"`
	Industries     []string     `json:"industries,omitempty"`
	Tags           []string     `json:"tags,omitempty"`
	RefArchTypes   []string     `json:"refArchTypes,omitempty"`
	ArchUrl        string       `json:"archUrl"`
	SubmittedAt    string       `json:"submittedAt,omitempty"`
	Projects       []ArchProject `json:"projects,omitempty"`
	BodyHTML       string       `json:"bodyHTML,omitempty"`
}

// ArchProject is a single CNCF project used in the reference architecture
type ArchProject struct {
	Name        string `json:"name"`
	LogoUrl     string `json:"logoUrl,omitempty"`
	Maturity    string `json:"maturity,omitempty"`
	UsingSince  string `json:"usingSince,omitempty"`
	Description string `json:"description,omitempty"`
}

// Slugify converts a name to a URL-safe slug
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

// LogoFullURL returns a fully qualified logo URL
func LogoFullURL(logo string) string {
	if logo == "" {
		return ""
	}
	if strings.HasPrefix(logo, "http") {
		return logo
	}
	return "https://landscape.cncf.io/" + logo
}

// NormalizeTier maps subcategory strings to clean tier names
func NormalizeTier(subcategory string) string {
	sub := strings.ToLower(subcategory)
	switch {
	case strings.Contains(sub, "platinum"):
		return "Platinum"
	case strings.Contains(sub, "gold"):
		return "Gold"
	case strings.Contains(sub, "silver"):
		return "Silver"
	case strings.Contains(sub, "end user"):
		return "End User"
	case strings.Contains(sub, "academic"):
		return "Academic"
	case strings.Contains(sub, "nonprofit"), strings.Contains(sub, "non-profit"):
		return "Nonprofit"
	default:
		return subcategory
	}
}
