---
title: 'Registering and Transferring Domains'
description: >-
  Register a new domain through Route 53 or transfer an existing domain from another registrar, including configuring nameservers for an externally registered domain.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - route53
  - domains
  - registrar
---

You need a domain name. Maybe you already own one at GoDaddy or Namecheap or Cloudflare. Maybe you want to register a fresh one through AWS. Either path works, but there are tradeoffs worth understanding before you pick one.

Route 53 is two services in one: a DNS hosting service (hosted zones, which you configured in [Hosted Zones and Record Types](hosted-zones-and-record-types.md)) and a domain registrar. You can use Route 53 for DNS hosting without using it as your registrar, and vice versa. But using Route 53 for both registration and DNS simplifies the setup because AWS handles the nameserver delegation automatically.

## Registering a Domain Through Route 53

Route 53 supports registration for most common TLDs: `.com`, `.net`, `.org`, `.io`, `.dev`, `.link`, `.click`, and hundreds more. Pricing varies by TLD — a `.com` domain runs about $13/year, while cheaper options like `.click` or `.link` start around $3-5/year.

<!-- VERIFY: .com ~$13/year, .click ~$3/year — check https://aws.amazon.com/route53/pricing/ for current pricing -->

You can register a domain through the console or the CLI. The console is simpler for a one-time operation. Navigate to the Route 53 console, select "Registered domains" from the sidebar, and click "Register domain." Search for the domain you want, add it to your cart, fill in the contact details, and complete the purchase.

The CLI version uses the `route53domains` service (note: this is a separate service namespace from `route53`):

```bash
aws route53domains check-domain-availability \
  --domain-name example.com \
  --region us-east-1 \
  --output json
```

```json
{
  "Availability": "UNAVAILABLE"
}
```

If the domain is available, you will see `"Availability": "AVAILABLE"`. Domain registration via the CLI requires the `register-domain` command with contact details, which is verbose. For a one-time registration, the console is the better choice.

> [!TIP]
> Route 53 domain registration operations must use `us-east-1` as the region, regardless of where your other resources live. The `route53domains` API is only available in `us-east-1`.

### What Happens When You Register

When you register a domain through Route 53, AWS does two things automatically:

1. **Creates a hosted zone** for the domain. This is the same hosted zone you would create manually with `create-hosted-zone`. It comes pre-populated with NS and SOA records.

2. **Configures the domain's nameservers** to point at the hosted zone's nameservers. This is the delegation step that you would otherwise do manually at your registrar.

In other words, registration through Route 53 skips the manual nameserver configuration entirely. Your domain is ready for DNS records immediately after registration completes.

### Domain Privacy

Route 53 enables **privacy protection** by default for supported TLDs. This replaces your personal contact information in the public WHOIS database with Route 53's registrar contact details. For TLDs that do not support privacy protection (some country-code TLDs), your contact information will be publicly visible.

## Transferring a Domain to Route 53

If you already own a domain at another registrar and want to move everything to AWS, you can transfer the registration to Route 53. The transfer process follows ICANN rules, which means:

1. **Unlock the domain** at your current registrar. Most registrars lock domains by default to prevent unauthorized transfers.

2. **Get the authorization code** (also called an EPP code or transfer key) from your current registrar. This proves you own the domain.

3. **Initiate the transfer** in the Route 53 console: go to "Registered domains," click "Transfer domain," enter your domain name and the authorization code, and provide contact details.

4. **Confirm the transfer.** Your current registrar will send a confirmation email. You (or the admin contact) must approve the transfer. Some registrars auto-approve after 5 days of no response.

5. **Wait.** Domain transfers typically take 5-7 days to complete. During this time, your site continues working — the domain still resolves using its current DNS configuration.

After the transfer completes, Route 53 creates a hosted zone (if one does not already exist) and updates the domain's nameservers. Your DNS records carry over if you were already using Route 53 for DNS hosting. If you were using another DNS provider, you will need to recreate your records in the Route 53 hosted zone.

> [!WARNING]
> You cannot transfer a domain within 60 days of registering it or within 60 days of a previous transfer. This is an ICANN rule, not an AWS limitation. Plan accordingly if you recently registered a domain elsewhere and want to move it to Route 53.

