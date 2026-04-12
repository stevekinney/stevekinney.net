#!/bin/sh
set -e

# Collect staged files
STAGED_FILES="$(git diff --cached --name-only)"
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files; skipping repository guards."
  exit 0
fi

# Sync images if any image files were added or modified
IMAGE_FILES="$(git diff --cached --name-only --diff-filter=ACMRTUXB -- '*.png' '*.jpg' '*.jpeg' '*.gif' '*.svg' '*.webp' '*.avif' '*.mp4' '*.webm' | grep -E '^(writing|courses|content)/' || true)"
if [ -n "$IMAGE_FILES" ]; then
  if ! git diff --quiet -- image-manifest.json; then
    echo "image-manifest.json has unstaged changes."
    echo "Stage or discard them before committing images."
    exit 1
  fi

  echo "New or modified images detected - syncing to Vercel Blob..."
  bun images:sync
  git add image-manifest.json
fi

# Verify every course workspace is listed in the website's package.json
COURSE_OR_WEBSITE_PKG="$(git diff --cached --name-only --diff-filter=ACMRTUXB -- 'courses/*/package.json' 'applications/website/package.json')"
if [ -n "$COURSE_OR_WEBSITE_PKG" ]; then
  echo "Checking course workspace dependencies..."
  bun run packages/scripts/validate-workspace-dependencies.ts
fi

# Validate the full course registration chain on every commit, regardless of
# what's staged. The previous staged-file gating is what allowed the
# self-testing-ai-agents course to land with no README, no package.json, and
# no website workspace dep - every check was opt-in by file pattern, so a
# directory with none of the triggering files slipped past silently. This
# unconditional run guarantees that every courses/<slug>/ directory has its
# full registration chain intact before any commit lands.
echo "Validating course registry..."
bun run packages/scripts/validate-course-registry.ts
