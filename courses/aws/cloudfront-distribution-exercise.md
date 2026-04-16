---
title: 'Exercise: Set Up a CloudFront Distribution'
description: >-
  Create a CloudFront distribution with an S3 origin, Origin Access Control, and custom error responses for SPA routing.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - cloudfront
  - exercise
---

You have an S3 bucket with static site files. Your job is to put CloudFront in front of it: create a distribution, lock down the bucket with Origin Access Control, and configure SPA routing. By the end, you should have a globally distributed, HTTPS-secured frontend on a `*.cloudfront.net` domain that serves your SPA correctly on all routes.

## Why It Matters

Without CloudFront, your site is a single-region S3 bucket with no HTTPS, no edge caching, and no security headers. With CloudFront, you have a globally distributed CDN that serves content from edge locations close to your users, enforces HTTPS, handles SPA routing, and adds security headers—the same infrastructure Vercel and Netlify give you out of the box. This exercise is the bridge from "files in a bucket" to "production deployment."

> [!TIP]
> If the console or CLI output shifts while you're doing this, keep the [CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) and the [OAC setup guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) open.

## Prerequisites

Before you start, make sure you have:

- An S3 bucket (`my-frontend-app-assets`) with at least an `index.html` file uploaded. See [Uploading and Organizing Files](uploading-and-organizing-files.md) if you need to set this up.
- The AWS CLI v2 configured with credentials that have CloudFront and S3 permissions.

## Create an Origin Access Control

Create an OAC that CloudFront will use to authenticate requests to your S3 bucket.

- Use `aws cloudfront create-origin-access-control` with a JSON config.
- Set `SigningProtocol` to `sigv4`, `SigningBehavior` to `always`, and `OriginAccessControlOriginType` to `s3`.
- Save the OAC `Id` from the response—you need it for the distribution config.

### Checkpoint

Run `aws cloudfront list-origin-access-controls --region us-east-1 --output json` and confirm your OAC appears in the list.

## Create the Distribution

Create a CloudFront distribution with these settings:

- **Origin**: Your S3 bucket (`my-frontend-app-assets.s3.us-east-1.amazonaws.com`), with the OAC ID attached.
- **Default root object**: `index.html`
- **Price class**: `PriceClass_100`
- **Cache policy**: Use the managed `CachingOptimized` policy (`658327ea-f89d-4fab-a63d-7e88639e58f6`).
- **Viewer protocol policy**: `redirect-to-https`
- **Compression**: Enabled
- **HTTP version**: `http2and3`
- **Viewer certificate**: Use the CloudFront default certificate (`CloudFrontDefaultCertificate: true`). This gives you HTTPS on the `*.cloudfront.net` domain automatically. If you want a custom domain later, see the optional [Custom Domains, DNS, and Certificates](dns-for-frontend-engineers.md) section at the end of the course.
- **Custom error responses**: Map both `403` and `404` to `/index.html` with response code `200` and an error caching TTL of `10` seconds.

Write the full distribution config JSON and use `aws cloudfront create-distribution --distribution-config file://distribution-config.json`.

### Checkpoint

The `create-distribution` command returns a distribution `Id` and `DomainName`. Save both. The `Status` should be `"InProgress"`. Wait for deployment:

```bash
aws cloudfront wait distribution-deployed \
  --id YOUR_DISTRIBUTION_ID \
  --region us-east-1
```

## Update the S3 Bucket Policy

Replace your bucket's current policy with one that allows only CloudFront to read from it:

- **Principal**: `cloudfront.amazonaws.com` service principal.
- **Action**: `s3:GetObject`.
- **Resource**: `arn:aws:s3:::my-frontend-app-assets/*`.
- **Condition**: `StringEquals` on `AWS:SourceArn` matching your distribution's ARN (`arn:aws:cloudfront::123456789012:distribution/YOUR_DISTRIBUTION_ID`).

Apply the policy with `aws s3api put-bucket-policy`.

### Checkpoint

Test that CloudFront serves your content:

```bash
curl -I https://YOUR_DISTRIBUTION_DOMAIN/index.html
```

You should get `200 OK`. Now test that direct S3 access is blocked:

```bash
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

You should get `403 Forbidden`.

## Re-enable Block Public Access

Your bucket no longer needs to be publicly accessible. Re-enable all four Block Public Access settings:

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region us-east-1
```

### Checkpoint

Verify that CloudFront still works after re-enabling Block Public Access:

```bash
curl -I https://YOUR_DISTRIBUTION_DOMAIN/index.html
```

Still `200 OK`. The CloudFront service principal policy isn't affected by Block Public Access.

## Test SPA Routing

Navigate to a path that doesn't correspond to a real file in your S3 bucket:

```bash
curl -I https://YOUR_DISTRIBUTION_DOMAIN/dashboard/settings
```

You should get `200 OK` with `content-type: text/html`. This confirms that the custom error response is working—CloudFront is serving `index.html` for missing paths.

### Checkpoint

Open your distribution's domain in a browser and navigate to a SPA route. The page should load correctly, and refreshing shouldn't produce a 403 or 404 error.

## Attach a Response Headers Policy

Attach the managed `SecurityHeadersPolicy` (`67f7725c-6f97-4210-82d7-5512b31e9d03`) to your default cache behavior:

- Fetch the current distribution config with `aws cloudfront get-distribution-config`.
- Add `ResponseHeadersPolicyId` to the `DefaultCacheBehavior`.
- Update the distribution with `aws cloudfront update-distribution`, using the `ETag` from the fetch.

### Checkpoint

After the distribution deploys, verify the security headers:

```bash
curl -I https://YOUR_DISTRIBUTION_DOMAIN/index.html
```

You should see:

```
strict-transport-security: max-age=31536000
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
```

## Final Verification

At this point, your CloudFront distribution should have:

1. An S3 origin with Origin Access Control (no public bucket access).
2. The `CachingOptimized` managed cache policy.
3. HTTPS via the CloudFront default certificate with `redirect-to-https`.
4. Custom error responses for SPA routing (403 and 404 to `/index.html` with 200).
5. Security headers via a response headers policy.

Run a final check:

```bash
# Distribution details
aws cloudfront get-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --region us-east-1 \
  --output json \
  --query "Distribution.{Id:Id,Domain:DomainName,Status:Status}"

# Verify HTTPS works
curl -I https://YOUR_DISTRIBUTION_DOMAIN

# Verify SPA routing
curl -I https://YOUR_DISTRIBUTION_DOMAIN/any/spa/route

# Verify S3 is locked down
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

## Failure Diagnosis

- **CloudFront returns `403 Forbidden` for files that exist:** The S3 bucket policy does not trust your distribution's Origin Access Control, or the origin is still configured to use the bucket incorrectly.
- **`/dashboard/settings` returns a 403 or 404 instead of your app shell:** The custom error responses for SPA routing are missing or point at the wrong path.
- **Direct S3 access still works after CloudFront is configured:** Re-enable Block Public Access and make sure the bucket policy grants read access only to CloudFront, not to `Principal: "*"` anymore.

## Stretch Goals

- **Custom response headers policy**: Create a custom policy with HSTS `max-age` of 2 years, `includeSubDomains`, and `preload`. Add a `Permissions-Policy` header that disables camera, microphone, and geolocation.
- **Cache-Control headers on S3 objects**: Re-upload your assets with differentiated `Cache-Control` headers: short TTL for `index.html`, long TTL with `immutable` for hashed assets.
- **Targeted invalidation**: Deploy a change to `index.html`, then create an invalidation for only `/index.html` instead of `/*`. Verify that the old version is still cached for other paths.