## Using Route 53 DNS with an External Registrar

You do not have to transfer your domain registration to Route 53 to use Route 53 for DNS. This is the approach to take if you want to keep your domain at your current registrar (maybe it was cheaper, maybe you have multiple domains managed there) but use Route 53 for hosting your DNS records.

Here is the process:

### Step 1: Create a Hosted Zone in Route 53

```bash
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --region us-east-1 \
  --output json
```

Note the four nameservers in the response:

```json
{
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

### Step 2: Update Nameservers at Your Registrar

Log into your registrar (GoDaddy, Namecheap, Cloudflare, etc.) and replace the default nameservers with the four Route 53 nameservers. The exact steps vary by registrar, but you are looking for something like "Custom DNS," "Custom nameservers," or "Change nameservers" in the domain management interface.

Enter all four nameservers. Order does not matter.

### Step 3: Wait for Propagation

After changing nameservers, DNS queries for your domain will gradually shift from the old nameservers to the Route 53 nameservers. This can take anywhere from a few minutes to 48 hours, depending on TTL values and caching behavior at various resolvers. In practice, most users see the change within a few hours.

You can verify that Route 53 is answering queries by asking the nameservers directly:

```bash
dig example.com NS +short
```

When the output shows the four Route 53 nameservers, delegation is complete.

### Step 4: Create Your DNS Records

With delegation in place, you can now create records in your Route 53 hosted zone — the A and AAAA alias records pointing to your CloudFront distribution, as described in [Pointing a Domain to CloudFront](pointing-a-domain-to-cloudfront.md).

> [!TIP]
> If you are migrating from another DNS provider that had existing records (MX records for email, TXT records for verification, etc.), recreate all of those records in Route 53 before changing nameservers. Otherwise, email delivery and other services that depend on DNS will break during the transition.

## Hosted Zone Auto-Creation Behavior

There is a subtle gotcha when mixing domain registration and hosted zones. If you register a domain through Route 53, AWS automatically creates a hosted zone. If you then delete that hosted zone and create a new one (maybe you wanted a fresh start), the new hosted zone will have different nameservers. But the domain registration still points to the old nameservers.

You need to update the domain's nameservers to match the new hosted zone:

```bash
aws route53domains update-domain-nameservers \
  --domain-name example.com \
  --nameservers \
    Name=ns-1234.awsdns-56.org \
    Name=ns-567.awsdns-12.net \
    Name=ns-890.awsdns-34.co.uk \
    Name=ns-123.awsdns-78.com \
  --region us-east-1 \
  --output json
```

The reverse also matters: if you create a hosted zone first and then register the domain, Route 53 creates a second hosted zone automatically. You will end up with two hosted zones for the same domain, each with different nameservers. Delete the one you are not using and make sure the domain's nameservers match the one you are keeping.

```bash
aws route53 list-hosted-zones \
  --output json \
  --query "HostedZones[?Name=='example.com.'].{Id:Id,RecordCount:ResourceRecordSetCount}"
```

If you see two entries, one will have only 2 records (the auto-created default) and the other will have your actual DNS records. Delete the empty one.

> [!WARNING]
> Having two hosted zones for the same domain with different nameservers is a common source of confusion. DNS queries go to whichever hosted zone's nameservers are configured on the domain registration. Records in the other hosted zone are effectively invisible. If your DNS records are not resolving, check whether you have duplicate hosted zones.

## Which Approach Should You Use?

**Register through Route 53** if you are buying a new domain and want the simplest setup. No nameserver configuration, no delegation — it just works.

**Keep your existing registrar and use Route 53 for DNS** if you already own a domain and do not want to deal with the transfer process. This is perfectly fine for production use — the registrar's only job is to hold the nameserver delegation, and once that is configured, it does not matter whether registration lives at GoDaddy or Route 53.

**Transfer to Route 53** if you want everything in one place and are willing to wait 5-7 days for the transfer. This simplifies management long-term but is not necessary.

For this course, any of the three approaches works. The DNS records you create in Route 53 behave identically regardless of where the domain is registered.
