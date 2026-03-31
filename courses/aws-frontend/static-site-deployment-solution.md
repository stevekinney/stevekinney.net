---
title: 'Solution: End-to-End Static Site Deployment'
description: >-
  Complete solution with every command and expected output for deploying a static site end to end on AWS.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - deployment
  - exercise
  - solution
---

This is the complete solution for the [End-to-End Static Site Deployment exercise](static-site-deployment-exercise.md). I've included every command with its expected output so you can compare as you go.

## Why This Works

- This workflow turns four separate services into one deployment path: S3 stores the files, CloudFront serves them, ACM terminates TLS, and Route 53 points the domain at the edge.
- The bucket stays private because CloudFront is the only public entry point that needs direct read access.
- The final sync-plus-invalidation loop is the practical deployment cycle you will repeat long after the exercise is over.

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

## Request an ACM Certificate

Request the certificate:

```bash
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names www.example.com \
  --validation-method DNS \
  --region us-east-1 \
  --output json
```

Expected:

```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Save the certificate ARN.

Get the DNS validation records:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --region us-east-1 \
  --output json \
  --query "Certificate.DomainValidationOptions"
```

Expected (abridged):

```json
[
  {
    "DomainName": "example.com",
    "ValidationDomain": "example.com",
    "ValidationStatus": "PENDING_VALIDATION",
    "ResourceRecord": {
      "Name": "_abc123.example.com.",
      "Type": "CNAME",
      "Value": "_def456.acm-validations.aws."
    },
    "ValidationMethod": "DNS"
  },
  {
    "DomainName": "www.example.com",
    "ValidationDomain": "www.example.com",
    "ValidationStatus": "PENDING_VALIDATION",
    "ResourceRecord": {
      "Name": "_ghi789.www.example.com.",
      "Type": "CNAME",
      "Value": "_jkl012.acm-validations.aws."
    },
    "ValidationMethod": "DNS"
  }
]
```

Create the validation records in Route 53. First, get your hosted zone ID:

```bash
aws route53 list-hosted-zones-by-name \
  --dns-name example.com \
  --region us-east-1 \
  --output json \
  --query "HostedZones[0].Id"
```

Expected:

```
"/hostedzone/Z1234567890ABC"
```

Create the validation records (replace the `Name` and `Value` fields with the actual values from the `describe-certificate` output):

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_abc123.example.com.",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "_def456.acm-validations.aws."}
          ]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_ghi789.www.example.com.",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "_jkl012.acm-validations.aws."}
          ]
        }
      }
    ]
  }' \
  --region us-east-1 \
  --output json
```

Wait for the certificate to be issued (this can take several minutes):

```bash
aws acm wait certificate-validated \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --region us-east-1
```

No output on success. Verify:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --region us-east-1 \
  --output json \
  --query "Certificate.Status"
```

Expected:

```
"ISSUED"
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
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Aliases": {
    "Quantity": 2,
    "Items": ["example.com", "www.example.com"]
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

## Create Route 53 DNS Records

Get your hosted zone ID:

```bash
aws route53 list-hosted-zones-by-name \
  --dns-name example.com \
  --region us-east-1 \
  --output json \
  --query "HostedZones[0].Id"
```

Expected:

```
"/hostedzone/Z1234567890ABC"
```

Create A alias records for both the apex domain and `www`:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d1234abcdef.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d1234abcdef.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }' \
  --region us-east-1 \
  --output json
```

> [!TIP]
> The `HostedZoneId` value `Z2FDTNDATAQYW2` is the fixed hosted zone ID for all CloudFront distributions. This isn't your domain's hosted zone ID — it's a constant defined by AWS. You use your domain's hosted zone ID in the `--hosted-zone-id` parameter, and CloudFront's fixed ID in the `AliasTarget`.

Expected:

```json
{
  "ChangeInfo": {
    "Id": "/change/C1EXAMPLE",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:00:00Z"
  }
}
```

Wait for the DNS change to propagate:

```bash
aws route53 wait resource-record-sets-changed \
  --id /change/C1EXAMPLE \
  --region us-east-1
```

## Verify the Complete Pipeline

```bash
# DNS resolves
dig example.com +short
```

Expected: One or more CloudFront IP addresses.

```bash
# HTTPS works with your certificate
curl -vI https://example.com 2>&1 | grep "subject:"
```

Expected (the subject should contain your domain):

```
*  subject: CN=example.com
```

```bash
# CloudFront serves your content
curl -I https://example.com
```

Expected:

```
HTTP/2 200
content-type: text/html
```

```bash
# SPA routing works
curl -I https://example.com/any/spa/route
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

```bash
# www subdomain works
curl -I https://www.example.com
```

Expected:

```
HTTP/2 200
content-type: text/html
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
curl -s https://example.com | grep "Updated content"
```

Expected:

```
<h1>Updated content.</h1>
```

## Summary of Resources Created

| Resource                 | Identifier                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------- |
| S3 Bucket                | `my-frontend-app-assets`                                                              |
| ACM Certificate          | `arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| Origin Access Control    | `E1OAC2EXAMPLE`                                                                       |
| CloudFront Distribution  | `E1A2B3C4D5E6F7`                                                                      |
| CloudFront Domain        | `d1234abcdef.cloudfront.net`                                                          |
| Route 53 A Record (apex) | `example.com` -> CloudFront                                                           |
| Route 53 A Record (www)  | `www.example.com` -> CloudFront                                                       |
| S3 Bucket Policy         | CloudFront-only access via OAC                                                        |

Your static site is live at `https://example.com`, served globally through CloudFront, secured with an ACM certificate, stored in a private S3 bucket, and resolved by Route 53. The deployment cycle (sync + invalidate) updates the site in under a minute.
