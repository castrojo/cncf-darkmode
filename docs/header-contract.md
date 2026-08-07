# SiteHeader Contract — cncf-darkmode

**Status:** Draft — pending CEO review before SO-51-B begins  
**Last updated:** 2026-04-09  
**Related issues:** SO-51-A (this doc), SO-51-B (shared primitive), SO-15 (E2E smoke gate), SO-19

---

## 1. Overview

The `SiteHeader` is the persistent top-of-page navigation element shared across all three CNCF
trilogy sites (Projects, End Users, People). It provides:

- Site identity (logo + title, home link)
- Cross-site navigation (`SiteSwitcher`)
- Per-site search and secondary nav slot
- Theme toggle and keyboard help

This document defines the canonical contract for the header. All implementations **must** conform
to it. Any deviation requires an explicit amendment here before SO-51-B merges.

### Sites in scope

| Site | Layout file | Status |
|------|-------------|--------|
| CNCF Projects (`/`) | `src/components/ProjectsLayout.astro` → `BaseLayout.astro` | **In scope** |
| CNCF End Users (`/members/`) | `src/components/EndusersLayout.astro` → `BaseLayout.astro` | **In scope** |
| CNCF People (`/people/`) | `src/components/PeopleLayout.astro` (standalone) | **Audit-only** |

**Audit-only** means People currently duplicates the header structure instead of sharing
`BaseLayout`. It must be brought into compliance before SO-51-B is complete, but it is not
a blocker for this contract.

---

## 2. Component API

### 2.1 Props (`BaseLayout.astro`)

| Prop | Type | Required | Default | Purpose |
|------|------|----------|---------|---------|
| `title` | `string` | Yes | — | `<title>` element and SEO |
| `description` | `string` | No | `undefined` | `<meta name="description">` |
| `activeSite` | `'projects' \| 'members' \| 'people'` | Yes | — | Drives `SiteSwitcher` active state |
| `noIndex` | `boolean` | No | `false` | Emits `<meta name="robots" content="noindex">` |
| `siteTitle` | `string` | No | `'CNCF'` | Text content of the `<h1>` |
| `homeHref` | `string` | No | `'/'` | `href` for the home link wrapping the title |
| `tabCount` | `number` | No | `9` | Passed to `KeyboardHelp` for number-key shortcuts |
| `showHelpButton` | `boolean` | No | `true` | Renders the `?` help button in header-actions |

### 2.2 SiteSwitcher props

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `activeSite` | `'projects' \| 'members' \| 'people'` | Yes | Marks the current site active; renders `<span>` (non-link) with `aria-current="page"` |

---

## 3. Slot API

All slots are defined on `BaseLayout`. Consuming layouts fill them via `<Fragment slot="…">` or
inline elements with a `slot="…"` attribute.

| Slot name | Location | Required | Description |
|-----------|----------|----------|-------------|
| `head` | `<head>` | No | Per-site `<link>`, `<meta>` additions (favicons, RSS alternates) |
| `header-nav` | Inside `.nav-group`, after SiteSwitcher | No | Per-site search input and controls |
| `header-actions` | Appended to `.header-actions` | No | Additional icon buttons beyond ThemeToggle and help |
| `section-nav` | Below `.header-inner`, inside `.container` | No | Tab/filter navigation (`<nav class="section-nav">`) |
| `sidebar` | `<aside class="sidebar">` | No | InfoBox, banners, stat panels, filter selects |
| `footer` | After `<main>` | No | Per-site footer content |
| `body-end` | Bottom of `<body>`, after `KeyboardHelp` | No | Modals, embedded JSON data blobs, deferred scripts |
| *(default)* | Inside `.main-content` | No | Primary page content (card grids, etc.) |

### Usage examples

**Search in `header-nav`:**

