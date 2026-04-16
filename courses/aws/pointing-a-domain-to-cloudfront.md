---
title: 'Pointing a Domain to CloudFront'
description: >-
  Create DNS records that point your custom domain to your CloudFront distribution, making your site accessible at your own domain name.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - route53
  - cloudfront
  - dns
---

Your CloudFront distribution is live, but right now you access it at something like `d111111abcdef8.cloudfront.net`. That's not what you ship to production. You want users to visit `example.com` and have it serve your frontend through CloudFront—with your ACM certificate, your cache behaviors, your origin access control. This is where Route 53 ties the infrastructure together: you create DNS records that point your domain at the distribution, and the CloudFront URL disappears behind your brand.

If you want AWS's version of the routing mechanics while you work, keep the [Route 53 DNS configuration guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html) and the [`aws route53 change-resource-record-sets` command reference](https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html) open.

## Prerequisites

Before you create DNS records, you need three things in place:

1. **A CloudFront distribution** with your domain listed as an **alternate domain name (CNAME)**. You configured the distribution in [Creating a CloudFront Distribution](creating-a-cloudfront-distribution.md) and added the aliases in [Attaching an SSL Certificate](attaching-an-ssl-certificate.md). If your distribution doesn't list `example.com` (and optionally `www.example.com`) as an alternate domain name, Route 53 will refuse to create an alias record pointing to it.

2. **An ACM certificate** covering your domain, attached to the distribution. You requested it in [Requesting a Certificate in ACM](requesting-a-certificate-in-acm.md), validated it in [DNS Validation vs. Email Validation](dns-validation-vs-email-validation.md), and attached it in [Attaching an SSL Certificate](attaching-an-ssl-certificate.md). The certificate must be in `us-east-1`.

3. **A Route 53 hosted zone** for your domain, with nameservers configured at your registrar. You set that up in the domain and DNS foundation lessons.

## Creating an A Alias Record for the Apex Domain

The most common setup is pointing the bare domain (`example.com`) to your CloudFront distribution. Since `example.com` is the **zone apex**, you can't use a CNAME record here (we cover why in [Alias Records vs. CNAME Records](alias-records-vs-cname-records.md)). Instead, you use a Route 53 **alias record**.

First, get your hosted zone ID:

```bash
aws route53 list-hosted-zones \
  --output json \
  --query "HostedZones[?Name=='example.com.'].Id"
```

```json
["/hostedzone/Z1234567890ABC"]
```

Now create the alias A record. CloudFront distributions always use `Z2FDTNDATAQYW2` as the hosted zone ID for alias targets—this is a fixed value for all CloudFront distributions globally:

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

A few things to note in that command:

- **`HostedZoneId`** is `Z2FDTNDATAQYW2`. This isn't your hosted zone ID—it's the fixed identifier that Route 53 uses for all CloudFront distributions. Every alias record pointing to CloudFront uses this same value.
- **`DNSName`** is the domain name of your CloudFront distribution (the `d111111abcdef8.cloudfront.net` value).
- **`EvaluateTargetHealth`** is `false`. CloudFront doesn't support Route 53 health checks, so this must always be `false` for CloudFront alias targets.
- There is no `TTL` field. Alias records inherit the TTL from the target resource—Route 53 handles this automatically.

The response confirms the change:

```json
{
  "ChangeInfo": {
    "Id": "/change/C1234567890ABC",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:00:00.000Z"
  }
}
```

`PENDING` means Route 53 is propagating the change. This typically completes in under 60 seconds.

## Adding an AAAA Alias Record for IPv6

CloudFront supports IPv6 by default. To ensure your domain resolves correctly for clients on IPv6 networks, create a second alias record with type `AAAA`:

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

