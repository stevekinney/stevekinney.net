---
title: 'Solution: Configure DNS for Your Site'
description: >-
  Complete walkthrough of creating a hosted zone, pointing a domain to CloudFront with alias records, and verifying DNS resolution.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - route53
  - exercise
  - solution
---

This is the solution for the [Route 53 DNS Exercise](route-53-dns-exercise.md). Each step includes the exact commands, expected output, and troubleshooting guidance.

## Step 1: Create a Hosted Zone

```bash
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --region us-east-1 \
  --output json
```

**Expected output:**

```json
{
  "Location": "https://route53.amazonaws.com/2013-04-01/hostedzone/Z1234567890ABC",
  "HostedZone": {
    "Id": "/hostedzone/Z1234567890ABC",
    "Name": "example.com.",
    "CallerReference": "example-com-1710720000",
    "Config": {
      "PrivateZone": false
    },
    "ResourceRecordSetCount": 2
  },
  "ChangeInfo": {
    "Id": "/change/C1234567890ABC",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:00:00.000Z"
  },
  "DelegationSet": {
    "NameServers": [
      "ns-1234.awsdns-56.org",
      "ns-567.awsdns-12.net",
      "ns-890.awsdns-34.co.uk",
      "ns-123.awsdns-78.com"
    ]
  }
}
```

Store the hosted zone ID for later use:

```bash
HOSTED_ZONE_ID="Z1234567890ABC"
```

Or extract it programmatically:

```bash
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --output json \
  --query "HostedZones[?Name=='example.com.'].Id | [0]" \
  | tr -d '"' | sed 's|/hostedzone/||')

echo "$HOSTED_ZONE_ID"
```

**If you already have a hosted zone** (e.g., from domain registration), skip creation and just retrieve the ID:

```bash
aws route53 list-hosted-zones \
  --output json \
  --query "HostedZones[?Name=='example.com.'].{Id:Id,Name:Name}"
```

**If something went wrong:**

- `HostedZoneAlreadyExists`: A hosted zone with this caller reference already exists. Either use the existing zone or pick a different caller reference.
- `DelegationSetNotAvailable`: Rare. Retry the command — Route 53 will assign different nameservers.
- `TooManyHostedZones`: You have hit the limit (default 500 zones per account). Delete unused hosted zones.

### Configuring Nameservers (External Registrar Only)

If your domain is registered outside Route 53, update the nameservers at your registrar to:

```
ns-1234.awsdns-56.org
ns-567.awsdns-12.net
ns-890.awsdns-34.co.uk
ns-123.awsdns-78.com
```

Use your actual nameservers from the response, not these examples. After updating, verify that delegation is working:

```bash
dig example.com NS +short
```

**Expected output** (after propagation):

```
ns-1234.awsdns-56.org.
ns-567.awsdns-12.net.
ns-890.awsdns-34.co.uk.
ns-123.awsdns-78.com.
```

If you still see the old nameservers, propagation is not complete. This can take up to 48 hours but usually finishes within a few hours.

## Step 2: Create an A Alias Record for the Apex Domain

Get your CloudFront distribution's domain name if you do not have it saved:

```bash
aws cloudfront get-distribution \
  --id E1A2B3C4D5E6F7 \
  --output json \
  --query "Distribution.DomainName"
```

```json
"d111111abcdef8.cloudfront.net"
```

Create the A alias record:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
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

**Expected output:**

```json
{
  "ChangeInfo": {
    "Id": "/change/C2345678901BCD",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:01:00.000Z"
  }
}
```

**If something went wrong:**

- `InvalidChangeBatch: Alias target name does not lie within the target zone`: The `DNSName` in your alias target does not match a valid CloudFront distribution. Double-check the distribution domain name.
- `InvalidChangeBatch: RRSet with DNS name example.com. is not permitted in zone`: You are likely trying to create the record in the wrong hosted zone. Verify that the hosted zone is for `example.com`.
- `NoSuchHostedZone`: The hosted zone ID is wrong. Run `aws route53 list-hosted-zones --output json` to find the correct ID.

## Step 3: Create an AAAA Alias Record for IPv6

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
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

**Expected output:**

```json
{
  "ChangeInfo": {
    "Id": "/change/C3456789012CDE",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:02:00.000Z"
  }
}
```

The output is identical in structure to the A record. The only difference is the `"Type": "AAAA"` in the request.

## Step 4: Create Records for www

Create both A and AAAA alias records for `www.example.com` in a single call:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
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

**Expected output:**

```json
{
  "ChangeInfo": {
    "Id": "/change/C4567890123DEF",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:03:00.000Z"
  }
}
```