```astro
<div slot="header-nav" class="search-wrapper">
  <input type="text" id="search-input" class="search-input"
         placeholder="Search projects... (/)"
         aria-label="Search projects" />
  <span class="search-count" id="search-count"></span>
  <button id="search-clear" class="search-clear"
          aria-label="Clear search" title="Clear search">✕</button>
</div>
```

**Tab navigation in `section-nav`:**

```astro
<nav slot="section-nav" class="section-nav" aria-label="Project maturity tabs">
  <button class="section-link active" data-tab="everyone">Everything</button>
  <button class="section-link" data-tab="graduated">Graduated</button>
  …
</nav>
```

---

## 4. CSS Custom Properties

All tokens are defined in `src/styles/variables-base.css` (light) and `[data-theme="dark"]`
overrides. Section-specific tokens live in `src/styles/variables.css`.

### 4.1 Core tokens used by the header

| Variable | Light value | Dark value | Purpose |
|----------|-------------|------------|---------|
| `--color-bg-default` | `#ffffff` | `#0d1117` | Header background, search input bg |
| `--color-bg-secondary` | `#f6f8fa` | `#161b22` | ThemeToggle bg, icon-button hover |
| `--color-bg-tertiary` | `#eaeef2` | `#21262d` | SiteSwitcher pill container bg |
| `--color-border-default` | `#d0d7de` | `#30363d` | Header bottom border, input borders |
| `--color-text-primary` | `#24292f` | `#e6edf3` | Site title, logo alt text fallback |
| `--color-text-secondary` | `#57606a` | `#8b949e` | Nav links, icon buttons, inactive tabs |
| `--color-text-muted` | `#656d76` | `#8b949e` | Search count, clear button |
| `--color-accent-emphasis` | `#0969da` | `#2f81f7` | Active section-link color and underline |
| `--color-cncf-blue` | `#0086ff` | `#58a6ff` | Focus ring on search input |

### 4.2 Logo display tokens

| Rule | Effect |
|------|--------|
| `.cncf-logo-wrapper .logo-light { display: block }` | Light-mode logo visible |
| `.cncf-logo-wrapper .logo-dark { display: none }` | Dark-mode logo hidden |
| `[data-theme="dark"] .logo-light { display: none }` | Swapped in dark mode |
| `[data-theme="dark"] .logo-dark { display: block }` | Dark logo revealed |

### 4.3 SiteSwitcher tokens

| Variable | Fallback | Purpose |
|----------|----------|---------|
| `--color-bg-tertiary` | `#eaeef2` | Pill container background |
| `--color-border-default` | `#d0d7de` | Container border |
| `--color-text-secondary` | `#57606a` | Inactive pill text |
| `--color-text-primary` | `#24292f` | Hovered inactive pill text |
| `--color-bg-default` | `#ffffff` | Hovered inactive pill background |
| *(hardcoded)* | `#0060CC` | Active pill background — CNCF brand blue |
| *(hardcoded)* | `#ffffff` | Active pill text |

> **Note:** The active pill background (`#0060CC`) is intentionally hardcoded — it is the CNCF
> brand color and must not vary with theme. The text contrast ratio on `#0060CC` is ≥ 4.6:1
> (WCAG AA).

---

## 5. DOM Structure

```html
<header class="site-header">
  <div class="container">
    <div class="header-inner">

      <!-- Left: logo + site title -->
      <div class="header-left">
        <div class="logo-title">
          <span class="cncf-logo-wrapper" aria-hidden="true">
            <img src="…/cncf-icon-color.svg" alt="CNCF" class="logo-light" width="42" height="42" />
            <img src="…/cncf-icon-white.svg" alt="CNCF" class="logo-dark"  width="42" height="42" />
          </span>
          <div class="title-block">
            <h1 class="site-title">
              <a href="{homeHref}" class="home-link">{siteTitle}</a>
            </h1>
          </div>
        </div>
      </div>

      <!-- Center: site switcher + per-site nav (search) -->
      <div class="nav-group">
        <SiteSwitcher activeSite="{activeSite}" />
        <!-- slot: header-nav -->
      </div>

      <!-- Right: theme toggle + optional actions -->
      <div class="header-actions">
        <ThemeToggle />
        <!-- button#help-button (when showHelpButton=true) -->
        <!-- slot: header-actions -->
      </div>

    </div>
    <!-- slot: section-nav (optional tab row) -->
  </div>
</header>
```

