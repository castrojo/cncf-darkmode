set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

install:
    npm install

dev:
    npm run dev

build:
    npm run build

test:
    npm run test
    cd go && go test -race ./...

test-e2e:
    npm run test:e2e

sync: sync-projects sync-endusers sync-people
    @just copy-data-to-public

push:
    just verify
    git add -A
    git commit -m "chore: update"
    git push

[private]
sync-projects:
    cd go && go run ./cmd/sync-projects/

[private]
sync-endusers:
    cd go && go run ./cmd/sync-endusers/

[private]
sync-people:
    cd go && go run ./cmd/sync-people/

[private]
copy-data-to-public:
    @mkdir -p public/data/projects public/data/members public/data/people
    @cp src/data/projects/projects.json public/data/projects/ 2>/dev/null || true
    @cp src/data/projects/changelog.json public/data/projects/ 2>/dev/null || true
    @cp src/data/members/members.json public/data/members/ 2>/dev/null || true
    @cp src/data/members/changelog.json public/data/members/ 2>/dev/null || true
    @cp src/data/members/architectures.json public/data/members/ 2>/dev/null || true
    @cp src/data/people/people-index.json public/data/people/ 2>/dev/null || true
    @cp src/data/people/heroes.json public/data/people/ 2>/dev/null || true
    @cp src/data/people/changelog.json public/data/people/ 2>/dev/null || true

[private]
verify:
    @echo "Checking Go..."
    @cd go && go build ./... && echo "Go: OK" || echo "Go: FAIL"