**If something went wrong:**

- `InvalidChangeBatch: Alias target name does not lie within the target zone`: Make sure `www.example.com` is listed as an alternate domain name (CNAME) on your CloudFront distribution. You can check with:
  ```bash
  aws cloudfront get-distribution-config \
    --id E1A2B3C4D5E6F7 \
    --output json \
    --query "DistributionConfig.Aliases"
  ```
  The output should include both `example.com` and `www.example.com`. If `www.example.com` is missing, update the distribution to add it.

## Step 5: Verify DNS Resolution

Wait about 60 seconds, then verify:

```bash
dig example.com A +short
```

**Expected output** (IP addresses will vary):

```
13.224.67.18
13.224.67.43
13.224.67.112
13.224.67.84
```

```bash
dig example.com AAAA +short
```

**Expected output** (IPv6 addresses will vary):

```
2600:9000:2252:7800:1a:b6c1:4a40:93a1
2600:9000:2252:ae00:1a:b6c1:4a40:93a1
2600:9000:2252:c200:1a:b6c1:4a40:93a1
2600:9000:2252:a400:1a:b6c1:4a40:93a1
```

If you do not see results, query a Route 53 nameserver directly:

```bash
dig example.com A @ns-1234.awsdns-56.org +short
```

If the direct query returns results but the general query does not, DNS propagation from your registrar's nameserver change is still in progress.

For the www subdomain:

```bash
dig www.example.com A +short
```

You should see the same pattern of CloudFront IP addresses.

### Browser Verification

Open `https://example.com` in a browser. You should see:

- Your frontend content loaded from S3 via CloudFront
- A valid SSL certificate (click the lock icon to verify it was issued by Amazon)
- The URL showing `https://example.com` (not the CloudFront domain)

If you created www records, `https://www.example.com` should show the same content.

## Step 6: List All Records

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --output json
```

**Expected output:**

```json
{
  "ResourceRecordSets": [
    {
      "Name": "example.com.",
      "Type": "NS",
      "TTL": 172800,
      "ResourceRecords": [
        { "Value": "ns-1234.awsdns-56.org." },
        { "Value": "ns-567.awsdns-12.net." },
        { "Value": "ns-890.awsdns-34.co.uk." },
        { "Value": "ns-123.awsdns-78.com." }
      ]
    },
    {
      "Name": "example.com.",
      "Type": "SOA",
      "TTL": 900,
      "ResourceRecords": [
        { "Value": "ns-1234.awsdns-56.org. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400" }
      ]
    },
    {
      "Name": "example.com.",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d111111abcdef8.cloudfront.net.",
        "EvaluateTargetHealth": false
      }
    },
    {
      "Name": "example.com.",
      "Type": "AAAA",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d111111abcdef8.cloudfront.net.",
        "EvaluateTargetHealth": false
      }
    },
    {
      "Name": "www.example.com.",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d111111abcdef8.cloudfront.net.",
        "EvaluateTargetHealth": false
      }
    },
    {
      "Name": "www.example.com.",
      "Type": "AAAA",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d111111abcdef8.cloudfront.net.",
        "EvaluateTargetHealth": false
      }
    }
  ]
}
```

The key things to confirm:

- **NS and SOA records** exist for `example.com` (auto-created, do not delete).
- **A and AAAA alias records** exist for `example.com`, both pointing to your CloudFront distribution.
- **A and AAAA alias records** exist for `www.example.com` (if you created them in Step 4).
- All alias records show `"HostedZoneId": "Z2FDTNDATAQYW2"` and your CloudFront distribution domain name.

## Summary

The complete flow, condensed:

```bash
# Store your values
HOSTED_ZONE_ID="Z1234567890ABC"
CF_DOMAIN="d111111abcdef8.cloudfront.net"

# Create hosted zone (skip if already exists)
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --region us-east-1 \
  --output json

# Create all alias records in one call
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --output json \
  --change-batch "{
    \"Changes\": [
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"example.com\",
          \"Type\": \"A\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      },
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"example.com\",
          \"Type\": \"AAAA\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      },
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"www.example.com\",
          \"Type\": \"A\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      },
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"www.example.com\",
          \"Type\": \"AAAA\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"Z2FDTNDATAQYW2\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      }
    ]
  }"

# Verify
dig example.com A +short
dig example.com AAAA +short
dig www.example.com A +short
```

You now have DNS fully configured. Your site is reachable at `https://example.com` and `https://www.example.com`, served through CloudFront, secured by ACM, with content stored in S3.