---

## 6. Geometry Constraints

These are the target invariants for `tests/cross-site/header-geometry.spec.ts`. All constraints
listed below are the intended goals; see the status column for current conformance.

| Constraint | Value | Tolerance | Status |
|------------|-------|-----------|--------|
| Logo size | 42 × 42 px | ± 3 px | Passing |
| Site title height (single-line) | < 40 px | — | Passing |
| `.header-left` width | 240 px | ± 10 px | Passing |
| Header height parity across sites | — | ≤ 5 px diff | Passing |
| `#theme-toggle` X-position parity | — | ≤ 10 px diff | **Unmet** — measured ~10.4 px (tracked) |
| Header width ≤ viewport width | — | + 1 px overflow allowed | Passing |
| `position` of `.site-header` | `sticky` | exact | Passing |

> **Note:** The `#theme-toggle` X-position parity constraint is currently unmet (~10.4 px measured,
> tolerance ≤ 10 px). The enforcing test (`header-geometry.spec.ts` line 129) is failing on both
> `main` and this branch — this is a pre-existing condition, not introduced by this PR.

---

## 7. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `> 768px` | Three-column flex layout: `header-left` (240px fixed) | `nav-group` (flex 1) | `header-actions` (auto) |
| `≤ 768px` | Stack to two rows: row 1 = logo + actions; row 2 = site-switcher + search. `nav-group` moves to `order: 3`, full width. |
| `≤ 640px` | Header `padding` reduced to `1rem 0`; `site-title` font-size reduced to `1.25rem`. |

### Mobile order (≤ 768px)

```
[header-left   order:1] [header-actions   order:2]
[nav-group                              order:3 full-width]
```

The `section-nav` (tab row) always appears below `header-inner` and is horizontally scrollable
with `scrollbar-width: none` to hide the scrollbar on all browsers.

---

## 8. Accessibility Contract

### 8.1 Landmark roles

| Element | Role | Notes |
|---------|------|-------|
| `<header class="site-header">` | `banner` (implicit) | One per page, wraps all header content |
| `<main class="container">` | `main` (implicit) | Content region |
| `<aside class="sidebar">` | `complementary` (implicit) | Sidebar filters/stats |
| `<footer>` | `contentinfo` (implicit) | Page footer |
| `<nav class="site-switcher">` | `navigation` | `aria-label="CNCF Landscape sections"` |
| `<nav class="section-nav">` | `navigation` | `aria-label` **must** describe tabs (e.g., `"Project maturity tabs"`, `"Filter by tier"`) |
| `<div role="dialog">` (KeyboardHelp) | `dialog` | `aria-modal="true"`, `aria-labelledby="help-title"` |

### 8.2 ARIA patterns

| Element | Attribute | Value |
|---------|-----------|-------|
| Active `SiteSwitcher` pill | `aria-current` | `"page"` |
| Inactive pills | `href` present | Link (not button) |
| Logo wrapper `<span>` | `aria-hidden` | `"true"` — decorative; title `<a>` is the accessible label |
| `#theme-toggle` `<button>` | `aria-label` | `"Toggle theme"` |
| `#help-button` `<button>` | `aria-label` | `"Keyboard shortcuts (?)"` |
| Search `<input>` | `aria-label` | Site-specific: `"Search projects"`, `"Search end users"`, `"Search people"` |
| Search clear `<button>` | `aria-label` | `"Clear search"` |
| `#kbd-live-region` `<div>` | `aria-live="polite"` `aria-atomic="true"` | Announces theme changes to screen readers |

