package endusers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/biter777/countries"
)

const fullJSONURL = "https://landscape.cncf.io/data/full.json"

// LandscapeFetchResult holds the result of a landscape fetch
type LandscapeFetchResult struct {
	Members  []SafeMember
	Dataset  FullDataset
	ETag     string
	Modified bool
}

// FetchMembers fetches CNCF end-user members from the landscape full.json
func FetchMembers(prevETag string) (*LandscapeFetchResult, error) {
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
		return &LandscapeFetchResult{ETag: prevETag, Modified: false}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var dataset FullDataset
	if err := json.Unmarshal(body, &dataset); err != nil {
		return nil, fmt.Errorf("parsing full.json: %w", err)
	}

	members := filterAndConvert(dataset)
	return &LandscapeFetchResult{Members: members, Dataset: dataset, ETag: resp.Header.Get("ETag"), Modified: true}, nil
}

func countryFlag(countryName string) string {
	if countryName == "" {
		return ""
	}
	c := countries.ByName(countryName)
	if c == countries.Unknown {
		return ""
	}
	return c.Emoji()
}

func filterAndConvert(dataset FullDataset) []SafeMember {
	var members []SafeMember
	for _, item := range dataset.Items {
		if item.Category != "CNCF Members" {
			continue
		}
		if !item.EndUser {
			continue
		}
		m := toSafeMember(item, dataset.CrunchbaseData)
		members = append(members, m)
	}
	return members
}

func toSafeMember(item FullItem, cbData map[string]CrunchbaseItem) SafeMember {
	tier := NormalizeTier(item.MemberSubcategory)
	if tier == "" {
		tier = NormalizeTier(item.Subcategory)
	}

	m := SafeMember{
		Name:        item.Name,
		Slug:        Slugify(item.Name),
		HomepageURL: item.HomepageURL,
		LogoURL:     LogoFullURL(item.LogoURL),
		Tier:        tier,
		IsEndUser:   item.EndUser,
		JoinedAt:    item.JoinedAt,
		TwitterURL:  item.TwitterURL,
	}

	if item.CrunchbaseURL != "" {
		if cb, ok := cbData[item.CrunchbaseURL]; ok {
			m.Description = cb.Description
			m.City = cb.City
			m.Country = cb.Country
			m.CountryFlag = countryFlag(cb.Country)
			m.Region = cb.Region
			m.CompanyType = cb.CompanyType
			m.EmployeesMin = cb.NumEmployeesMin
			m.EmployeesMax = cb.NumEmployeesMax
			m.TotalFunding = cb.Funding
			m.Industries = cb.Categories
			m.LinkedInURL = cb.LinkedInURL
			if cb.TwitterURL != "" {
				m.TwitterURL = cb.TwitterURL
			}
			m.StockExchange = cb.StockExchange
			m.Ticker = cb.Ticker
		}
	}

	return m
}
