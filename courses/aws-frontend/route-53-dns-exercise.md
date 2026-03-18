---
title: 'Exercise: Configure DNS for Your Site'
description: >-
  Create a hosted zone, point a domain to a CloudFront distribution with alias records, and verify DNS resolution.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - route53
  - exercise
---

You have a CloudFront distribution serving your frontend and an ACM certificate attached to it. The distribution works at its `d111111abcdef8.cloudfront.net` URL, but nobody ships a CloudFront domain to production. In this exercise, you will wire up your own domain so users visit `example.com` and get your site served through CloudFront.

## Why It Matters

DNS is the final piece of the static hosting stack. Without it, your deployment is functional but unreachable at a real domain. Once you complete this exercise, you will have a full end-to-end deployment: S3 stores the files, CloudFront distributes them, ACM secures the connection, and Route 53 makes the whole thing reachable at your domain name. This is the same stack that production frontend applications run on.

## Prerequisites

- An AWS account with CLI access configured (see [Setting Up the AWS CLI](setting-up-the-aws-cli.md))
- A CloudFront distribution with your domain listed as an alternate domain name and an ACM certificate attached (see [Creating a CloudFront Distribution](creating-a-cloudfront-distribution.md) and [Requesting a Certificate in ACM](requesting-a-certificate-in-acm.md))
- A domain name you control. If you registered one during the ACM exercise, use that. If not, see [Registering and Transferring Domains](registering-and-transferring-domains.md) for options.

> [!TIP]
> If your domain is already registered through Route 53, a hosted zone was created automatically during registration. You can skip Step 1 and go directly to Step 2. Run `aws route53 list-hosted-zones --output json` to confirm.

## Step 1: Create a Hosted Zone

Create a public hosted zone for your domain. Replace `example.com` with your actual domain:

```bash
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --region us-east-1 \
  --output json
```

From the response, note two things:

1. The **hosted zone ID** (in the `HostedZone.Id` field, e.g., `/hostedzone/Z1234567890ABC`). You will use the ID portion (`Z1234567890ABC`) in subsequent commands.
2. The **four nameservers** in the `DelegationSet.NameServers` array.

If your domain is registered outside Route 53, log into your registrar and update the domain's nameservers to the four Route 53 nameservers from the response. This step is critical — without it, DNS queries for your domain will not reach Route 53.

### Checkpoint

- The `create-hosted-zone` command completed without errors.
- You have the hosted zone ID saved.
- If your domain is registered externally, you have updated the nameservers at your registrar.

## Step 2: Create an A Alias Record for the Apex Domain

Create an alias A record that points your bare domain (`example.com`) to your CloudFront distribution. You will need:

- Your hosted zone ID from Step 1
- Your CloudFront distribution's domain name (e.g., `d111111abcdef8.cloudfront.net`)

The CloudFront hosted zone ID for alias targets is always `Z2FDTNDATAQYW2`.

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d111111abcdef8.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

### Checkpoint

- The command returned a `ChangeInfo` object with `"Status": "PENDING"`.
- No errors about the alias target. If you see an error, verify that your CloudFront distribution lists `example.com` as an alternate domain name.

## Step 3: Create an AAAA Alias Record for IPv6

Create a matching AAAA record so your domain resolves over IPv6:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "AAAA",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d111111abcdef8.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

### Checkpoint

- The command succeeded with `"Status": "PENDING"`.
- You now have both an A and an AAAA alias record for `example.com`.

## Step 4: Create Records for www (Optional but Recommended)

If you want `www.example.com` to work as well, create alias records for it. Make sure `www.example.com` is listed as an alternate domain name on your CloudFront distribution (or that your ACM certificate covers `*.example.com`).

Create both A and AAAA alias records for `www.example.com` pointing to the same CloudFront distribution.

### Checkpoint

- If you created www records, you now have four alias records total: A and AAAA for both `example.com` and `www.example.com`.

## Step 5: Verify DNS Resolution

Wait about 60 seconds for Route 53 to propagate the changes, then verify:

Check the A record:

```bash
dig example.com A +short
```

You should see one or more IP addresses (these are CloudFront edge server IPs).

Check the AAAA record:

```bash
dig example.com AAAA +short
```

You should see one or more IPv6 addresses.

If the records are not resolving yet, query a Route 53 nameserver directly to confirm the records are correct at the source:

```bash
dig example.com A @ns-1234.awsdns-56.org +short
```

Replace the nameserver with one of the four from your hosted zone.

### Checkpoint

- `dig example.com A +short` returns IP addresses.
- `dig example.com AAAA +short` returns IPv6 addresses.
- Opening `https://example.com` in a browser shows your frontend with a valid SSL certificate.

## Step 6: List All Records in Your Hosted Zone

Verify the complete state of your hosted zone:

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json
```

You should see your NS and SOA records (auto-created), plus the A and AAAA alias records you just created. If you completed the ACM exercise, you may also see the CNAME validation record.

### Checkpoint

- The output includes NS, SOA, A, and AAAA records for your domain.
- The A and AAAA records show `AliasTarget` with your CloudFront distribution's domain name.

## What You Built

You now have a complete DNS configuration: a hosted zone in Route 53 with alias records pointing your domain to your CloudFront distribution. Your frontend is accessible at `https://example.com` with a valid SSL certificate, global CDN distribution, and DNS resolution handled by Route 53.

This completes the foundation stack: S3 (storage) + CloudFront (CDN) + ACM (certificates) + Route 53 (DNS).

## Stretch Goals

- **Test with `nslookup`**: Run `nslookup example.com` and compare the output to `dig`. Notice how `nslookup` shows which nameserver answered the query.
- **Check TTL behavior**: Run `dig example.com A` (without `+short`) and look at the TTL value in the answer section. Run it again 30 seconds later and notice the TTL has decreased. This is the cache counting down.
- **Query from different resolvers**: Compare results from different public DNS resolvers to see if they all return the same answer:
  ```bash
  dig example.com A @1.1.1.1 +short
  dig example.com A @8.8.8.8 +short
  dig example.com A @9.9.9.9 +short
  ```
- **Redirect www to apex**: If you did not create www records, set up a simple S3 redirect bucket that sends `www.example.com` to `example.com`. This ensures users who type `www` still reach your site.
