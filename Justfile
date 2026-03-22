# cncf-darkmode — Unified CNCF Trilogy
# Run `just` to see available recipes

default:
    @just --list

# Install all dependencies
install:
    npm install

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
    npm run dev --workspace=sites/projects

# Dev server: endusers (port 4324)
dev-endusers:
    npm run dev --workspace=sites/endusers

# Sync projects data (Go backend)
sync-projects:
    cd go && go run ./cmd/sync-projects/

# Sync endusers data (Go backend)
sync-endusers:
    cd go && go run ./cmd/sync-endusers/

# Sync all data
sync-all: sync-projects sync-endusers

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
