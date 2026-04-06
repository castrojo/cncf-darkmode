# cncf-darkmode — Agent Runbook

## Canonical Scope

Work only in this repository (`cncf-darkmode`) for the unified site.

**Deprecated for this initiative:** `projects-website`, `endusers-website`, `people-website`.
Do not plan, test, or implement changes in those repos for darkmode work.

## Product Model

This is one unified product with shared platform code:

- `packages/site-kit` — shared components/lib/styles
- `sites/projects` — Projects section (`/cncf-darkmode/`, dev 4322)
- `sites/endusers` — Members section (`/cncf-darkmode/members/`, dev 4324)
- `go/` — sync binaries and shared data pipeline code

## Core Rules

1. Treat the app as one site with multiple sections, not separate websites.
2. Keep navigation and header behavior consistent across sections.
3. Prefer behavior-level tests for critical UX over shallow visibility checks.
4. Keep data contracts strict (`schema.test.ts`) and avoid silent fallbacks.
5. Preserve XSS/IME safeguards already in place (`escapeHtml`, `e.isComposing`).

## Primary Commands

```bash
just install
just sync
just build
just test
just test-cross-site
just dev-all
```

## Validation Focus

Critical cross-section behavior is enforced by:

- `tests/cross-site/header-geometry.spec.ts`
- `tests/cross-site/search-contract.spec.ts`
- `tests/cross-site/shared-behaviors.spec.ts`

Keep these aligned with real user workflows and unified-site navigation contracts.
