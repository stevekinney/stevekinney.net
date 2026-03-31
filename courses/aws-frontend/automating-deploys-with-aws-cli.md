---
title: 'Automating Deploys with the AWS CLI'
description: >-
  Automate your deployment process using AWS CLI commands for syncing files to S3 and creating CloudFront invalidations.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - cli
  - deployment
  - automation
---

Running two CLI commands after every build is fine for a Saturday afternoon project. It's not fine for a team shipping to production. You want a single command: `./deploy.sh`—build the site, upload the files, invalidate the cache, done. This lesson turns the manual deployment process from [The Full Static Site Pipeline](full-static-pipeline.md) into a repeatable, copy-pasteable deploy script.

## The Two Commands You're Automating

You already know the core operations from [Cache Behaviors and Invalidations](cache-behaviors-and-invalidations.md):

1. **`aws s3 sync`**: Upload your build output to S3, removing files that no longer exist.
2. **`aws cloudfront create-invalidation`**: Tell CloudFront to drop cached copies so edge locations pick up the new files.

The script wraps these with error handling, differentiated cache headers, and status output.

## The Deploy Script

Save this as `deploy.sh` in the root of your project:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
BUCKET="my-frontend-app-assets"
DISTRIBUTION_ID="E1A2B3C4D5E6F7"
REGION="us-east-1"
BUILD_DIR="./build"

# Verify the build directory exists
if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: Build directory '$BUILD_DIR' not found. Run your build command first."
  exit 1
fi

echo "Deploying to s3://$BUCKET from $BUILD_DIR..."

# Step 1: Sync hashed assets with long-lived cache headers
echo "Uploading hashed assets..."
aws s3 sync "$BUILD_DIR/assets" "s3://$BUCKET/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --region "$REGION" \
  --delete \
  --output json
# [!note The `--delete` flag removes old hashed files from S3 that your build no longer produces.]

# Step 2: Upload index.html with a short cache TTL
echo "Uploading index.html..."
aws s3 cp "$BUILD_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "public, max-age=60" \
  --content-type "text/html" \
  --region "$REGION" \
  --output json

# Step 3: Sync everything else (favicon, robots.txt, etc.) with default cache
echo "Uploading remaining files..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET" \
  --exclude "assets/*" \
  --exclude "index.html" \
  --region "$REGION" \
  --delete \
  --output json

# Step 4: Invalidate the CloudFront cache
echo "Creating CloudFront invalidation..."
INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --region "$REGION" \
  --output json)

INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "Invalidation created: $INVALIDATION_ID"

