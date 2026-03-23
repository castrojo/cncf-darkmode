# CNCF Darkmode — Unified Trilogy

npm workspaces monorepo unifying three CNCF websites under one architecture with dark mode support.

| Site | URL | Port |
|------|-----|------|
| Projects | `/cncf-darkmode/` | 4322 |
| End Users | `/cncf-darkmode/endusers-website/` | 4324 |
| People | `/cncf-darkmode/people-website/` | 4323 (gated) |

## First-Time Setup

```bash
# 1. Install dependencies
just install

# 2. Bootstrap data (required — fetches from landscape.cncf.io)
just sync-projects   # populates sites/projects/src/data/projects.json
just sync-endusers   # populates sites/endusers/src/data/members.json

# 3. Start dev server
just dev-projects    # http://localhost:4322
just dev-endusers    # http://localhost:4324
```

> **Note**: `sync-projects` and `sync-endusers` require network access to `landscape.cncf.io`.
> Set `GITHUB_TOKEN` for enriched data (forks, contributors, last commit dates).
> Without syncing first, the projects site shows no content and search is non-functional.

## Common Commands

```bash
just install          # npm install (all workspaces)
just build-kit        # build @cncf/site-kit
just build-all        # build all sites
just test-all         # run all unit tests
just sync-all         # sync both projects and endusers data
just verify           # smoke check workspace
```

## Architecture

- `packages/site-kit` — shared platform (`@cncf/site-kit`): ThemeToggle, SiteSwitcher, KeyboardHelp, InfoBox, KubeConBanner
- `sites/projects` — CNCF Projects site (port 4322, base: `/cncf-darkmode`)
- `sites/endusers` — CNCF End Users site (port 4324, base: `/cncf-darkmode/endusers-website`)
- `go/` — Go data sync backend (three independent binaries sharing `internal/common/`)

## How Data Serving Works

The Go sync writes JSON data to `sites/*/src/data/`. At build time, Astro reads these
files server-side (for stats, categories). For client-side dynamic rendering (search,
card grids, archived timeline), the data must also be in `public/data/` so Astro emits
it as a static asset.

The `deploy.yml` workflow handles this automatically:
```
sync → cp src/data/*.json → public/data/ → astro build → deploy
```

For local dev, Astro's dev server can serve files from `src/` directly when imported,
but the client-side `fetch()` calls also need the data in `public/data/`. Copy them
manually if needed:
```bash
mkdir -p sites/projects/public/data
cp sites/projects/src/data/projects.json sites/projects/public/data/
cp sites/projects/src/data/changelog.json sites/projects/public/data/
```

## People Site (Gated)

Phase 5 (people site) is gated on 7 pre-migration gates. Do not start until all gates pass.
