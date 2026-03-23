# cncf-darkmode — Unified CNCF Trilogy
# Run `just` to see available recipes

default:
    @just --list

# Install all dependencies
install:
    npm install
    @echo ""
    @echo "✅ Dependencies installed."
    @echo "⚠️  Next step: run 'just sync-all' to populate data (requires network access)."
    @echo "   Without syncing, the projects site shows no content and search is broken."
    @echo ""

# Build shared platform package
build-kit:
    npm run build --workspace=packages/site-kit

# Build projects site
build-projects:
    npm run build --workspace=sites/projects

# Build endusers site
build-endusers:
    npm run build --workspace=sites/endusers

# Build all sites
build-all: build-kit build-projects build-endusers

# Run site-kit unit tests
test-kit:
    npm run test --workspace=packages/site-kit

# Run projects unit tests
test-projects:
    npm run test --workspace=sites/projects

# Run endusers unit tests
test-endusers:
    npm run test --workspace=sites/endusers

# Run all Go tests
test-go:
    cd go && go test -race ./...

# Run all unit tests
test-all: test-kit test-projects test-endusers test-go

# Run projects E2E tests
test-e2e-projects:
    npm run test:e2e --workspace=sites/projects

# Run endusers E2E tests
test-e2e-endusers:
    npm run test:e2e --workspace=sites/endusers

# Run cross-site integration tests (requires both dev servers running)
test-cross-site:
    npx playwright test tests/cross-site/ --config tests/cross-site/playwright.config.ts

# Run performance budget and fixture audit (no servers needed, requires built dist/)
test-perf:
    just build-projects
    just build-endusers
    npx playwright test tests/cross-site/performance.spec.ts tests/cross-site/fixtures-audit.spec.ts --config tests/cross-site/playwright.config.ts

# Dev server: projects (port 4322)
dev-projects:
    @[ -s sites/projects/public/data/projects.json ] || echo "⚠️  Warning: sites/projects/public/data/projects.json is missing or empty. Run 'just sync-all' first."
    npm run dev --workspace=sites/projects

# Dev server: endusers (port 4324)
dev-endusers:
    @[ -s sites/endusers/public/data/members.json ] || echo "⚠️  Warning: sites/endusers/public/data/members.json is missing or empty. Run 'just sync-all' first."
    npm run dev --workspace=sites/endusers

# Sync projects data (Go backend)
sync-projects:
    cd go && go run ./cmd/sync-projects/

# Sync endusers data (Go backend)
sync-endusers:
    cd go && go run ./cmd/sync-endusers/

# Sync all data
sync-all: sync-projects sync-endusers
    @just copy-data-to-public

# Copy synced data to public/ so client-side fetch works in local builds
copy-data-to-public:
    @mkdir -p sites/projects/public/data
    @cp sites/projects/src/data/projects.json sites/projects/public/data/
    @cp sites/projects/src/data/changelog.json sites/projects/public/data/
    @mkdir -p sites/endusers/public/data
    @cp sites/endusers/src/data/members.json sites/endusers/public/data/
    @cp sites/endusers/src/data/changelog.json sites/endusers/public/data/
    @cp sites/endusers/src/data/architectures.json sites/endusers/public/data/
    @echo "✅ Data copied to public/ — client-side fetch will work in dev and builds."

# Verify workspace is wired correctly
verify:
    @echo "Checking npm workspaces..."
    @npm ls --workspaces 2>/dev/null | head -20 || echo "Run: npm install"
    @echo "Checking Go workspace..."
    @cd go && go build ./... && echo "Go: OK" || echo "Go: FAIL"
    @echo "Checking site-kit tests..."
    @npm run test --workspace=packages/site-kit && echo "site-kit: OK" || echo "site-kit: FAIL"
    @echo "Done."

# Lint CI workflow files (requires actionlint)
lint-ci:
    @which actionlint > /dev/null 2>&1 || (echo "actionlint not installed: go install github.com/rhysd/actionlint/cmd/actionlint@latest" && exit 1)
    actionlint .github/workflows/*.yml

# Commit and push (gates: verify, lint-ci if actionlint available)
sync:
    just verify
    @which actionlint > /dev/null 2>&1 && just lint-ci || echo "Skipping actionlint (not installed)"
    git add -A
    git status
