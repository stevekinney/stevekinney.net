---
title: 'Solution: End-to-End Static Site Deployment'
description: >-
  Complete solution with every command and expected output for deploying a static site with S3 and CloudFront on AWS.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - deployment
  - exercise
  - solution
---

This is the complete solution for the [End-to-End Static Site Deployment exercise](static-site-deployment-exercise.md). I've included every command with its expected output so you can compare as you go.

## Why This Works

- This workflow turns two services into one deployment path: S3 stores the files, CloudFront serves them over HTTPS on a `*.cloudfront.net` domain.
- The bucket stays private because CloudFront is the only public entry point that needs direct read access.
- The final sync-plus-invalidation loop is the practical deployment cycle you will repeat long after the exercise is over.

If you want the AWS version of the end-to-end workflow open while you work, keep the [S3 static website tutorial](https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html) and the [CloudFront OAC guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) nearby.

## Create the S3 Bucket

Create the bucket:

```bash
aws s3 mb s3://my-frontend-app-assets \
  --region us-east-1
```

Expected output:

```
make_bucket: my-frontend-app-assets
```

Enable Block Public Access:

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region us-east-1
```

No output on success.

Verify:

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

## Upload Your Site

Create a minimal site if you don't have one:

```bash
mkdir -p build
echo '<!DOCTYPE html><html><head><title>My Site</title></head><body><h1>It works.</h1></body></html>' > build/index.html
```

Upload:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output:

```
upload: build/index.html to s3://my-frontend-app-assets/index.html
```

Verify:

```bash
aws s3 ls s3://my-frontend-app-assets \
  --region us-east-1
```

Expected:

```
2026-03-18 12:00:00        102 index.html
```

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

Expected:

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

## Create the CloudFront Distribution

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

Expected (abridged):

```json
{
  "Distribution": {
    "Id": "E1A2B3C4D5E6F7",
    "ARN": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7",
    "DomainName": "d1234abcdef.cloudfront.net",
    "Status": "InProgress"
  }
}
```

Save the distribution ID and domain name.

Wait for deployment:

```bash
aws cloudfront wait distribution-deployed \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1
```

No output on success. Verify:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

Expected:

```
HTTP/2 200
content-type: text/html
```

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

Verify CloudFront still works:

```bash
curl -I https://d1234abcdef.cloudfront.net/index.html
```

Expected: `200 OK`.

Verify direct S3 access is blocked:

```bash
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

Expected: `403 Forbidden`.

## Verify the Complete Pipeline

```bash
# HTTPS works on the CloudFront domain
curl -I https://d1234abcdef.cloudfront.net
```

Expected:

```
HTTP/2 200
content-type: text/html
```

```bash
# SPA routing works
curl -I https://d1234abcdef.cloudfront.net/any/spa/route
```

Expected:

```
HTTP/2 200
content-type: text/html
```

```bash
# Direct S3 access is blocked
curl -I https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/index.html
```

Expected:

```
HTTP/1.1 403 Forbidden
```

## Test a Deployment

Update the site content:

```bash
echo '<!DOCTYPE html><html><head><title>My Site</title></head><body><h1>Updated content.</h1></body></html>' > build/index.html
```

Sync to S3:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete \
  --output json
```

Expected:

```
upload: build/index.html to s3://my-frontend-app-assets/index.html
```

Invalidate the cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/*" \
  --region us-east-1 \
  --output json
```

Expected:

```json
{
  "Invalidation": {
    "Id": "I1EXAMPLE",
    "Status": "InProgress",
    "CreateTime": "2026-03-18T12:05:00Z",
    "InvalidationBatch": {
      "Paths": {
        "Quantity": 1,
        "Items": ["/*"]
      },
      "CallerReference": "cli-1710763500"
    }
  }
}
```

Wait a minute, then verify:

```bash
curl -s https://d1234abcdef.cloudfront.net | grep "Updated content"
```

Expected:

```
<h1>Updated content.</h1>
```

## Summary of Resources Created

| Resource                | Identifier                     |
| ----------------------- | ------------------------------ |
| S3 Bucket               | `my-frontend-app-assets`       |
| Origin Access Control   | `E1OAC2EXAMPLE`                |
| CloudFront Distribution | `E1A2B3C4D5E6F7`               |
| CloudFront Domain       | `d1234abcdef.cloudfront.net`   |
| S3 Bucket Policy        | CloudFront-only access via OAC |

Your static site is live at `https://d1234abcdef.cloudfront.net`, served globally through CloudFront, stored in a private S3 bucket, and secured with HTTPS via the default CloudFront certificate. The deployment cycle (sync + invalidate) updates the site in under a minute.

> [!TIP]
> Want to put this behind a custom domain? See the optional [Custom Domains, DNS, and Certificates](dns-for-frontend-engineers.md) section at the end of the course.
