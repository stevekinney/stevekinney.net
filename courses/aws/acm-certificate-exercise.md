---
title: 'Exercise: Request and Validate a Certificate'
description: >-
  Request an ACM certificate for your domain, complete DNS validation, and verify the certificate is issued.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - acm
  - exercise
---

You've read about ACM, certificates, and DNS validation. Now you're going to do it for real: request a certificate, add the validation records, and verify that ACM issues the certificate. By the end of this exercise, you'll have a valid SSL/TLS certificate in `us-east-1` ready to attach to a CloudFront distribution.

## Why It Matters

Every production frontend on AWS needs a certificate. The certificate request-and-validate flow is something you'll do once per domain (or once per wildcard scope), and if you do it correctly, ACM handles renewal for the rest of the certificate's life. Getting this right on the first pass means one less thing to debug when you wire up CloudFront.

## Prerequisites

- An AWS account with CLI access configured (see [Setting Up the AWS CLI](setting-up-the-aws-cli.md))
- A domain name you control.
- DNS authority for that domain:
  - **Recommended path:** Route 53 hosts the domain's DNS, either because you registered the domain there or because you already pointed the registrar at a Route 53 hosted zone.
  - **Alternate path:** Your DNS is hosted elsewhere and you can add CNAME records manually.

> [!TIP]
> The smoothest version of this exercise is a domain with DNS already hosted in Route 53. If you followed the domain and DNS lessons with a cheap Route 53-registered domain, ACM validation is basically a copy-paste problem instead of a scavenger hunt through another provider's dashboard.

## Request the Certificate

Request a certificate that covers both the apex domain and all subdomains. Replace `example.com` with your actual domain:

```bash
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1 \
  --output json
```

You should see a response containing a `CertificateArn`. Save this value—you'll need it for the remaining steps.

```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Checkpoint

- You received a `CertificateArn` in the response.
- The command completed without errors.
- You specified `--region us-east-1`.

## Retrieve the Validation Records

Get the CNAME records that ACM needs you to add to your DNS:

```bash
aws acm describe-certificate \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1 \
  --output json \
  --query "Certificate.DomainValidationOptions[*].{Domain:DomainName,Name:ResourceRecord.Name,Value:ResourceRecord.Value,Status:ValidationStatus}"
```

The output shows one or more CNAME records, along with their validation status:

```json
[
  {
    "Domain": "example.com",
    "Name": "_abc123.example.com.",
    "Value": "_def456.acm-validations.aws.",
    "Status": "PENDING_VALIDATION"
  }
]
```

Write down the `Name` and `Value` for each record. You need to add these to your DNS.

### Checkpoint

- You can see one or more CNAME records with `PENDING_VALIDATION` status.
- You have noted the `Name` and `Value` for each record.

## Add the Validation Records to DNS

**If your domain's DNS is in Route 53:** The simplest approach is the ACM console. Open the [ACM console](https://console.aws.amazon.com/acm/home?region=us-east-1), find your certificate, expand it, and click **Create records in Route 53**. ACM creates the CNAME records in your hosted zone automatically.

**If your domain is hosted elsewhere:** Log into your DNS provider's management console and create a CNAME record with:

- **Name/Host**: The value from the `Name` field (e.g., `_abc123.example.com`). Some providers want just `_abc123` without the domain suffix—check your provider's documentation.
- **Type**: CNAME
- **Value/Points to**: The value from the `Value` field (e.g., `_def456.acm-validations.aws`). Some providers want this without the trailing dot.
- **TTL**: 300 (5 minutes) is fine.

Repeat for each domain in your certificate if there are multiple validation records.

### Checkpoint

- You have added all CNAME validation records to your DNS.
- You can verify the records exist using `dig` or `nslookup`:

```bash
dig CNAME _abc123.example.com
```

You should see the `_def456.acm-validations.aws.` value in the answer section.

## Wait for Validation

ACM checks for the DNS records periodically. Validation usually completes within a few minutes but can take up to 30 minutes.

You can poll the status:

```bash
aws acm describe-certificate \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1 \
  --output json \
  --query "Certificate.Status"
```

Or use the built-in waiter to block until validation completes:

```bash
aws acm wait certificate-validated \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1
```

This command exits silently when the certificate reaches `ISSUED` status, or times out after approximately 40 minutes.

### Checkpoint

- The certificate status is `ISSUED`.
- The `wait` command exited without error.

## Verify the Certificate

Confirm the certificate is issued and covers the correct domains:

```bash
aws acm describe-certificate \
  --certificate-arn <your-certificate-arn> \
  --region us-east-1 \
  --output json \
  --query "Certificate.{Status:Status,Domains:SubjectAlternativeNames,Renewal:RenewalEligibility}"
```

Expected output:

```json
{
  "Status": "ISSUED",
  "Domains": ["example.com", "*.example.com"],
  "Renewal": "ELIGIBLE"
}
```

### Checkpoint

- Status is `ISSUED`.
- The certificate covers both `example.com` and `*.example.com` (or whatever domains you requested).
- Renewal eligibility is `ELIGIBLE`.

## Failure Diagnosis

- **The certificate stays in `PENDING_VALIDATION`:** The DNS validation CNAME is missing, the name or value was copied incorrectly, or your DNS provider flattened or proxied the record instead of publishing it exactly as ACM requested.
- **You only validated one name and expected both:** Re-run `describe-certificate` and check the `DomainValidationOptions`. ACM sometimes reuses one validation record for apex and wildcard names, but you still need to confirm what your certificate request actually expects.
- **The certificate looks fine but CloudFront cannot use it later:** The certificate was requested outside `us-east-1`. CloudFront only accepts ACM certificates from that region.

## What You Built

You now have a valid SSL/TLS certificate in `us-east-1` that covers your domain and all subdomains. This certificate will auto-renew as long as the CNAME validation record stays in your DNS and the certificate is associated with an AWS service. The next job is attaching it to CloudFront so the distribution can answer for your real domain over HTTPS.

> [!WARNING]
> Do not delete the CNAME validation records from your DNS. They are required for auto-renewal. Treat them as permanent.

## Stretch Goals

- **List all certificates**: Run `aws acm list-certificates --region us-east-1 --output json` to see every certificate in your account. Notice how each one shows its domain and status.
- **Request a second certificate**: Try requesting a certificate for a different subdomain (e.g., `staging.example.com`) without a wildcard. Compare the validation process—is it any different?
- **Explore the full output**: Run `aws acm describe-certificate` without the `--query` flag to see the complete certificate metadata: key algorithm, issuer, creation date, and the full `DomainValidationOptions` structure.
- **Automate it**: Write a short shell script that requests a certificate, extracts the CNAME records, and prints the records you need to add to DNS. Bonus: if your domain is in Route 53, have the script create the records automatically.

## Cleanup

ACM certificates are free while unused, but the validation CNAME record persists in Route 53 and can cause confusion if you forget it's there. When you're done with a certificate:

```bash
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abcd-1234 \
  --region us-east-1
```

Then delete the validation CNAME record from Route 53 using `change-resource-record-sets` with `Action: DELETE`. The record name and value are the same ones you used to validate — find them with `aws acm describe-certificate` if you don't have them handy.

> [!WARNING]
> If this certificate is still attached to a CloudFront distribution, ACM will refuse to delete it. Detach it from the distribution first.
