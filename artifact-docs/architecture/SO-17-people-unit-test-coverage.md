# SO-17: People Library Unit Test Coverage (0% → ≥70%)

## Summary

This document records the architectural decisions and test strategy for SO-17 — bringing
`src/lib/people/` unit test coverage from 0% to ≥70% as required by the SO-4 assessment
(Gap G2, High priority).

**Final result**: 96.47% statements / 90.47% functions — well above the 70% threshold.

---

## Scope

**9 TypeScript modules** in `src/lib/people/`, 713 lines of code:

| Module | Coverage (Stmts) | Test file |
|---|---|---|
| `emeritus-loader.ts` | 100% | `emeritus-loader.test.ts` |
| `feed-loader.ts` | 100% | `feed-loader.test.ts` |
| `keyboard.ts` | 100% | `keyboard.test.ts` |
| `person-renderer.ts` | 100% | `person-renderer.test.ts` |
| `staff-loader.ts` | 100% | `staff-loader.test.ts` |
| `maintainer-loader.ts` | 96.1% | `maintainer-loader.test.ts` |
| `person-lightbox.ts` | 98.76% | `person-lightbox.test.ts` (NEW) |
| `search.ts` | 93.33% | `search.test.ts` |
| `tabs.ts` | 100% | `tabs.test.ts` |
| `hero-confetti.ts` | 82.53% | `hero-confetti.test.ts` |

---

## Test Architecture Decisions

### 1. No real network calls (AC#4)
All loaders use `globalThis.fetch` mock via `vi.fn()`. Tests that exercise the fetch path
always call `vi.resetModules()` before re-importing to get a fresh module state.

### 2. DOM state isolation
Each test suite that manipulates `document.body` uses `beforeEach`/`afterEach` to reset
`document.body.innerHTML = ''` and clear `document.documentElement.dataset`.

### 3. IntersectionObserver mock
`initMaintainerLoader` uses `new IntersectionObserver(...)`. jsdom does not provide this.
We polyfill it as a `class MockIntersectionObserver` (not `vi.fn().mockImplementation(...)`)
because `new SomeClass()` requires a proper constructor, not a plain function.

### 4. canvas-confetti mock
`hero-confetti.ts` imports `canvas-confetti` at module load. The entire module is mocked
via `vi.mock('canvas-confetti', ...)` before the test file imports the production code.
The `Image` global is also replaced with a synchronous stub that immediately triggers `onerror`.

### 5. person-lightbox.ts — pure function vs DOM test split
- Pure HTML renderer functions (`renderProjectChip`, `renderSocialLinks`, `renderStatsRow`,
  `renderPersonLightboxContent`) are tested by string inspection.
- DOM integration functions (`openPersonLightbox`, `closePersonLightbox`, `initPersonLightbox`)
  use `document.createElement('dialog')` with `showModal`/`close` spied via `vi.fn()`.

### 6. initTabs() — DOMContentLoaded pattern
`initTabs()` registers its logic inside a `DOMContentLoaded` event listener. Tests call
`initTabs()` then manually dispatch `document.dispatchEvent(new Event('DOMContentLoaded'))`.

---

## Coverage Thresholds

`vitest.config.ts` → `test.coverage.thresholds`:
```ts
thresholds: {
  statements: 70,
  functions: 70,
}
```
These gate CI: `npx vitest run --coverage` exits non-zero if below threshold.

---

## Acceptance Criteria Status

| AC | Status |
|---|---|
| AC#1: tests/unit/people/ with files for all 9 modules | ✅ |
| AC#2: person-renderer.ts covers normal/missing/XSS | ✅ 100% stmts |
| AC#3: staff-loader.ts covers filtering / output shape | ✅ 100% stmts |
| AC#4: vitest.config.ts has thresholds (stmts:70, funcs:70) | ✅ |
| AC#5: ≥70% statement coverage for src/lib/people/** | ✅ 96.47% |
| AC#6: All pre-existing tests still pass | ✅ 695/695 |
