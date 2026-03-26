---
title: 'The Full Static Site Pipeline'
description: >-
  Walk through the end-to-end architecture of deploying a static site to AWS, connecting S3, CloudFront, ACM, and Route 53 into a working pipeline.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - deployment
  - s3
  - cloudfront
  - acm
  - route53
---

You've spent five modules learning individual AWS services. You can create an S3 bucket, request a certificate, configure a CloudFront distribution, and point a domain at it. Each piece works on its own. But the value is in how they compose: a user types your domain into a browser, DNS resolves to CloudFront, CloudFront serves cached content from S3 over HTTPS with your certificate, and the whole thing costs pennies. That's the pipeline. This lesson maps out the architecture end-to-end and explains the order of operations: what you create first, what depends on what, and why.

## The Architecture

Here's what the fully assembled pipeline looks like:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Route 53   │────▸│  CloudFront  │────▸│      S3      │     │     ACM      │
│              │     │              │     │              │     │              │
│ A alias      │     │ Distribution │     │ Bucket with  │     │ Certificate  │
│ example.com  │     │ E1A2B3C4D5E6F7│    │ static files │     │ *.example.com│
│  ──▸ CF dist │     │ OAC ──▸ S3   │     │ (private)    │     │ (us-east-1)  │
└──────────────┘     │ HTTPS (ACM)  │     └──────────────┘     └──────┬───────┘
                     └──────┬───────┘                                 │
                            │              attached to                │
                            └─────────────────────────────────────────┘
```

1. **Route 53** resolves `example.com` to the CloudFront distribution using an alias record.
2. **CloudFront** terminates HTTPS using the ACM certificate, checks its edge cache, and on a miss, fetches from S3 using Origin Access Control.
3. **S3** stores the static files in a private bucket. Only CloudFront can read from it.
4. **ACM** provides the SSL/TLS certificate that CloudFront uses for HTTPS.

Four services, four clearly defined responsibilities. No servers. No containers. No load balancers. I genuinely love how simple this ends up being.

## The Order of Operations

The order matters. You can't attach a certificate to a distribution that doesn't exist. You can't create an alias record for a distribution that has no alternate domain name. Here's the correct sequence and why each step depends on the previous one.

### Create the S3 Bucket

The bucket is the foundation: it holds your files. Nothing else in the pipeline depends on S3 being configured in a specific way at creation time — you can always update the bucket policy later. You covered this in [Creating and Configuring a Bucket](creating-and-configuring-a-bucket.md) and uploaded files in [Uploading and Organizing Files](uploading-and-organizing-files.md).

At this stage, the bucket can be public or private. It doesn't matter yet because you'll lock it down with Origin Access Control once CloudFront is in place.

### Request the ACM Certificate

The certificate must exist and be in the `ISSUED` state before you can attach it to a CloudFront distribution. Certificate validation (especially DNS validation) can take minutes, so you want to start this early. You requested a certificate in [Requesting a Certificate in ACM](requesting-a-certificate-in-acm.md) and validated it in [DNS Validation vs. Email Validation](dns-validation-vs-email-validation.md).

> [!WARNING]
> The certificate must be in `us-east-1`. CloudFront is a global service, but it only reads certificates from `us-east-1`. You covered this requirement in [Certificate Renewal and us-east-1](certificate-renewal-and-us-east-1.md). If your certificate is in any other region, CloudFront won't see it.

### Create the CloudFront Distribution with OAC

With the bucket and certificate ready, you can create the distribution. This is the step where everything comes together:

- The **origin** points to your S3 bucket. You configured this in [Creating a CloudFront Distribution](creating-a-cloudfront-distribution.md).
- **Origin Access Control** restricts the bucket so only CloudFront can read from it. You set this up in [Origin Access Control for S3](origin-access-control-for-s3.md).
- The **ACM certificate** is attached for HTTPS on your custom domain. You covered this in [Attaching an SSL Certificate](attaching-an-ssl-certificate.md).
- **Cache behaviors** and **custom error responses** handle caching and SPA routing. You configured these in [Cache Behaviors and Invalidations](cache-behaviors-and-invalidations.md) and [Custom Error Pages and SPA Routing](custom-error-pages-and-spa-routing.md).
- **Alternate domain names** (CNAMEs) are set to `example.com` and `www.example.com` so Route 53 can point to this distribution.

After creating the distribution, you update the S3 bucket policy to allow only the CloudFront service principal, and you re-enable Block Public Access on the bucket. At this point, direct S3 URLs return 403.

### Configure Route 53 DNS

DNS comes last because the alias record needs to point at something that exists. You create A alias records for `example.com` and `www.example.com` that resolve to your CloudFront distribution. You did this in [Pointing a Domain to CloudFront](pointing-a-domain-to-cloudfront.md) and learned why alias records are the right choice in [Alias Records vs. CNAME Records](alias-records-vs-cname-records.md).

Once DNS propagates, users can visit `https://example.com` and reach your static site through the full pipeline.

