---
title: 'Origin Access Control for S3'
description: >-
  Configure Origin Access Control so that your S3 bucket only serves content through CloudFront, not through direct S3 URLs.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - cloudfront
  - s3
  - security
---

Right now, your CloudFront distribution works — it fetches files from your S3 bucket and serves them through edge locations. But your S3 bucket is also publicly accessible. Anyone who knows the bucket URL can bypass CloudFront entirely and access your files directly from S3. That means they skip your caching, skip your HTTPS configuration, skip your security headers, and potentially skip any access controls you put at the edge.

**Origin Access Control** (OAC) fixes this. It restricts your S3 bucket so that only CloudFront can read from it. Direct S3 URLs return "Access Denied." All traffic flows through your distribution: cached, compressed, secured.

## Why OAC Matters

You might think: "Who cares if someone accesses my bucket directly? It is a public website." Here is why you care:

1. **Cost**: S3 data transfer is more expensive than CloudFront data transfer in most cases. If users bypass CloudFront and hit S3 directly, you pay more.
2. **Caching**: Direct S3 requests skip the CDN cache, which means every request hits S3. CloudFront absorbs traffic spikes; S3 does not.
3. **Security headers**: Any security headers you configure on your CloudFront distribution (HSTS, CSP, X-Frame-Options) are not applied to direct S3 responses. You will configure these in [CloudFront Headers, CORS, and Security](cloudfront-headers-cors-and-security.md).
4. **Access control**: If you later add authentication or geo-restrictions at the CloudFront level, direct S3 access bypasses all of it.

> [!TIP]
> If you have been using Vercel or Netlify, OAC is the equivalent of those platforms ensuring your build output is only accessible through their CDN, not through the underlying object storage. You just never had to think about it because the platform handled it.

## OAC vs. OAI

You might see references to **Origin Access Identity** (OAI) in older tutorials and documentation. OAI is the predecessor to OAC and still works, but AWS recommends OAC for all new distributions. OAC supports additional features that OAI does not:

- Server-side encryption with AWS KMS (SSE-KMS)
- Dynamic requests (PUT, POST, DELETE) to S3
- S3 buckets in all AWS regions, including newer opt-in regions

For this course, you will use OAC exclusively. If you encounter OAI in the wild, the concepts are similar but the configuration is different.

## Step 1: Create an Origin Access Control

First, create the OAC resource:

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "my-frontend-app-oac",
    "Description": "OAC for my-frontend-app-assets S3 bucket",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --region us-east-1 \
  --output json
```

The response includes the OAC's ID:

```json
{
  "OriginAccessControl": {
    "Id": "E1OAC2EXAMPLE",
    "OriginAccessControlConfig": {
      "Name": "my-frontend-app-oac",
      "Description": "OAC for my-frontend-app-assets S3 bucket",
      "SigningProtocol": "sigv4",
      "SigningBehavior": "always",
      "OriginAccessControlOriginType": "s3"
    }
  }
}
```

A few things about the config:

- **`SigningProtocol`**: `sigv4` is AWS Signature Version 4, the standard signing mechanism for AWS API requests. This is the only supported option for S3 origins.
- **`SigningBehavior`**: `always` means CloudFront signs every request to S3. The alternative, `no-override`, only signs requests that the origin does not already have an `Authorization` header for — you will not need that for a static site.
- **`OriginAccessControlOriginType`**: `s3` tells CloudFront this OAC is for an S3 origin. CloudFront also supports OAC for other origin types (MediaStore, Lambda function URLs), but S3 is what you need here.

Save the `Id` value — you need it in the next step.

## Step 2: Update the Distribution to Use OAC

Updating a CloudFront distribution is a three-step process: fetch the current config, modify it, and submit the update with the `ETag` from the fetch.

Fetch the current config:

```bash
aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json > distribution-config-current.json
```

The response has two top-level fields: `ETag` and `DistributionConfig`. You need both. The `ETag` is a version identifier — CloudFront uses it to prevent concurrent modifications (the same pattern as HTTP conditional requests).

Now edit the config. You need to make two changes to the origin inside `DistributionConfig.Origins.Items[0]`:

1. Add `"OriginAccessControlId": "E1OAC2EXAMPLE"` to the origin.
2. Ensure `S3OriginConfig.OriginAccessIdentity` is set to `""` (empty string — you are not using the legacy OAI).

The updated origin should look like this:

```json
{
  "Id": "S3-my-frontend-app-assets",
  "DomainName": "my-frontend-app-assets.s3.us-east-1.amazonaws.com",
  "OriginAccessControlId": "E1OAC2EXAMPLE",
  "S3OriginConfig": {
    "OriginAccessIdentity": ""
  }
}
```

Extract just the `DistributionConfig` portion into a new file (removing the `ETag` wrapper), and submit the update:

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match E2QWRUHEXAMPLE \
  --distribution-config file://distribution-config-updated.json \
  --region us-east-1 \
  --output json
```