### 8.3 Skip navigation

**Current state:** Skip-nav is not yet implemented.  
**Required before SO-51-B:** A visually-hidden, focus-visible skip link must be the first focusable
element inside `<body>`, pointing to `#main-content` (add `id="main-content"` to `<main>`).

```html
<!-- Required addition — not yet present -->
<a href="#main-content" class="skip-nav">Skip to main content</a>
```

```css
.skip-nav {
  position: absolute;
  top: -999px;
  left: 0;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: var(--color-bg-default);
  border: 2px solid var(--color-accent-emphasis);
  border-radius: 4px;
  font-weight: 600;
  text-decoration: none;
  color: var(--color-text-primary);
}
.skip-nav:focus { top: 0.5rem; left: 0.5rem; }
```

### 8.4 Keyboard navigation

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Navigate focus through header controls in DOM order |
| `/` or `s` | Focus search input (global shortcut, fires on any non-input element) |
| `t` | Toggle dark/light theme |
| `?` | Open keyboard shortcuts modal |
| `[` / `]` | Navigate to previous/next site (cycles Projects → End Users → People) |
| `1`–`N` | Jump to section-nav tab N |
| `Esc` | Close modal / blur search |

Focus ring: all interactive elements must use `outline: 2px solid var(--color-cncf-blue)` at
`outline-offset: 2px` (`.keyboard-focused` class is available for JS-managed focus).

### 8.5 Accessibility checklist

- [ ] `<header>` uses implicit `banner` landmark (no explicit `role` needed — do **not** add `role="banner"` to avoid duplication)
- [ ] Logo `<img>` has `alt="CNCF"` — wrapper is `aria-hidden` (decorative), but the alt text is present for fallback
- [ ] Site title `<a>` text is unique per page (not generic "Home")
- [ ] All interactive elements have visible focus indicators
- [ ] `SiteSwitcher` active pill has `aria-current="page"`
- [ ] `section-nav` `<nav>` has a unique, descriptive `aria-label`
- [ ] Search `<input>` has `aria-label` (not placeholder-only)
- [ ] `#kbd-live-region` is present in DOM for theme-change announcements
- [ ] Skip-nav link present (pending — see §8.3)
- [ ] WCAG AA color contrast met: all text at ≥ 4.5:1; large text (≥ 18px bold) at ≥ 3:1
- [ ] Axe WCAG 2.1 AA scan passes with zero violations (`tests/cross-site/accessibility.spec.ts`)
- [ ] `KeyboardHelp` modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap on open, closes on Esc

---

## 9. Conflict register (SO-15, SO-19)

| Issue | Pattern | Resolution |
|-------|---------|------------|
| SO-15 (Playwright E2E smoke gate) | `header-geometry.spec.ts` encodes geometry constants (logo 42px, header-left 240px, height parity) as test assertions | These constants become normative via this contract. Tests **must not** be loosened without amending §6 here first. |
| SO-19 | Pending review — no conflicting patterns identified at time of writing. | Update this table if SO-19 introduces header changes. |

---

## 10. What People (audit-only) diverges from

`PeopleLayout.astro` reimplements the header HTML directly rather than inheriting `BaseLayout`.
The following divergences are tracked but do **not** block SO-51-A approval:

| Item | BaseLayout | PeopleLayout |
|------|------------|--------------|
| Source | `BaseLayout.astro` | `PeopleLayout.astro` (standalone) |
| `section-nav` location | `slot="section-nav"` filled by consumer | Hardcoded directly in layout |
| `showHelpButton` guard | Controlled by prop | Always rendered |
| Footer slot | `slot="footer"` | `<footer class="site-footer">` hardcoded |
| CSS imports | `variables.css` + `layout.css` via BaseLayout | `variables.css` + `layout.css` + `people/people.css` |

Aligning People with this contract is tracked under SO-51-B.
