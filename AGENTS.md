# cncf-darkmode — Agent Runbook

## What This Repo Is

npm workspaces monorepo unifying three CNCF websites under one architecture:
- `packages/site-kit` — shared platform (`@cncf/site-kit`)
- `sites/projects` — CNCF Projects (port 4322, base: /projects-website)
- `sites/endusers` — CNCF End Users (port 4324, base: /endusers-website)
- `sites/people` — CNCF People (port 4323, base: /people-website) [Phase 5, gated]
- `go/` — Go backend (three independent sync binaries)

## Implementation Plan

Full plan: `~/.copilot/session-state/8f34a56e-599e-4e2d-870a-19cdf92034c1/plan.md`

Phases: 0(bootstrap) → 1(site-kit) → 2(Go) → 3(projects) → 4(endusers) → 5(people, gated) → 6(CI/CD) → 7(cross-site) → 8(deprecation)

## Key Rules

1. **Architecture**: npm workspaces, NOT a single Astro app. Each site has its own `astro.config.mjs` with its own `base` path.
2. **Go**: Three independent binaries (`sync-projects`, `sync-endusers`, `sync-people`). Shared library in `go/internal/common/`. Differ/writer logic stays per-site.
3. **People**: Gated on 7 pre-migration gates. Do NOT start Phase 5 until all gates pass.
4. **Tests**: 67 unit tests in site-kit. 850+ total target. Use `tests/fixtures/` seed data, never live API in E2E.
5. **localStorage**: All keys must use `cncf-{site}-tab` prefix. People's old bare `active-tab` must be migrated.
6. **Search**: People uses async lazy-load (3.5MB). Do NOT move to build-time.
7. **Keyboard**: Add `e.isComposing` guard for CJK/IME users.
8. **Search XSS**: HTML-escape all search results before innerHTML insertion.

## Port Numbers

| Site | Dev Port | Base Path |
|------|----------|-----------|
| projects | 4322 | /projects-website |
| people | 4323 | /people-website |
| endusers | 4324 | /endusers-website |

## Commands

```bash
just install          # npm install
just build-kit        # build @cncf/site-kit
just build-projects   # build projects site
just test-kit         # run site-kit unit tests
just test-all         # run all tests
just dev-projects     # dev server for projects (port 4322)
just verify           # smoke check workspace
just sync-projects    # run Go sync for projects
```

## Source Repos (read-only reference)

- `~/src/projects-website` — current canonical projects site (branch: master)
- `~/src/endusers-website` — current canonical endusers site
- `~/src/people-website` — current canonical people site

## Review Findings to Remember

- Byte-identical JSON is impossible (UUIDs + timestamps). Use structural equivalence.
- Endusers tabs: Everyone, Platinum, Gold, Silver, Academic+Nonprofit, Reference Architectures (no "End Users" tab)
- People keyboard.ts is only 27 lines; actual shortcuts inline in index.astro:1249-1316
- CSS guards in css-guard.test.ts are string-based regex (not computed-style). Keep but don't trust alone.
