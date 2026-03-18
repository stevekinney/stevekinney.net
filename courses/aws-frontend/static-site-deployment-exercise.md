---
title: 'Exercise: End-to-End Static Site Deployment'
description: >-
  Deploy a complete static site from scratch: S3 bucket, CloudFront with OAC, ACM certificate, Route 53 DNS, and verify HTTPS at your custom domain.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - deployment
  - exercise
---

You are going to deploy a static site from zero to production. No shortcuts, no skipping steps. By the end, your site will be live at `https://example.com` — served through CloudFront, secured with an ACM certificate, stored in a private S3 bucket, resolved by Route 53. This exercise integrates everything from Modules 1 through 5.

## Why It Matters

You have built each piece individually across the first five modules. This exercise proves they compose into a working deployment. It is also a dry run for the workflow you will automate with GitHub Actions: every manual step here maps to a step in your CI/CD pipeline. If you can do it by hand, you understand what the automation is doing.

## Prerequisites

Before you start:

- AWS CLI v2 configured with credentials that have admin-level permissions (or at minimum: S3, CloudFront, ACM, Route 53, and IAM access). See [Setting Up the AWS CLI](setting-up-the-aws-cli.md).
- A domain name you control, either registered through Route 53 or with nameservers pointed at a Route 53 hosted zone. See [Registering and Transferring Domains](registering-and-transferring-domains.md).
- A static site build directory with at least an `index.html` file. If you do not have one, create a minimal site:

```bash
mkdir -p build
echo '<!DOCTYPE html><html><head><title>My Site</title></head><body><h1>It works.</h1></body></html>' > build/index.html
```

## Step 1: Create the S3 Bucket

Create a bucket to hold your static files. Block all public access from the start — CloudFront will be the only way to reach these files.

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

## Step 2: Upload Your Site

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

## Step 3: Request an ACM Certificate

Request a certificate in `us-east-1` for your domain. Include both the apex domain and the `www` subdomain:

- Use `aws acm request-certificate` with `--domain-name example.com` and `--subject-alternative-names www.example.com`.
- Use DNS validation (not email validation).
- Create the validation CNAME records in Route 53.
- Wait for the certificate status to become `ISSUED`.

Refer to [Requesting a Certificate in ACM](requesting-a-certificate-in-acm.md) and [DNS Validation vs. Email Validation](dns-validation-vs-email-validation.md).

### Checkpoint

```bash
aws acm describe-certificate \
  --certificate-arn YOUR_CERTIFICATE_ARN \
  --region us-east-1 \
  --output json \
  --query "Certificate.Status"
```

Should return `"ISSUED"`. If it still says `"PENDING_VALIDATION"`, verify your DNS validation records are correct and wait a few minutes.

## Step 4: Create an Origin Access Control

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

## Step 5: Create the CloudFront Distribution

Create a distribution that ties the bucket, OAC, and certificate together. Your distribution config should include:

- **Origin**: Your S3 bucket with the OAC ID attached.
- **Default root object**: `index.html`.
- **Viewer protocol policy**: `redirect-to-https`.
- **Cache policy**: The managed `CachingOptimized` policy (`658327ea-f89d-4fab-a63d-7e88639e58f6`).
- **Custom error responses**: Map 403 and 404 to `/index.html` with a 200 response code.
- **Viewer certificate**: Your ACM certificate ARN, `sni-only`, `TLSv1.2_2021`.
- **Aliases**: `example.com` and `www.example.com`.

Refer to [Creating a CloudFront Distribution](creating-a-cloudfront-distribution.md), [Attaching an SSL Certificate](attaching-an-ssl-certificate.md), and [Custom Error Pages and SPA Routing](custom-error-pages-and-spa-routing.md).

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

## Step 6: Update the S3 Bucket Policy

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

## Step 7: Create Route 53 DNS Records

Create A alias records that point your domain to the CloudFront distribution:

- Create an A alias record for `example.com` pointing to your distribution.
- Create an A alias record for `www.example.com` pointing to the same distribution.

Refer to [Pointing a Domain to CloudFront](pointing-a-domain-to-cloudfront.md) and [Hosted Zones and Record Types](hosted-zones-and-record-types.md).

### Checkpoint

After DNS propagates (this can take a few minutes, or up to 48 hours if you recently changed nameservers):

```bash
curl -I https://example.com
```

You should get `200 OK` with your site's content served over HTTPS.

> [!TIP]
> If DNS has not propagated yet, you can verify the distribution directly using the CloudFront domain name (`d1234abcdef.cloudfront.net`). Once DNS resolves, the custom domain will produce the same result.

## Step 8: Verify the Complete Pipeline

Run through every layer of the pipeline:

```bash
# DNS resolves to CloudFront
dig example.com +short

# HTTPS works with your certificate
curl -vI https://example.com 2>&1 | grep "subject:"

# CloudFront serves your content
curl -I https://example.com

# SPA routing works (returns index.html for non-existent paths)
curl -I https://example.com/any/spa/route

# Direct S3 access is blocked
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

### Checkpoint

- [ ] `dig example.com` returns CloudFront IP addresses
- [ ] `curl -I https://example.com` returns `200 OK`
- [ ] The SSL certificate subject matches your domain
- [ ] `curl -I https://example.com/any/spa/route` returns `200 OK` (SPA routing)
- [ ] Direct S3 access returns `403 Forbidden`
- [ ] `curl -I https://www.example.com` also returns `200 OK`

## Step 9: Test a Deployment

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

4. Wait a minute, then reload `https://example.com`. You should see the updated content.

### Checkpoint

Your updated content is live at `https://example.com`. The deployment cycle (sync + invalidate) works end to end.

## Stretch Goals

- **Differentiated cache headers**: Re-upload your assets with `--cache-control "public, max-age=31536000, immutable"` for hashed files and `--cache-control "public, max-age=60"` for `index.html`. Verify the headers appear in `curl -I` responses.

- **Security headers**: Attach the managed `SecurityHeadersPolicy` (`67f7725c-6f97-4210-82d7-5512b31e9d03`) to your distribution's default cache behavior. Verify `strict-transport-security`, `x-content-type-options`, and `x-frame-options` appear in the response headers.

- **Deploy script**: Write a `deploy.sh` script that automates the sync and invalidation steps. Refer to [Automating Deploys with the AWS CLI](automating-deploys-with-aws-cli.md) for the template.

When you are ready, check your work against the [Solution: End-to-End Static Site Deployment](static-site-deployment-solution.md).
