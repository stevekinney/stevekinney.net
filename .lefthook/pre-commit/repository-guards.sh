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

# Validate the generated-content contract on every commit so route shape,
# frontmatter, slugs, assets, and image references stay coherent regardless
# of which files were staged.
echo "Validating content structure..."
bun run content:validate
