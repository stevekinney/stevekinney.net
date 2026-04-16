---
title: 'Exercise: End-to-End Static Site Deployment'
description: >-
  Deploy a complete static site from scratch: S3 bucket, CloudFront with OAC, and verify HTTPS on the default CloudFront domain.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - deployment
  - exercise
---

You're going to deploy a static site from zero to production. No shortcuts, no skipping steps. This is my favorite exercise in the whole course. By the end, your site will be live on a `*.cloudfront.net` domain—served through CloudFront, secured with HTTPS, and stored in a private S3 bucket. This exercise integrates the core static-hosting arc: IAM, S3, CloudFront, and OAC.

## Why It Matters

You've built each piece individually across the early static-hosting sections. This exercise proves they compose into a working deployment. It's also a dry run for the workflow you'll automate with GitHub Actions: every manual step here maps to a step in your CI/CD pipeline. If you can do it by hand, you understand what the automation is doing.

If you want the AWS version of the end-to-end workflow open while you work, keep the [S3 static website tutorial](https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html) and the [CloudFront OAC guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) nearby.

## Prerequisites

Before you start:

- AWS CLI v2 configured with credentials that have admin-level permissions (or at minimum: S3, CloudFront, and IAM access). See [Setting Up the AWS CLI](setting-up-the-aws-cli.md).
- A static site build directory with at least an `index.html` file. If you don't have one, create a minimal site:

```bash
mkdir -p build
echo '<!DOCTYPE html><html><head><title>My Site</title></head><body><h1>It works.</h1></body></html>' > build/index.html
```

## Create the S3 Bucket

Create a bucket to hold your static files. Block all public access from the start—CloudFront will be the only way to reach these files.

- Create the bucket with `aws s3 mb`.
- Enable Block Public Access with `aws s3api put-public-access-block`.
- Verify the bucket exists with `aws s3 ls`.

Refer to [Creating and Configuring a Bucket](creating-and-configuring-a-bucket.md) for the commands.

### Checkpoint

```bash
aws s3api get-public-access-block \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

All four settings should be `true`.

## Upload Your Site

Sync your build directory to the bucket:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Refer to [Uploading and Organizing Files](uploading-and-organizing-files.md) for options like `--cache-control` headers.

### Checkpoint

```bash
aws s3 ls s3://my-frontend-app-assets \
  --region us-east-1
```

You should see your `index.html` (and any other files) listed.

## Create an Origin Access Control

Create an OAC that CloudFront will use to authenticate requests to your S3 bucket:

- Use `aws cloudfront create-origin-access-control`.
- Set `SigningProtocol` to `sigv4`, `SigningBehavior` to `always`, `OriginAccessControlOriginType` to `s3`.
- Save the OAC `Id` from the response.

Refer to [Origin Access Control for S3](origin-access-control-for-s3.md).

### Checkpoint

```bash
aws cloudfront list-origin-access-controls \
  --region us-east-1 \
  --output json \
  --query "OriginAccessControlList.Items[*].{Id:Id,Name:Name}"
```

Your OAC should appear in the list.

## Create the CloudFront Distribution

Create a distribution that ties the bucket, OAC, and certificate together. Your distribution config should include:

- **Origin**: Your S3 bucket with the OAC ID attached.
- **Default root object**: `index.html`.
- **Viewer protocol policy**: `redirect-to-https`.
- **Cache policy**: The managed `CachingOptimized` policy (`658327ea-f89d-4fab-a63d-7e88639e58f6`).
- **Custom error responses**: Map 403 and 404 to `/index.html` with a 200 response code.
- **Viewer certificate**: Use the CloudFront default certificate (`CloudFrontDefaultCertificate: true`).

Refer to [Creating a CloudFront Distribution](creating-a-cloudfront-distribution.md) and [Custom Error Pages and SPA Routing](custom-error-pages-and-spa-routing.md).

Save the distribution ID and domain name from the response.

### Checkpoint

Wait for deployment:

```bash
aws cloudfront wait distribution-deployed \
  --id YOUR_DISTRIBUTION_ID \
  --region us-east-1
```

Then verify the CloudFront domain serves your site:

```bash
curl -I https://YOUR_CLOUDFRONT_DOMAIN/index.html
```

You should get `200 OK`.

## Update the S3 Bucket Policy

Replace the bucket policy to allow only CloudFront to read from the bucket:

- **Principal**: `cloudfront.amazonaws.com` service principal.
- **Action**: `s3:GetObject`.
- **Resource**: `arn:aws:s3:::my-frontend-app-assets/*`.
- **Condition**: `StringEquals` on `AWS:SourceArn` matching your distribution's ARN.

Refer to [Origin Access Control for S3](origin-access-control-for-s3.md) and [Bucket Policies and Public Access](bucket-policies-and-public-access.md).

### Checkpoint

CloudFront should still work:

```bash
curl -I https://YOUR_CLOUDFRONT_DOMAIN/index.html
```

Direct S3 access should be blocked:

```bash
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

Should return `403 Forbidden`.

## Verify the Complete Pipeline

Run through every layer of the pipeline:

```bash
# HTTPS works on the CloudFront domain
curl -I https://YOUR_CLOUDFRONT_DOMAIN

# SPA routing works (returns index.html for non-existent paths)
curl -I https://YOUR_CLOUDFRONT_DOMAIN/any/spa/route

# Direct S3 access is blocked
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

### Checkpoint

- [ ] `curl -I https://YOUR_CLOUDFRONT_DOMAIN` returns `200 OK`
- [ ] `curl -I https://YOUR_CLOUDFRONT_DOMAIN/any/spa/route` returns `200 OK` (SPA routing)
- [ ] Direct S3 access returns `403 Forbidden`

## Test a Deployment

Deploy a change to verify the update cycle works:

1. Edit your `index.html` (change the heading text).
2. Sync the updated file to S3:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete \
  --output json
```

3. Invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*" \
  --region us-east-1 \
  --output json
```

4. Wait a minute, then reload `https://YOUR_CLOUDFRONT_DOMAIN`. You should see the updated content.

### Checkpoint

Your updated content is live at `https://YOUR_CLOUDFRONT_DOMAIN`. The deployment cycle (sync + invalidate) works end to end.

## Failure Diagnosis

- **CloudFront returns `403 Forbidden` for files that exist:** The S3 bucket policy does not trust your distribution's Origin Access Control, or the origin is still configured incorrectly.
- **The updated page never appears after sync:** The new file reached S3, but CloudFront is still serving the cached version. Confirm the invalidation completed before retesting.

## Stretch Goals

- **Differentiated cache headers**: Re-upload your assets with `--cache-control "public, max-age=31536000, immutable"` for hashed files and `--cache-control "public, max-age=60"` for `index.html`. Verify the headers appear in `curl -I` responses.

- **Security headers**: Attach the managed `SecurityHeadersPolicy` (`67f7725c-6f97-4210-82d7-5512b31e9d03`) to your distribution's default cache behavior. Verify `strict-transport-security`, `x-content-type-options`, and `x-frame-options` appear in the response headers.

- **Deploy script**: Write a `deploy.sh` script that automates the sync and invalidation steps. Refer to [Automating Deploys with the AWS CLI](automating-deploys-with-aws-cli.md) for the template.

> [!TIP]
> Want to put this behind a custom domain with HTTPS on your own certificate? See the optional [Custom Domains, DNS, and Certificates](dns-for-frontend-engineers.md) section at the end of the course. It walks through Route 53, ACM, and wiring everything together.

When you're ready, check your work against the [Solution: End-to-End Static Site Deployment](static-site-deployment-solution.md).