echo "Deploy complete."
```

Make it executable:

```bash
chmod +x deploy.sh
```

Run it:

```bash
./deploy.sh
```

## What the Script Does

The script splits the upload into three phases, each with different `Cache-Control` headers. This is the caching strategy from [Cache Behaviors and Invalidations](cache-behaviors-and-invalidations.md) applied to the deployment process:

1. **Hashed assets** (`/assets/*`): `max-age=31536000, immutable`. These are your bundler's output: `main.a1b2c3.js`, `styles.d4e5f6.css`. The filenames change when the content changes, so they can be cached forever. The `immutable` directive tells browsers not to bother revalidating.

2. **`index.html`**: `max-age=60`. Your entry point must update quickly. Sixty seconds is short enough that users see your latest deploy within a minute, but long enough to absorb traffic spikes.

3. **Everything else**: `favicon.ico`, `robots.txt`, `manifest.json`, and anything else in your build directory. These use S3's default caching behavior.

## The `--delete` Flag

The `--delete` flag on `aws s3 sync` is critical. Without it, every version of every hashed asset accumulates in your bucket. After a few months, you've got thousands of orphaned files: `main.a1b2c3.js`, `main.d4e5f6.js`, `main.g7h8i9.js`, all sitting in S3, all costing you (very little, but still) storage fees.

With `--delete`, `aws s3 sync` compares your local build directory to the bucket and removes anything in the bucket that isn't in the local directory. Old hashed assets get cleaned up automatically.

> [!WARNING]
> The `--delete` flag means your build directory is the source of truth. If your build is incomplete or broken, `--delete` will remove the working files from S3 and replace them with whatever is in your build directory. Always run your build command before deploying. The script checks that the build directory exists, but it can't verify that the build succeeded.

## Selective Invalidation vs. `/*`

The script uses `--paths "/*"` to invalidate everything. This is the simplest approach and works well for most projects. But you have options:

**Full invalidation** (`/*`): Clears every cached object across all edge locations. Counts as one invalidation path. After a `/*` invalidation, the next request for any file is a cache miss.

```bash
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/*" \
  --region us-east-1 \
  --output json
```

**Selective invalidation**: Invalidate only the files that actually changed. More surgical, but requires you to know which files changed.

```bash
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/index.html" "/manifest.json" \
  --region us-east-1 \
  --output json
```

**When to use selective invalidation**: If you're deploying to a high-traffic site and most of your cached content didn't change, selective invalidation avoids a burst of cache misses for files that are still valid. In practice, since your hashed assets have new filenames on every deploy anyway, the only file that truly needs invalidation is `index.html`. The old hashed assets will expire naturally.

> [!TIP]
> For most frontend projects, `/*` is the right choice. The first 1,000 invalidation paths per month are free, and `/*` counts as a single path. You're not saving money by being selective—you're saving cache efficiency. Unless you're handling millions of requests per minute, the cache refill after a `/*` invalidation is negligible.

## Cache Busting Strategies

The deploy script already uses the most effective cache busting strategy: **hashed filenames** for assets and **short TTLs** for `index.html`. But there are two other approaches worth understanding:

### Query String Versioning

Append a version query string to asset URLs: `main.js?v=202603181200`. CloudFront treats each unique URL (including query strings, if the cache policy includes them) as a separate cached object. This avoids invalidations entirely—the new URL is a cache miss by definition.

The problem: CloudFront's default `CachingOptimized` policy doesn't include query strings in the cache key. You'd need a custom cache policy. And your HTML must reference the versioned URLs, which means your build tool must inject the version string. Modern bundlers already hash filenames, which is a better approach because the hash is content-based, not time-based.

### Timestamped Directories

Upload each deployment to a versioned directory: `s3://my-frontend-app-assets/v20260318/`. Point CloudFront at the latest version. This gives you instant rollbacks (just point CloudFront to the previous version) but adds complexity to your deployment pipeline and bucket structure.

For most frontend projects, hashed filenames plus `/*` invalidation is the right balance of simplicity and effectiveness. Honestly, I've never needed anything more than this.

## Adding a Build Step

In practice, you rarely deploy without building first. Here's the script extended with a build step:

```bash
#!/usr/bin/env bash
set -euo pipefail

BUCKET="my-frontend-app-assets"
DISTRIBUTION_ID="E1A2B3C4D5E6F7"
REGION="us-east-1"
BUILD_DIR="./build"

echo "Building..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: Build did not produce '$BUILD_DIR' directory."
  exit 1
fi

echo "Deploying to s3://$BUCKET..."

aws s3 sync "$BUILD_DIR/assets" "s3://$BUCKET/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --region "$REGION" \
  --delete \
  --output json

aws s3 cp "$BUILD_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "public, max-age=60" \
  --content-type "text/html" \
  --region "$REGION" \
  --output json

aws s3 sync "$BUILD_DIR" "s3://$BUCKET" \
  --exclude "assets/*" \
  --exclude "index.html" \
  --region "$REGION" \
  --delete \
  --output json

INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --region "$REGION" \
  --output json)

INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "Deploy complete. Invalidation: $INVALIDATION_ID"
```

The `set -euo pipefail` at the top ensures the script stops immediately if any command fails. If `npm run build` exits non-zero, the deploy doesn't proceed. If `aws s3 sync` fails, the invalidation doesn't run. This prevents partial deployments.

## Deployment Versioning

For auditability, you might want to tag each deployment. Add this to your script:

```bash
DEPLOY_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "Deploying commit $GIT_SHA at $DEPLOY_TIMESTAMP"
```

This gives you a trail in your terminal output. For more durable tracking, you could write a deployment manifest to S3:

```bash
echo "{\"commit\": \"$GIT_SHA\", \"timestamp\": \"$DEPLOY_TIMESTAMP\"}" | \
  aws s3 cp - "s3://$BUCKET/_deploy-manifest.json" \
  --content-type "application/json" \
  --region "$REGION"
```

Now you can always check which version is deployed by fetching `https://example.com/_deploy-manifest.json`.

The deploy script works, but you still have to run it manually. Next up, you'll move this into a GitHub Actions workflow that runs automatically on every push to `main`, including how to authenticate GitHub Actions with AWS using OIDC instead of long-lived access keys.