Replace `E2QWRUHEXAMPLE` with the actual `ETag` from the `get-distribution-config` response. If the `ETag` does not match, CloudFront rejects the update — this prevents you from overwriting changes made by someone else (or by a concurrent process).

## Step 3: Update the S3 Bucket Policy

The OAC is attached to CloudFront, but S3 does not know about it yet. You need to replace your bucket policy with one that allows CloudFront to read from the bucket and denies everyone else.

If you followed [Bucket Policies and Public Access](bucket-policies-and-public-access.md), your bucket currently has a public read policy with `"Principal": "*"`. Replace it with this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
        }
      }
    }
  ]
}
```

This policy does two things:

- **Allows** the CloudFront service principal (`cloudfront.amazonaws.com`) to call `s3:GetObject` on your bucket.
- **Restricts** that access to your specific distribution using a **Condition**. Only distribution `E1A2B3C4D5E6F7` in account `123456789012` can read from this bucket. Other CloudFront distributions — even ones in the same AWS account — are blocked.

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket my-frontend-app-assets \
  --policy file://bucket-policy-oac.json \
  --region us-east-1
```

## Step 4: Re-enable Block Public Access

With OAC in place, your bucket no longer needs to be publicly accessible. Re-enable the Block Public Access settings you disabled in [Bucket Policies and Public Access](bucket-policies-and-public-access.md):

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region us-east-1
```

> [!WARNING]
> Wait — did you just re-enable Block Public Access while having a bucket policy that allows CloudFront? Yes. The CloudFront service principal policy is not a "public" policy in AWS's definition. Block Public Access blocks policies with `"Principal": "*"` (everyone) or policies that grant access to any anonymous user. A policy scoped to the `cloudfront.amazonaws.com` service principal with a condition on a specific distribution ARN is not considered public. This is exactly how AWS intends it to work.

## Verifying It Works

Test that CloudFront still serves your content:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

You should get a `200 OK` response with CloudFront headers.

Now test that direct S3 access is blocked:

```bash
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

You should get a `403 Forbidden` response. The bucket is no longer publicly accessible — only CloudFront can read from it.

## The Complete Picture

Here is what the architecture looks like after configuring OAC:

1. User requests `https://d1234abcdef.cloudfront.net/index.html`.
2. CloudFront checks its edge cache.
3. On a cache miss, CloudFront sends a signed request to S3 using the OAC's SigV4 credentials.
4. S3 checks the bucket policy, sees the request is from `cloudfront.amazonaws.com` with the correct distribution ARN, and returns the object.
5. CloudFront caches the object and returns it to the user.
6. Any direct request to S3 (without CloudFront's signature) is denied.

This is the correct architecture for a static frontend on AWS. Your files live in a private S3 bucket, and the only way to access them is through your CloudFront distribution.

> [!TIP]
> If you ever need to debug OAC issues, check three things: (1) the OAC ID on the distribution origin matches the OAC you created, (2) the bucket policy grants `s3:GetObject` to the `cloudfront.amazonaws.com` service principal with a condition on your distribution's ARN, and (3) the `S3OriginConfig.OriginAccessIdentity` field is an empty string (not omitted — empty).

## What is Next

Your content is locked behind CloudFront and properly secured. In the next lesson, you will learn how CloudFront caches your content — how cache behaviors, TTLs, and invalidations work — so you can control what gets cached, for how long, and how to force a refresh after deployments.