The command is identical to the A record, except `"Type"` is `"AAAA"`. Route 53 resolves the alias to the appropriate IPv6 addresses for your CloudFront distribution. (I know it feels redundant, but IPv6 support is one of those things you'll be glad you set up from the start.)

> [!TIP]
> You can combine both records into a single `change-resource-record-sets` call by including both changes in the `Changes` array. This is cleaner for scripts and ensures both records are created atomically.

## Handling the www Subdomain

Most sites serve traffic on both `example.com` and `www.example.com`. You have two options:

### Option A: Alias Records for Both

Create the same A and AAAA alias records for `www.example.com`, pointing to the same CloudFront distribution. This means both the apex and `www` resolve directly to CloudFront:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d111111abcdef8.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "www.example.com",
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

Make sure `www.example.com` is listed as an alternate domain name on your CloudFront distribution, and that your ACM certificate covers it (a wildcard certificate for `*.example.com` handles this automatically).

### Option B: CNAME from www to Apex

Create a CNAME record that maps `www.example.com` to `example.com`. Since `www` isn't the zone apex, CNAME is valid here:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "example.com"
            }
          ]
        }
      }
    ]
  }'
```

Option A is preferable because alias records are free (no query charges) and resolve in one step. Option B adds an extra DNS lookup and incurs standard query charges.

## With the SDK

```typescript
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListHostedZonesCommand,
} from '@aws-sdk/client-route-53';

const r53 = new Route53Client({ region: 'us-east-1' });
// Route 53 is a global service — the SDK requires a region for signing but
// the actual API endpoint is us-east-1 behind the scenes.

const zones = await r53.send(new ListHostedZonesCommand({}));
const zoneId = zones.HostedZones?.find((z) => z.Name === 'example.com.')
  ?.Id?.split('/')
  .pop()!;

await r53.send(
  new ChangeResourceRecordSetsCommand({
    HostedZoneId: zoneId,
    ChangeBatch: {
      Changes: [
        // Apex A-alias + AAAA-alias + www in a single atomic change.
        ...(['A', 'AAAA'] as const).flatMap((type) =>
          ['example.com', 'www.example.com'].map((name) => ({
            Action: 'UPSERT' as const,
            ResourceRecordSet: {
              Name: name,
              Type: type,
              AliasTarget: {
                // The hardcoded CloudFront alias hosted zone ID.
                HostedZoneId: 'Z2FDTNDATAQYW2',
                DNSName: 'd1234abcdef.cloudfront.net',
                EvaluateTargetHealth: false,
              },
            },
          })),
        ),
      ],
    },
  }),
);
```

The SDK lets you batch several record changes into one call without the JSON-file choreography the CLI needs. `UPSERT` is idempotent: it creates the record if it's missing and replaces it if it exists.

## Verifying DNS Resolution

After creating your records, verify that DNS is resolving correctly.

Check the A record:

```bash
dig example.com A +short
```

You should see one or more IP addresses—these are CloudFront edge server IPs. They'll vary by region and over time; that's expected.

Check the AAAA record:

```bash
dig example.com AAAA +short
```

You should see one or more IPv6 addresses.

To bypass caches and query Route 53 directly, use one of the nameservers from your hosted zone:

```bash
dig example.com A @ns-1234.awsdns-56.org +short
```

If this returns the correct IPs but `dig example.com A +short` doesn't, the records are correct at the source and you're waiting for caches to expire.

You can also verify in a browser. Navigate to `https://example.com`. If your ACM certificate is attached to the distribution and the alternate domain name is configured, you should see your site served over HTTPS with a valid certificate. Check the browser's address bar for the lock icon.

> [!WARNING]
> If you see a CloudFront error like "Bad Request" or "The request could not be satisfied," the most likely cause is that your domain isn't listed as an alternate domain name on the CloudFront distribution. CloudFront rejects requests for hostnames it doesn't recognize. Double-check the distribution settings in the console or run `aws cloudfront get-distribution-config --id E1A2B3C4D5E6F7 --output json --query "DistributionConfig.Aliases"`.

## Propagation Time

DNS changes in Route 53 take effect within 60 seconds on Route 53's own nameservers. But that doesn't mean every user on the internet sees the change immediately. Recursive resolvers around the world may have cached the old answer, and they'll continue serving it until the TTL expires.

If you set a TTL of 300 seconds (5 minutes) on the previous record, the worst case is that some users see the old record for up to 5 minutes after the change. For new records that didn't previously exist, there's no old cache to expire—the record is visible as soon as Route 53 propagates it.

## What You Built

You created A and AAAA alias records that point your domain to your CloudFront distribution. Your site is now accessible at `example.com` over HTTPS, served through CloudFront's global edge network, with content pulled from your S3 bucket. This is the stack: S3 stores the files, CloudFront distributes them, ACM secures them, and Route 53 makes them reachable at your domain.
