---
title: 'Solution: Request and Validate a Certificate'
description: >-
  Complete walkthrough of requesting an ACM certificate, completing DNS validation, and verifying the issued certificate.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - acm
  - exercise
  - solution
---

This is the solution for the [ACM Certificate Exercise](acm-certificate-exercise.md). Each step includes the exact commands and expected output. If your output differs, the notes after each command explain what to check.

> [!TIP]
> If you want AWS's version of the validation workflow open while you work, keep the [AWS Certificate Manager User Guide](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html) nearby. It is the fastest way to sanity-check the console flow when ACM moves the buttons around again.

## Why This Works

- ACM issues the certificate only after DNS proves you control the domain, which is why the validation record is the real gate in this workflow.
- Keeping the certificate in `us-east-1` lines it up with CloudFront's regional requirement instead of creating a certificate you cannot attach later.
- Renewal stays automatic as long as the validation record remains in DNS and the certificate is still associated with an AWS service.

## Request the Certificate

```bash
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1 \
  --output json
```

**Expected output:**

```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Store the ARN in a variable so you don't have to copy-paste it for every subsequent command:

```bash
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Or capture it in one step:

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1 \
  --output text)

echo "$CERT_ARN"
```

**If something went wrong:**

- `An error occurred (AccessDeniedException)`: Your IAM user doesn't have `acm:RequestCertificate` permissions. If you're using the admin user from [Creating and Securing an AWS Account](creating-and-securing-an-aws-account.md), this shouldn't happen. Check that your CLI profile is configured correctly.
- `An error occurred (LimitExceededException)`: You've hit the ACM certificate limit for your account (default is 2,500 per region). Unlikely for a new account, but if it happens, delete unused certificates with `aws acm delete-certificate`.

## Retrieve the Validation Records

```bash
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --output json \
  --query "Certificate.DomainValidationOptions[*].{Domain:DomainName,RecordName:ResourceRecord.Name,RecordType:ResourceRecord.Type,RecordValue:ResourceRecord.Value,Status:ValidationStatus}"
```

**Expected output:**

```json
[
  {
    "Domain": "example.com",
    "RecordName": "_abc123.example.com.",
    "RecordType": "CNAME",
    "RecordValue": "_def456.acm-validations.aws.",
    "Status": "PENDING_VALIDATION"
  },
  {
    "Domain": "*.example.com",
    "RecordName": "_abc123.example.com.",
    "RecordType": "CNAME",
    "RecordValue": "_def456.acm-validations.aws.",
    "Status": "PENDING_VALIDATION"
  }
]
```

Notice that `example.com` and `*.example.com` often share the same CNAME record since they have the same parent domain. You only need to add it once.

**If the `ResourceRecord` fields are missing:** The CNAME records may take a few seconds to appear after requesting the certificate. Wait 10 seconds and run the command again.

## Add the Validation Records to DNS

### Option A: Route 53 (CLI)

If your domain's DNS is hosted in Route 53, first find your hosted zone ID:

```bash
aws route53 list-hosted-zones \
  --output json \
  --query "HostedZones[?Name=='example.com.'].{Id:Id,Name:Name}"
```

```json
[
  {
    "Id": "/hostedzone/Z1234567890ABC",
    "Name": "example.com."
  }
]
```

Then create the validation record. Replace the `Name` and `Value` with the actual values from Step 2:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --output json \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_abc123.example.com.",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "_def456.acm-validations.aws."
            }
          ]
        }
      }
    ]
  }'
```

**Expected output:**

```json
{
  "ChangeInfo": {
    "Id": "/change/C1234567890ABC",
    "Status": "PENDING",
    "SubmittedAt": "2026-03-18T12:00:00.000Z"
  }
}
```

The `PENDING` status means Route 53 is propagating the change. This typically takes 30-60 seconds.

### Option B: Route 53 (Console Shortcut)

Open the [ACM console](https://console.aws.amazon.com/acm/home?region=us-east-1). Find your certificate, expand it, and click **Create records in Route 53**. ACM creates the CNAME records for you. This is the fastest option if your domain is in Route 53.

### Option C: External DNS Provider

Log into your DNS provider and create a CNAME record. The exact steps vary by provider, but you need:

- **Name**: `_abc123` (some providers want the full `_abc123.example.com`, others want just the prefix)
- **Type**: CNAME
- **Value**: `_def456.acm-validations.aws` (some providers require the trailing dot, others do not)
- **TTL**: 300

### Verify the Record Exists

After adding the record, confirm it's resolvable:

```bash
dig CNAME _abc123.example.com +short
```

**Expected output:**

```
_def456.acm-validations.aws.
```

If you see no output, the record hasn't propagated yet. Wait a minute and try again. If it still doesn't appear after 5 minutes, double-check the record in your DNS provider's interface—the most common mistake is entering the record name incorrectly.

## Wait for Validation

Use the ACM waiter to block until the certificate is issued:

```bash
aws acm wait certificate-validated \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1
```

This command produces no output on success. It exits silently when the certificate status changes to `ISSUED`. If it times out (after approximately 40 minutes), the DNS record likely isn't configured correctly.

You can also poll manually:

```bash
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --output json \
  --query "Certificate.DomainValidationOptions[*].{Domain:DomainName,Status:ValidationStatus}"
```

**During validation:**

```json
[
  {
    "Domain": "example.com",
    "Status": "PENDING_VALIDATION"
  },
  {
    "Domain": "*.example.com",
    "Status": "PENDING_VALIDATION"
  }
]
```

**After validation:**

```json
[
  {
    "Domain": "example.com",
    "Status": "SUCCESS"
  },
  {
    "Domain": "*.example.com",
    "Status": "SUCCESS"
  }
]
```

## Verify the Certificate

```bash
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --output json \
  --query "Certificate.{Status:Status,Domains:SubjectAlternativeNames,Renewal:RenewalEligibility,KeyAlgorithm:KeyAlgorithm,Issuer:Issuer}"
```

**Expected output:**

```json
{
  "Status": "ISSUED",
  "Domains": ["example.com", "*.example.com"],
  "Renewal": "ELIGIBLE",
  "KeyAlgorithm": "RSA-2048",
  "Issuer": "Amazon"
}
```

The key things to confirm:

- **Status** is `ISSUED`, not `PENDING_VALIDATION` or `FAILED`.
- **Domains** lists both `example.com` and `*.example.com`.
- **Renewal** is `ELIGIBLE`, meaning ACM will auto-renew this certificate.
- **Issuer** is `Amazon`, confirming this is an ACM-managed certificate.

## Summary

The complete flow, condensed:

```bash
# Request the certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1 \
  --output text)

# Get the validation CNAME records
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --output json \
  --query "Certificate.DomainValidationOptions[*].ResourceRecord"

# Add the CNAME to Route 53 (or your DNS provider)
# ... (see Step 3 above)

# Wait for validation
aws acm wait certificate-validated \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1

# Verify
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --output json \
  --query "Certificate.{Status:Status,Domains:SubjectAlternativeNames}"
```

You now have an issued certificate in `us-east-1`. Next, you'll attach this certificate to a CloudFront distribution so your frontend can answer on the real domain instead of a `*.cloudfront.net` URL.

## Cleanup

ACM certificates are free while unused, but the validation CNAME record persists in Route 53. When you're done with the certificate:

```bash
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abcd-1234 \
  --region us-east-1
```

Then delete the validation CNAME record from Route 53 using `change-resource-record-sets` with `Action: DELETE`. The record name and value are the same ones you added during validation.

> [!WARNING]
> If this certificate is still attached to a CloudFront distribution, ACM will refuse to delete it. Detach it from the distribution first.
