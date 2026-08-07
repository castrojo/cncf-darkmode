# SO-15: Playwright E2E Smoke Gate — CI Design

## Problem

`ci.yml` previously ran unit tests, type-check, and build — but **no Playwright E2E tests**.
14 E2E spec files and 6 cross-site spec files existed but were manual-only (`just test-e2e`).
Search, keyboard navigation, and dark mode regressions shipped to production as a result (SO-4 Gap G1, High).

## Solution

Added a `playwright-smoke` job to `.github/workflows/ci.yml` that runs after the `build` job,
consuming the pre-built `dist/` artifact via GitHub Actions artifact upload/download.

## CI Job Graph

```
test ──────────────────┐
                       ▼
                     build ──────────────────┐
                                             ▼
test-go (parallel)               playwright-smoke
```

## Job: `playwright-smoke`

| Attribute       | Value |
|----------------|-------|
| Runner         | `ubuntu-latest` |
| Depends on     | `build` (consumes `dist/` artifact) |
| Browser        | Chromium only (speed; ~30% faster than full browser matrix) |
| Server mode    | `astro preview` (serves pre-built static files, no rebuild) |

### Test suites executed

1. **`tests/cross-site/`** — 6 spec files covering all three sections (projects, members, people):
   - `shared-behaviors.spec.ts` — keyboard shortcuts, section loads, navigation between sections
   - `header-geometry.spec.ts` — logo dimensions, title height invariants
   - `search-contract.spec.ts` — search positive/empty/restore contract
   - `accessibility.spec.ts` — axe WCAG 2.x scan
   - `performance.spec.ts` — LCP and load timing
   - `fixtures-audit.spec.ts` — fixture data integrity

2. **`tests/e2e/shared-behaviors.spec.ts`** — site-switcher structural invariants (3 pills, active state, theme toggle presence)

### Excluded from CI smoke gate

- `tests/e2e/verify-prod.spec.ts` — hits live `https://castrojo.github.io/cncf-darkmode` (production-only)
- `tests/e2e/verify-prod-fixes.spec.ts` — same, production-only verification

## Playwright Config Changes

Both `playwright.config.ts` (root) and `tests/cross-site/playwright.config.ts` were updated to use
`astro preview` when `CI=true`, and `astro dev` locally:

```ts
const serverCommand = process.env.CI ? 'npm run preview' : 'npm run dev';
```

`reuseExistingServer: !process.env.CI` is preserved — in CI Playwright starts the preview server itself.

## Wall-Clock Time Impact

| Phase                          | Estimated time |
|-------------------------------|----------------|
| Playwright install (chromium) | ~60s           |
| `astro preview` startup       | ~5s            |
| cross-site suite (6 files)    | ~90s           |
| shared-behaviors.spec.ts      | ~30s           |
| **Total added to CI**         | **~3 min**     |

This is within the <5 min budget specified in the acceptance criteria.
The `playwright-smoke` job runs in parallel with `test-go`, so the critical path
increase is: `build` (already existed) + `playwright-smoke` (~3 min).

## Failure Handling

- Job fails CI if any E2E test fails (Playwright exit code ≠ 0)
- On failure, `playwright-report/` is uploaded as a GitHub Actions artifact (7-day retention)
  for debugging trace and screenshots

## References

- SO-4 Gap G1 assessment
- SO-15 issue description
- `Justfile` targets: `test-e2e`, `test-cross-site`
