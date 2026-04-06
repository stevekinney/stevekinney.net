---
title: 'Hosted Zones and Record Types'
description: >-
  Create a hosted zone in Route 53 and understand the common DNS record types (A, AAAA, CNAME, MX, TXT) and when to use each.
date: 2026-03-18
modified: 2026-04-06
tags:
  - aws
  - route53
  - dns
  - hosted-zones
---

A **hosted zone** is Route 53's container for DNS records. If you think of DNS as a phone book, the hosted zone is the page for your domain—it holds every record that tells the internet how to reach your services. When you create a hosted zone for `example.com`, Route 53 becomes the authoritative nameserver for that domain, and every DNS query for `example.com` or its subdomains gets answered by the records you configure inside the zone.

If you want AWS's canonical explanation of hosted zones and delegation, keep the [Route 53 DNS configuration guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring.html) and the [hosted zones guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) open.

If you registered your domain through Route 53 in the previous lesson, you may already have a hosted zone. If your domain lives somewhere else, this is the step where Route 53 becomes authoritative for DNS.

## Creating a Hosted Zone

You can create a hosted zone in the console or the CLI. Here's the CLI version:

```bash
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --region us-east-1 \
  --output json
```

The `--caller-reference` is a unique string that prevents duplicate hosted zones from being created if you accidentally run the command twice. A timestamp works fine for this.

The response includes the hosted zone ID and the four nameservers that Route 53 assigned:

```json
{
  "HostedZone": {
    "Id": "/hostedzone/Z1234567890ABC",
    "Name": "example.com.",
    "CallerReference": "example-com-1710720000",
    "Config": {
      "PrivateZone": false
    },
    "ResourceRecordSetCount": 2
  },
  "DelegationSet": {
    "NameServers": [
      "ns-1234.awsdns-56.org",
      "ns-567.awsdns-12.net",
      "ns-890.awsdns-34.co.uk",
      "ns-123.awsdns-78.com"
    ]
  },
  "ChangeInfo": {
    "Id": "/change/C1234567890ABC",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:00:00.000Z"
  }
}
```

Notice that `ResourceRecordSetCount` starts at 2. Route 53 automatically creates two records for every new hosted zone: an **NS record** and an **SOA record**. These are the foundation of your zone, and you shouldn't delete them.

## Public vs. Private Hosted Zones

Route 53 supports two types of hosted zones:

- **Public hosted zones** respond to DNS queries from the public internet. This is what you use for your frontend: users around the world query DNS for `example.com`, and your public hosted zone answers.
- **Private hosted zones** respond to DNS queries from within one or more VPCs (Virtual Private Clouds). They're used for internal service discovery—one microservice finding another inside your AWS network. Not something you need for frontend hosting.

For this course, every hosted zone is public. If you see `"PrivateZone": false` in your output, you're on the right track.

## NS Records and Delegation

The **NS (Name Server) records** in your hosted zone list the four nameservers that Route 53 assigned. These are the servers that will answer DNS queries for your domain. But there's a catch: having NS records inside your hosted zone doesn't do anything by itself. You also need to tell your domain registrar to use these nameservers.

If you registered your domain through Route 53, this happens automatically—Route 53 creates the hosted zone and updates the registration's nameservers in one step. If you registered your domain elsewhere (GoDaddy, Namecheap, Google Domains, Cloudflare), you need to log into your registrar and replace the default nameservers with the four Route 53 nameservers.

This is the moment of **delegation**: you're telling the DNS hierarchy, "When someone asks for `example.com`, send them to Route 53." Until you do this, your hosted zone exists but nobody knows to ask it anything.

> [!WARNING]
> When you change nameservers at your registrar, DNS resolution for your domain may be disrupted for a period of time. The old nameservers stop answering, and the new ones take over as the change propagates through DNS caches. Plan this for a low-traffic window, and lower your TTLs beforehand (as discussed in [DNS for Frontend Engineers](dns-for-frontend-engineers.md)).

## SOA Records

The **SOA (Start of Authority) record** contains administrative information about the zone: the primary nameserver, the email of the domain administrator, the serial number (which increments on changes), and timing values for cache refresh intervals. Route 53 manages the SOA record for you. You don't need to edit it, and you should leave it alone.

## Record Types

Here are the DNS record types you'll work with in Route 53. Each one serves a different purpose, and knowing when to use each is the difference between a working deployment and a confusing debugging session.

