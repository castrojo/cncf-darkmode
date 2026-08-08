# Contributing to cncf-darkmode

Thanks for your interest in contributing! This document covers the contributor
workflow for this repository.

## Scope

This repository is the **single source of truth** for the unified CNCF site
(Projects, End Users, and People sections in one Astro project). The
`projects-website`, `endusers-website`, and `people-website` repos are
deprecated for this initiative — please do not open issues or PRs against
them for darkmode/unified-site work. Keep all planning, code, and tests here.

## First-Time Setup

```bash
# 1. Install dependencies
just install

# 2. Bootstrap data (required — fetches from landscape.cncf.io and GitHub)
just sync-projects   # populates src/data/projects/
just sync-endusers   # populates src/data/members/
just sync-people     # populates src/data/people/
# or run all three at once:
just sync

# 3. Start the dev server
just dev              # http://localhost:4321/cncf-darkmode/
```

> **Note:** the sync commands require network access (`landscape.cncf.io` and
> the GitHub API). Set a `GITHUB_TOKEN` environment variable to avoid rate
> limits and to get enriched data (forks, contributors, last commit dates).
> Without syncing first, sections will show no content and search will be
> non-functional.

## How Data Serving Works

The Go sync binaries (`go/cmd/sync-projects`, `sync-endusers`, `sync-people`)
write JSON data to `src/data/`. At build time, Astro reads these files
server-side for stats and category pages. For client-side dynamic rendering
(search, card grids, archived timeline), the data must **also** be copied to
`public/data/` so Astro emits it as a static asset — `just sync` does this
automatically via `copy-data-to-public`. If you edit `src/data/*.json` by
hand during local development, re-run `just copy-data-to-public` (or `just
sync`) before testing client-side behavior.

## Making Changes

1. Fork the repository and create a topic branch off `main`.
2. Read [`AGENTS.md`](AGENTS.md) and [`CONTEXT.md`](CONTEXT.md) before making
   changes — they document the finalized design decisions (fonts, hero
   layout, SiteSwitcher pills), the shared vocabulary used across the site,
   and rules that must not be violated without explicit maintainer sign-off.
3. Keep the app framed as **one site with multiple sections** — avoid
   language or code structure that treats Projects/Members/People as
   separate websites.
4. Preserve existing data-contract strictness (`schema.test.ts`) and XSS/IME
   safeguards (`escapeHtml`, `e.isComposing`) — do not introduce silent
   fallbacks around them.

## Testing

This repo uses **Playwright** for behavioral/visual verification —
**do not** rely on `curl` or reading HTML/source to confirm a rendering or
visual fix; that has previously passed broken production states silently.

```bash
just test              # unit tests (Vitest) + Go tests
just test-e2e           # Playwright end-to-end tests
just test-cross-site    # cross-section navigation/header contract tests
just test-all           # check + test + test-e2e + test-cross-site
just check              # astro check (TypeScript/template validation)
```

Run the full `just test-all` locally before opening a PR. Cross-section
behavior (header geometry, search contract, shared behaviors) is enforced by
tests in `tests/cross-site/` — keep these aligned with real navigation
contracts if you touch shared components.

## Submitting a Pull Request

1. Ensure `just test-all` passes locally.
2. Write a clear PR description: what changed, why, and how it was verified
   (include Playwright output for visual/behavioral changes).
3. Link any related issue (e.g. `Fixes #123`).
4. Keep PRs focused — avoid bundling unrelated changes.

## Questions

Open an issue if something in this guide is unclear or out of date — this
repository is under active development and workflows may evolve.
