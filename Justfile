set shell := ["bash", "-euo", "pipefail", "-c"]

# cncf-darkmode — Unified CNCF Trilogy
# Run `just` to see available recipes

default:
    @just --list

# ── Primary workflow ─────────────────────────────────────────────────────────

# Install all dependencies
install:
    npm install
    @echo ""
    @echo "✅ Dependencies installed."
    @echo "⚠️  Next step: run 'just sync' to populate data (requires network access)."
    @echo "   Without data, the projects site shows no content and search is broken."
    @echo ""

# Build and open in browser for local preview  (site: projects or endusers)
serve site="projects":
    npm run build --workspace=sites/{{site}}
    xdg-open {{if site == "projects" { "http://localhost:4322/projects-website/" } else { "http://localhost:4324/endusers-website/" }}} || true
    npm run preview --workspace=sites/{{site}}

# Hot-reload dev server  (site: projects or endusers)
dev site="projects":
    npm run dev --workspace=sites/{{site}}

# Build all sites
build: build-kit build-projects build-endusers

# Run all unit tests
test: test-kit test-projects test-endusers test-go

# Sync all data from upstream (Go backend — requires network)
sync: sync-projects sync-endusers
    @just copy-data-to-public

# Stage, commit, and push all changes
push:
    just verify
    @which actionlint > /dev/null 2>&1 && actionlint .github/workflows/*.yml || true
    git add -A
    git commit -m "chore: update"
    git push

# Run cross-site integration tests (requires both dev servers on 4322 + 4324)
test-cross-site:
    npx playwright test tests/cross-site/ --config tests/cross-site/playwright.config.ts

# ── Private helpers (callable but not listed) ─────────────────────────────────

[private]
build-kit:
    npm run build --workspace=packages/site-kit

[private]
build-projects:
    npm run build --workspace=sites/projects

[private]
build-endusers:
    npm run build --workspace=sites/endusers

[private]
test-kit:
    npm run test --workspace=packages/site-kit

[private]
test-projects:
    npm run test --workspace=sites/projects

[private]
test-endusers:
    npm run test --workspace=sites/endusers

[private]
test-go:
    cd go && go test -race ./...

[private]
test-e2e-projects:
    npm run test:e2e --workspace=sites/projects

[private]
test-e2e-endusers:
    npm run test:e2e --workspace=sites/endusers

[private]
test-perf:
    just build-projects
    just build-endusers
    npx playwright test tests/cross-site/performance.spec.ts tests/cross-site/fixtures-audit.spec.ts --config tests/cross-site/playwright.config.ts

[private]
dev-projects:
    npm run dev --workspace=sites/projects

[private]
dev-endusers:
    npm run dev --workspace=sites/endusers

[private]
sync-projects:
    cd go && go run ./cmd/sync-projects/

[private]
sync-endusers:
    cd go && go run ./cmd/sync-endusers/

[private]
copy-data-to-public:
    @mkdir -p sites/projects/public/data
    @cp sites/projects/src/data/projects.json sites/projects/public/data/
    @cp sites/projects/src/data/changelog.json sites/projects/public/data/
    @mkdir -p sites/endusers/public/data
    @cp sites/endusers/src/data/members.json sites/endusers/public/data/
    @cp sites/endusers/src/data/changelog.json sites/endusers/public/data/
    @cp sites/endusers/src/data/architectures.json sites/endusers/public/data/
    @echo "✅ Data copied to public/ — client-side fetch will work in dev and builds."

[private]
verify:
    @echo "Checking npm workspaces..."
    @npm ls --workspaces 2>/dev/null | head -20 || echo "Run: npm install"
    @echo "Checking Go workspace..."
    @cd go && go build ./... && echo "Go: OK" || echo "Go: FAIL"
    @echo "Done."
