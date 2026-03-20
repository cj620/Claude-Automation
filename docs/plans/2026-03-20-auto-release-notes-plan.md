# Auto Release Notes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically generate categorized Release Notes from Conventional Commits when a tag is pushed.

**Architecture:** Add a `release-notes` job to the existing `release.yml` workflow. This job runs on `ubuntu-latest` (fast, cheap), fetches commit log between previous and current tag, classifies by prefix (`feat:`, `fix:`, etc.), and updates the GitHub Release body via API.

**Tech Stack:** GitHub Actions, bash script, GitHub REST API (`gh` CLI)

---

### Task 1: Add `release-notes` job to workflow

**Files:**
- Modify: `.github/workflows/release.yml`

**Step 1: Add the `release-notes` job after the existing `release` job**

Add this new job to `.github/workflows/release.yml`. It must:
- Run on `ubuntu-latest` (no need for matrix — this is text processing)
- Fetch full git history (`fetch-depth: 0`) to access tags
- Use a bash script to parse commits and generate notes
- Update the GitHub Release via `gh release edit`

Replace the entire file with:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - run: npm ci

      - name: Build & Publish (Windows)
        if: matrix.os == 'windows-latest'
        run: npm run build && npx electron-builder --win --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Publish (macOS)
        if: matrix.os == 'macos-latest'
        run: npm run build && npx electron-builder --mac --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_IDENTITY_AUTO_DISCOVERY: false

  release-notes:
    runs-on: ubuntu-latest
    needs: release
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Release Notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Get current and previous tags
          CURRENT_TAG="${GITHUB_REF_NAME}"
          PREVIOUS_TAG=$(git describe --tags --abbrev=0 "${CURRENT_TAG}^" 2>/dev/null || echo "")

          # Get commit log between tags (or all commits if no previous tag)
          if [ -z "$PREVIOUS_TAG" ]; then
            COMMITS=$(git log --pretty=format:"%s" "${CURRENT_TAG}")
          else
            COMMITS=$(git log --pretty=format:"%s" "${PREVIOUS_TAG}..${CURRENT_TAG}")
          fi

          # Classify commits by conventional commit prefix
          FEATURES=""
          FIXES=""
          MAINTENANCE=""
          OTHER=""

          while IFS= read -r msg; do
            # Skip empty lines and version-only commits (e.g. "0.3.0")
            [ -z "$msg" ] && continue
            echo "$msg" | grep -qE '^[0-9]+\.[0-9]+' && continue

            # Strip prefix for display: "feat(scope): message" -> "message"
            CLEAN=$(echo "$msg" | sed -E 's/^[a-z]+(\([^)]*\))?:\s*//')

            if echo "$msg" | grep -qE '^feat(\(|:)'; then
              FEATURES="${FEATURES}- ${CLEAN}\n"
            elif echo "$msg" | grep -qE '^fix(\(|:)'; then
              FIXES="${FIXES}- ${CLEAN}\n"
            elif echo "$msg" | grep -qE '^(chore|ci|docs|refactor|style|perf|build)(\(|:)'; then
              MAINTENANCE="${MAINTENANCE}- ${CLEAN}\n"
            else
              OTHER="${OTHER}- ${msg}\n"
            fi
          done <<< "$COMMITS"

          # Build release notes markdown
          NOTES=""
          [ -n "$FEATURES" ] && NOTES="${NOTES}## 🚀 New Features\n${FEATURES}\n"
          [ -n "$FIXES" ] && NOTES="${NOTES}## 🐛 Bug Fixes\n${FIXES}\n"
          [ -n "$MAINTENANCE" ] && NOTES="${NOTES}## 🔧 Maintenance\n${MAINTENANCE}\n"
          [ -n "$OTHER" ] && NOTES="${NOTES}## 📦 Other Changes\n${OTHER}\n"

          # Fallback if no categorizable commits
          if [ -z "$NOTES" ]; then
            NOTES="No notable changes in this release."
          fi

          # Write to file for gh CLI
          echo -e "$NOTES" > release_notes.md

          echo "=== Generated Release Notes ==="
          cat release_notes.md

          # Update the GitHub Release body
          gh release edit "$CURRENT_TAG" --notes-file release_notes.md
```

**Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat(ci): add auto-generated release notes from conventional commits"
```

---

### Task 2: Test with a new tag

**Step 1: Push the commit**

```bash
git push origin master
```

**Step 2: Create and push a test tag**

```bash
npm version patch
git push origin master --tags
```

**Step 3: Verify on GitHub**

1. Go to GitHub Actions page — check that both `release` and `release-notes` jobs run
2. Go to Releases page — verify the release body contains categorized notes

---

### Task 3: Clean up test release (if needed)

If the test release looks good, no cleanup needed. If not, debug from the Actions log and iterate on the script in Task 1.
