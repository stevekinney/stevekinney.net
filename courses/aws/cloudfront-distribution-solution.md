---
title: 'Solution: Set Up a CloudFront Distribution'
description: >-
  Complete solution with all CLI commands for creating a CloudFront distribution with S3 origin, OAC, and SPA routing.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - cloudfront
  - exercise
  - solution
---

This is the complete solution for the [CloudFront Distribution Exercise](cloudfront-distribution-exercise.md). Every command is shown with its expected output.

## Why This Works

- Origin Access Control keeps S3 private while still allowing CloudFront to read the files your users need.
- Custom error responses make a single-page app behave like a frontend router instead of a pile of missing-object errors.
- The distribution becomes the enforcement point for HTTPS, caching, and security headers, which is why it sits between your users and the bucket.

> [!TIP]
> If the console or CLI output shifts while you're doing this, keep the [CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) and the [OAC setup guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) open.

## Create an Origin Access Control

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

Expected output:

```json
{
  "Location": "https://cloudfront.amazonaws.com/2020-05-31/origin-access-control/E1OAC2EXAMPLE",
  "ETag": "E1ETAG1EXAMPLE",
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

Save the `Id` value (`E1OAC2EXAMPLE`).

## Create the Distribution

Save the following as `distribution-config.json`:

```json
{
  "CallerReference": "my-frontend-app-2026-03-18",
  "Comment": "CloudFront distribution for my-frontend-app-assets",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-my-frontend-app-assets",
        "DomainName": "my-frontend-app-assets.s3.us-east-1.amazonaws.com",
        "OriginAccessControlId": "E1OAC2EXAMPLE",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-my-frontend-app-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      }
    ]
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  },
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "none",
      "Quantity": 0
    }
  }
}
```

Create the distribution:

```bash
aws cloudfront create-distribution \
  --distribution-config file://distribution-config.json \
  --region us-east-1 \
  --output json
```

Expected output (abridged to the fields you need):

```json
{
  "Distribution": {
    "Id": "E1A2B3C4D5E6F7",
    "ARN": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7",
    "DomainName": "d1234abcdef.cloudfront.net",
    "Status": "InProgress",
    "DistributionConfig": {
      "CallerReference": "my-frontend-app-2026-03-18",
      "Comment": "CloudFront distribution for my-frontend-app-assets",
      "Enabled": true,
      "DefaultRootObject": "index.html",
      "PriceClass": "PriceClass_100",
      "HttpVersion": "http2and3",
      "IsIPV6Enabled": true,
      "Origins": {
        "Quantity": 1,
        "Items": [
          {
            "Id": "S3-my-frontend-app-assets",
            "DomainName": "my-frontend-app-assets.s3.us-east-1.amazonaws.com",
            "OriginAccessControlId": "E1OAC2EXAMPLE",
            "S3OriginConfig": {
              "OriginAccessIdentity": ""
            }
          }
        ]
      },
      "DefaultCacheBehavior": {
        "TargetOriginId": "S3-my-frontend-app-assets",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true,
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        }
      },
      "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
          {
            "ErrorCode": 403,
            "ResponsePagePath": "/index.html",
            "ResponseCode": "200",
            "ErrorCachingMinTTL": 10
          },
          {
            "ErrorCode": 404,
            "ResponsePagePath": "/index.html",
            "ResponseCode": "200",
            "ErrorCachingMinTTL": 10
          }
        ]
      },
      "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
      },
      "Restrictions": {
        "GeoRestriction": {
          "RestrictionType": "none",
          "Quantity": 0
        }
      }
    }
  }
}
```

Save the distribution ID (`E1A2B3C4D5E6F7`) and domain name (`d1234abcdef.cloudfront.net`).

Wait for the distribution to deploy:

```bash
aws cloudfront wait distribution-deployed \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1
```

This command blocks until the status changes from `InProgress` to `Deployed`. No output means success.

## Update the S3 Bucket Policy

Save the following as `bucket-policy-oac.json`:

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

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket my-frontend-app-assets \
  --policy file://bucket-policy-oac.json \
  --region us-east-1
```

No output on success.

Verify the policy:

```bash
aws s3api get-bucket-policy \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Test CloudFront access:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

Expected:

```
HTTP/2 200
content-type: text/html
```

Test that direct S3 access is blocked:

```bash
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

Expected:

```
HTTP/1.1 403 Forbidden
```

## Re-enable Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region us-east-1
```

No output on success.

Verify Block Public Access is enabled:

```bash
aws s3api get-public-access-block \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected:

```json
{
  "PublicAccessBlockConfiguration": {
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }
}
```

Verify CloudFront still works:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

Still `200 OK`. The CloudFront service principal policy isn't considered a "public" policy.

## Test SPA Routing

```bash
curl -I https://d1234abcdef.cloudfront.net/dashboard/settings
```

Expected:

```
HTTP/2 200
content-type: text/html
```

The custom error response intercepts the 403 from S3 (because `/dashboard/settings` doesn't exist as an object) and returns `/index.html` with a 200 status code. Your client-side router handles the rest.

Test another non-existent path:

```bash
curl -I https://d1234abcdef.cloudfront.net/users/123/profile
```

Same result: `200 OK` with `text/html`.

## Attach the Security Headers Policy

Fetch the current distribution config:

```bash
aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json > distribution-config-current.json
```

Note the `ETag` in the response (e.g., `E3ETAG3EXAMPLE`).

Edit the `DistributionConfig` to add `ResponseHeadersPolicyId` to the `DefaultCacheBehavior`. The updated behavior should look like this:

```json
{
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-my-frontend-app-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    }
  }
}
```

Extract the `DistributionConfig` (without the `ETag` wrapper) into `distribution-config-updated.json` and submit:

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match E3ETAG3EXAMPLE \
  --distribution-config file://distribution-config-updated.json \
  --region us-east-1 \
  --output json
```

Wait for deployment:

```bash
aws cloudfront wait distribution-deployed \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1
```

Verify the security headers:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

Expected (among other headers):

```
strict-transport-security: max-age=31536000
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
```

## Final Verification

Run all checks:

```bash
# Distribution status
aws cloudfront get-distribution \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json \
  --query "Distribution.{Id:Id,Domain:DomainName,Status:Status}"
```

Expected:

```json
{
  "Id": "E1A2B3C4D5E6F7",
  "Domain": "d1234abcdef.cloudfront.net",
  "Status": "Deployed"
}
```

```bash
# HTTPS works
curl -I https://d1234abcdef.cloudfront.net

# SPA routing works
curl -I https://d1234abcdef.cloudfront.net/any/spa/route

# S3 is locked down
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

Expected results: CloudFront returns `200 OK` for both the root and the SPA route. Direct S3 access returns `403 Forbidden`.

## Summary of Resources Created

| Resource                | Identifier                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| Origin Access Control   | `E1OAC2EXAMPLE`                                                        |
| CloudFront Distribution | `E1A2B3C4D5E6F7`                                                       |
| Distribution Domain     | `d1234abcdef.cloudfront.net`                                           |
| S3 Bucket Policy        | Updated to allow only CloudFront                                       |
| Response Headers Policy | `67f7725c-6f97-4210-82d7-5512b31e9d03` (managed SecurityHeadersPolicy) |
| Cache Policy            | `658327ea-f89d-4fab-a63d-7e88639e58f6` (managed CachingOptimized)      |

Your distribution is live and secured on its `*.cloudfront.net` domain. If you want to attach a custom domain later, see the optional [Custom Domains, DNS, and Certificates](dns-for-frontend-engineers.md) section at the end of the course.

## Cleanup

When you're done with this exercise, tear down the resources to avoid ongoing charges. The distribution must be _disabled_ before CloudFront will let you delete it—and disabling is the slow part (15–30 minutes). The actual deletion is fast once the status reaches `Deployed`.

> [!WARNING] Before you copy these commands
> The IDs below (`E1A2B3C4D5E6F7` for the distribution, `E1OAC2EXAMPLE` for the OAC) are placeholders—replace them with your actual IDs. Find yours with `aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,Domain:DomainName}' --output table` and `aws cloudfront list-origin-access-controls --output table`.
>
> Run these commands in a single shell session so `$ETAG`, `$NEW_ETAG`, and `$OAC_ETAG` stay in scope. If you come back in a new terminal, re-fetch each ETag before running the command that uses it.
>
> Double-check that `"Enabled": false` in `distribution-config.json` before submitting the update. Leaving it `true` is the single most common way this cleanup fails—`delete-distribution` rejects an enabled distribution with `DistributionNotDisabled`, and the `wait distribution-deployed` call that follows will look stuck.

Fetch the current config and ETag:

```bash
ETAG=$(aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --query 'ETag' --output text)

aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --query 'DistributionConfig' \
  --output json > distribution-config.json
```

Edit `distribution-config.json` and set `"Enabled": false`, then submit the update:

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --distribution-config file://distribution-config.json \
  --if-match "$ETAG"
```

Wait for `Status: Deployed` (this is the slow step—grab a coffee):

```bash
aws cloudfront wait distribution-deployed --id E1A2B3C4D5E6F7
```

Fetch the new ETag (it changes on every update), then delete:

```bash
NEW_ETAG=$(aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --query 'ETag' --output text)

aws cloudfront delete-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match "$NEW_ETAG"
```

Delete the OAC:

```bash
OAC_ETAG=$(aws cloudfront get-origin-access-control \
  --id E1OAC2EXAMPLE \
  --query 'ETag' --output text)

aws cloudfront delete-origin-access-control \
  --id E1OAC2EXAMPLE \
  --if-match "$OAC_ETAG"
```