> [!TIP]
> If your domain is registered outside Route 53, you need to update the nameservers at your registrar to point to Route 53's nameservers. This was covered in [Registering and Transferring Domains](registering-and-transferring-domains.md). DNS propagation can take up to 48 hours when changing nameservers, though it's often faster.

## Why This Order

The dependency chain flows in one direction:

```
S3 ◀── CloudFront ◀── Route 53
           ▲
           │
          ACM
```

- CloudFront depends on S3 (as its origin) and ACM (for the certificate).
- Route 53 depends on CloudFront (as the alias target).
- S3 and ACM are independent of each other and can be created in parallel.

If you try to create Route 53 records before the distribution exists, the alias target doesn't resolve. If you try to attach a certificate before it's issued, CloudFront rejects the configuration. If you try to configure OAC before the distribution exists, there's nothing to attach it to. The order isn't arbitrary: it's dictated by the dependencies between services.

## The IAM Permissions That Make It Work

Every operation in this pipeline requires IAM permissions. You built the foundational understanding in [IAM Mental Model](iam-mental-model.md) and [Writing Your First IAM Policy](writing-your-first-iam-policy.md). For a deployment pipeline, the key permissions are:

- **S3**: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on your bucket.
- **CloudFront**: `cloudfront:CreateInvalidation` on your distribution.
- **ACM**: `acm:DescribeCertificate`, `acm:ListCertificates` for verifying certificate status.
- **Route 53**: `route53:ChangeResourceRecordSets` on your hosted zone.

You built a scoped deploy bot with exactly these S3 and CloudFront permissions in the [IAM Policy for a Deploy Bot exercise](iam-policy-exercise.md). That same policy is what you'll use in CI/CD pipelines.

## What Each Service Is Doing at Runtime

Once the pipeline is deployed, here's what happens when a user visits `https://example.com/dashboard`:

1. **DNS resolution**: The browser queries DNS. Route 53 returns the CloudFront distribution's IP addresses (via the alias record).
2. **TLS handshake**: The browser connects to CloudFront's edge location. CloudFront presents the ACM certificate for `example.com`. The browser verifies it and establishes an encrypted connection.
3. **Edge cache check**: CloudFront checks if `/dashboard` is cached at this edge location.
4. **Cache miss (first visit)**: CloudFront sends a signed request to S3 (using OAC's SigV4 credentials). S3 doesn't have a file at `/dashboard`, so it returns a 403.
5. **Custom error response**: CloudFront's custom error response intercepts the 403, serves `/index.html` instead, and returns a 200 status code. Your client-side router takes over and renders the `/dashboard` view.
6. **Cache hit (subsequent visits)**: The next request for `/dashboard` from the same edge location is served directly from cache. No round trip to S3.

Every layer does one thing. S3 stores files. CloudFront caches and routes. ACM secures. Route 53 resolves. The pieces compose without overlapping.

## The Deployment Workflow

With the infrastructure in place, deploying a new version of your site is two commands:

```bash
# Upload new files to S3
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete \
  --output json

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/*" \
  --region us-east-1 \
  --output json
```

The `--delete` flag removes old files from S3 that no longer exist in your build directory. The invalidation tells CloudFront to drop cached copies so edge locations fetch the new versions. You learned about these in [Cache Behaviors and Invalidations](cache-behaviors-and-invalidations.md).

This is the foundation. In the next two lessons, you'll wrap these commands in a deploy script and then automate them with GitHub Actions so deployments happen on every push to `main`.

> [!TIP]
> If you want to test the pipeline before automating it, run the two commands above manually after each build. That's exactly what the automated pipeline does: it just removes you from the loop.
