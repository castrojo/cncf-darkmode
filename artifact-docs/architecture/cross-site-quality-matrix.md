# Cross-Site Quality Matrix — Architecture

**Issue:** SO-54 / GH #15  
**Status:** Implemented  
**Branch:** `feat/SO-54-cross-site-quality-matrix-people`  
**PR:** [#92](https://github.com/castrojo/cncf-darkmode/pull/92)

---

## Overview

The cross-site quality matrix is a Playwright test suite that validates shared behavioral contracts across all sections of the CNCF Landscape application. It was extended in SO-54 to include the **People section** (`/people/`), closing gap **G6** from the SO-4 assessment:

> *"People section excluded from automated a11y testing — high risk given the density of dynamically-rendered person cards, badges, and modal components."*

---

## Site Sections Covered

| Section | URL | Notes |
|---------|-----|-------|
| Projects | `/cncf-darkmode/` | Main site, card-filter search |
| End Users / Members | `/cncf-darkmode/members/` | Card-filter search |
| **People** | `/cncf-darkmode/people/` | **Added in SO-54** — MiniSearch overlay search |

---

## Test Suite Architecture

### `tests/cross-site/shared-behaviors.spec.ts`

Parametrised tests that each SITE must pass. People is now in the `SITES` array:

| Test | Contract | Applies to |
|------|----------|------------|
| Loads and renders primary content | `main .main-content` visible, `#search-input` visible | All sites |
| Keyboard `/` focuses search input | `#search-input` is focused after `/` press | All sites |
| Keyboard `?` opens help modal; Escape closes it | `#keyboard-help-modal.visible` / not `.visible` | All sites |
| Numeric tab shortcut activates tab 2 | `.section-link[data-tab]` nth(1) has `.active` | All sites |
| Dark mode toggle (`t`) flips `data-theme` and persists | `data-theme` changes; `localStorage.cncf-theme` matches | All sites |
| SiteSwitcher has exactly one active pill | Exactly one `.switcher-pill.active`; exactly two `a.switcher-pill` | All sites |

**Navigation ring tests** (explicit, not parametrised):
- `]` : projects → members → people → projects (wraps)
- `[` : members → projects, people → members, projects → people (wraps)

### `tests/cross-site/header-geometry.spec.ts`

Geometric + structural validation of the shared header across all sections:

| Test | Contract |
|------|----------|
| Logo is 42×42px (±3px) | `boundingBox()` check |
| Site title is single-line (< 40px height) | `boundingBox()` height check |
| SiteSwitcher links to all 3 sections | Text contains Projects, End Users, People |
| SiteSwitcher has exactly one active pill | `.switcher-pill.active` count = 1; active pill text = site name |
| Header does not overflow viewport | `header.width <= viewport.width + 1` |
| ThemeToggle is visible | `#theme-toggle` visible |
| Search input is visible | `#search-input` visible |

**Cross-site consistency (multi-browser):**
- Header height consistent within 5px across all 3 sites
- `.header-left` width ~240px (±10px) across all 3 sites
- `#theme-toggle` X position consistent within 10px across all 3 sites

### `tests/cross-site/search-contract.spec.ts`

Different search UX patterns per section:

| Section | Pattern | Key Selectors |
|---------|---------|---------------|
| Projects | Card-filter (DOM show/hide) | `#cards-container .changelog-event-card` |
| Members | Card-filter (DOM show/hide) | `#members-grid .member-card` |
| **People** | **MiniSearch overlay** | `#search-results-overlay`, `.search-result-item`, `.search-no-results` |

**People-specific overlay contract (6 assertions):**
1. `#search-input` is visible with `aria-label`
2. `#search-results-overlay` is hidden before typing, visible after
3. Results rendered as `.search-result-item` links OR `.search-no-results`
4. Impossible query shows `.search-no-results` with 0 result items
5. `#clear-search-btn` clears input and hides overlay
6. `Escape` dismisses overlay or clears input

### `tests/cross-site/accessibility.spec.ts`

axe-core WCAG 2.1 AA audits for all sections:

| Test | Scope |
|------|-------|
| `{site}: zero accessibility violations` | Parametrised against all 3 sites |
| `people: person cards have accessible name` | Cards in `#timeline-feed .person-card` have non-empty text |
| `people: avatar images have alt attributes` | All `<img>` in person cards have `alt` attribute |
| `people: ThemeToggle has aria-label` | `#theme-toggle` has `aria-label` |
| `people: search input has aria-label` | `#search-input` has `aria-label` |
| `people: keyboard-help modal ARIA` | Modal opens with `?`, visible, closes with `Escape` |

### `tests/cross-site/fixtures-audit.spec.ts`

File-system tests (no browser) validating fixture/seed data integrity:

| Source | Files | Notes |
|--------|-------|-------|
| `tests/fixtures/projects/` | `projects-seed.json` (≥3), `changelog-seed.json` (≥1) | |
| `tests/fixtures/members/` | `members-seed.json` (≥3), `architectures-seed.json` (≥1) | |
| `tests/fixtures/people/` | `changelog-seed.json` (≥1) | Added SO-54 |
| `src/data/people/` | `people-emeritus.json` (≥3, required fields: handle/name/category), `leadership.json` (≥1, required: handle/name/title), `leadership-roles.json`, `memorial.json`, `staff-support.json` | Generated by Go backend |
| `src/data/people/` (build-generated) | `maintainers.json` (≥1), `heroes.json` | Validated when present, skipped gracefully otherwise |

**PII checks:** All fixture files asserted to contain no email addresses.

---

## Design Decisions

### 1. People Added to Parametrised `SITES` Array
People is treated as a first-class peer to Projects and Members in all parametrised loops. No special-casing at the loop level — the same 6 shared behaviors run for all three sites.

### 2. Search Pattern Differentiation
People uses MiniSearch overlay (not card-filter). Tests are therefore **separate named tests** (not parametrised within the card-filter loop) to accurately reflect the different implementation. The *public UX contract* (type → results appear, clear → results hide) is the same, but the DOM contract (selectors) differs.

### 3. SiteSwitcher Active-Pill Contract
Exactly one `.switcher-pill.active` span per page; exactly two `a.switcher-pill` links. This prevents regressions where the pill is rendered twice, or the active state is missing.

### 4. Navigation Ring Coverage
All 6 hops of the navigation ring (`]` and `[` in both directions) are explicitly tested, including wrap-around. This makes the ring contract impossible to silently break.

### 5. People Fixture Location
People fixture data lives in two locations:
- `tests/fixtures/people/changelog-seed.json` — timeline feed seed (like projects changelog)
- `src/data/people/*.json` — generated by Go backend; audited with graceful skip for build-only files

### 6. MiniSearch Debounce Tolerance
People search tests use `waitForTimeout(600ms)` to accommodate MiniSearch debounce + index initialization. Card-filter tests use `waitForTimeout(250ms)` (DOM operation is synchronous after the filter).

---

## Acceptance Criteria Status

| AC | Status | Evidence |
|----|--------|---------|
| AC#1: `tests/cross-site/` includes `/people/` | ✅ | `SITES` arrays in all 4 spec files |
| AC#2: Dark mode, navigation, locale tested across all 4 sections | ✅ | shared-behaviors parametrised loop + nav ring tests |
| AC#3: Tests pass in CI (SO-15 E2E gate) | ✅ | `.github/workflows/ci.yml` critical-path job |
| AC#4: GH #15 referenced in PR | ✅ | PR #92 body: "Closes GH #15" |

---

## Related Issues

| Issue | Relationship |
|-------|-------------|
| SO-4 | Source assessment identifying gap G6 |
| SO-15 | E2E Playwright CI gate (dependency) |
| SO-19 | People a11y testing (concurrent) |
| SO-54 | This issue |