### A Records

An **A record** maps a domain name to an IPv4 address. This is the most fundamental DNS record type—it answers the question "what IP address should I connect to?"

```
example.com.    300    IN    A    192.0.2.1
```

In Route 53, you'll often use A records with the **alias** feature instead of pointing to a raw IP address. An alias A record points to an AWS resource (like a CloudFront distribution) and resolves to whatever IP addresses that resource is currently using. You'll use that later when you point your domain at CloudFront.

### AAAA Records

An **AAAA record** is identical to an A record, but for IPv6 addresses. IPv6 addresses are 128-bit (compared to IPv4's 32-bit), so they look like `2001:0db8:85a3::8a2e:0370:7334`.

CloudFront supports IPv6 by default. If you want your domain to resolve over both IPv4 and IPv6, you create both an A record and an AAAA record pointing to the same CloudFront distribution.

### CNAME Records

A **CNAME (Canonical Name) record** maps one domain name to another domain name. Instead of answering with an IP address, it says: "Go ask that other domain instead."

```
www.example.com.    300    IN    CNAME    d111111abcdef8.cloudfront.net.
```

When a resolver encounters a CNAME, it follows the chain: it looks up the target domain (`d111111abcdef8.cloudfront.net`) and returns whatever A or AAAA record it finds there.

CNAME records have one critical limitation: **they can't be used at the zone apex**. The zone apex is the bare domain—`example.com` without any subdomain prefix. This is a fundamental DNS protocol rule, not an AWS limitation. If you try to create a CNAME for `example.com`, it would conflict with the NS and SOA records that must exist at the apex. This is exactly why Route 53's alias records exist—they solve this problem.

### MX Records

**MX (Mail Exchange) records** specify the mail servers responsible for receiving email for your domain. Each MX record includes a priority number (lower numbers are tried first) and the hostname of the mail server.

```
example.com.    300    IN    MX    10 mail.example.com.
example.com.    300    IN    MX    20 mail-backup.example.com.
```

You probably don't need to create MX records for a frontend deployment. But if you're managing the full domain in Route 53 and you use a third-party email provider (Google Workspace, Microsoft 365), you'll add their MX records to your hosted zone.

### TXT Records

**TXT records** hold arbitrary text strings. They are the Swiss Army knife of DNS, used for:

- **Domain verification**: Google Search Console, email providers, and certificate authorities use TXT records to prove you control a domain.
- **Email authentication**: SPF, DKIM, and DMARC records are all TXT records that help prevent email spoofing.
- **Certificate or service verification**: Some systems prove domain ownership with TXT records. ACM happens to use CNAME records for DNS validation, but the idea is the same.

```
example.com.    300    IN    TXT    "v=spf1 include:_spf.google.com ~all"
```

## Creating Records via the CLI

To create a DNS record in Route 53, you use the `change-resource-record-sets` command. Here's an example that creates a standard A record:

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
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "192.0.2.1"
            }
          ]
        }
      }
    ]
  }'
```

The `UPSERT` action creates the record if it doesn't exist, or updates it if it does. This is almost always what you want—it's idempotent, so running the command twice doesn't cause an error.

You can also list all records in a hosted zone:

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json
```

This returns every record in the zone, including the NS and SOA records that Route 53 created automatically.

> [!TIP]
> Use `UPSERT` instead of `CREATE` for record changes. `CREATE` fails if the record already exists, which makes it annoying for scripts and automation. `UPSERT` handles both cases.

## Hosted Zone Costs

Route 53 charges **$0.50 per hosted zone per month** for the first 25 zones. If you create a hosted zone and delete it within 12 hours, you aren't charged. DNS queries are billed separately at $0.40 per million queries for standard routing—for a typical frontend, this is pennies.

The hosted zone charge is the only ongoing cost you pay just for having DNS configured, regardless of traffic. For a single domain powering your frontend, you're looking at $0.50/month plus negligible query costs.

## What You Built

You now understand what a hosted zone is, how to create one, what record types are available, and when to use each one. Honestly, I find this to be one of those areas where the vocabulary is scarier than the actual concepts—once you've seen an NS record and an A record side by side, the whole system clicks into place.

That matters immediately, because the next step is certificate validation. ACM is about to hand you DNS records and ask you to prove you control the domain. That request only makes sense once you know where those records live and who is authoritative for them.
