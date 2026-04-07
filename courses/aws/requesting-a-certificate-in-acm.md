---
title: 'Requesting a Certificate in ACM'
description: >-
  Request a public SSL/TLS certificate in AWS Certificate Manager for your domain using the console and the CLI.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - acm
  - certificates
  - ssl
---

You know why HTTPS matters. Now you need a certificate. **AWS Certificate Manager (ACM)** is the service that provisions, manages, and renews SSL/TLS certificates for use with AWS services. Requesting a certificate is straightforward, but there are a few decisions you need to make upfront—and one critical constraint around region that'll save you hours of debugging if you learn it now.

At this point in the course, you already have the missing prerequisite that trips most people up: domain control and a place to publish DNS records. That matters because ACM validation is not some abstract certificate ritual. It's a DNS task.

## Before You Start: The Region Question

ACM certificates are regional resources. A certificate provisioned in `us-west-2` is only available to services running in `us-west-2`. This matters because CloudFront—the CDN you'll use later in the static-hosting arc to serve your frontend—is a global service that requires its certificates to be in **`us-east-1`** (US East, N. Virginia).

If you provision your certificate in any other region, CloudFront won't see it. The console won't show it in the dropdown. The CLI will return an error. There's no way to move or copy a certificate between regions.

> [!WARNING]
> Always create certificates for CloudFront in `us-east-1`. This is the single most common mistake people make with ACM. If you remember nothing else from this module, remember this.

You set up the AWS CLI with named profiles in [Setting Up the AWS CLI](setting-up-the-aws-cli.md). Make sure your commands explicitly specify `--region us-east-1`.

## Requesting a Certificate in the Console

The console workflow gives you a clear picture of what ACM is doing under the hood.

1. Open the [ACM console](https://console.aws.amazon.com/acm/home?region=us-east-1). Make sure the region dropdown in the top-right corner says **US East (N. Virginia)**. If it doesn't, switch to it before proceeding.
2. Click **Request a certificate**.
3. Select **Request a public certificate** and click **Next**.
4. Under **Domain names**, enter your domain: `example.com`. If you want both the apex domain and `www`, add `www.example.com` as an additional domain name. (We'll cover wildcard certificates in a later lesson.)
5. Under **Validation method**, select **DNS validation**. This is the default and the right choice for most cases. We'll cover the difference between DNS and email validation in the next lesson.
6. Under **Key algorithm**, leave the default: **RSA 2048**. This is compatible with everything.
7. Click **Request**.

ACM creates the certificate and sets its status to **Pending validation**. The certificate isn't usable yet—you need to prove that you own the domain. That validation step is covered in the next lesson.

## Requesting a Certificate with the CLI

The CLI is faster and scriptable. Here is the equivalent of what you just did in the console:

```bash
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names www.example.com \
  --validation-method DNS \
  --region us-east-1 \
  --output json
```

ACM returns a JSON response with the certificate's **ARN** (Amazon Resource Name):

```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Save that ARN. You'll need it when you attach the certificate to CloudFront, when you check validation status, and when you debug anything related to this certificate. Every ACM operation references the certificate by its ARN.

> [!TIP]
> You can store the ARN in a shell variable for use in subsequent commands:
>
> ```bash
> CERT_ARN=$(aws acm request-certificate \
>   --domain-name example.com \
>   --subject-alternative-names www.example.com \
>   --validation-method DNS \
>   --region us-east-1 \
>   --output text)
> ```
>
> The `--output text` flag returns just the ARN string without JSON formatting, which is easier to capture in a variable.

## The Certificate Lifecycle

After you request a certificate, it moves through a series of states. I'd recommend scanning this list now so you know what to expect:

1. **Pending validation**: ACM has created the certificate but is waiting for you to prove you own the domain. Once you publish the DNS records, validation usually flips to **Issued** within a few minutes, though AWS gives itself up to 30 minutes. You don't have to babysit it—the exercise lesson uses `aws acm wait certificate-validated` to block until the certificate is ready.
2. **Issued**: Validation succeeded. The certificate is ready to attach to a CloudFront distribution, load balancer, or API Gateway endpoint.
3. **Inactive**: Listed by the [ACM API](https://docs.aws.amazon.com/acm/latest/APIReference/API_CertificateDetail.html) as a possible status, but rare in normal usage. You will not encounter it with the DNS-validated, `AMAZON_ISSUED` certificates this course creates.
4. **Expired**: The certificate reached its expiration date without being renewed. ACM auto-renews certificates that are in use and have valid DNS validation records, so this typically only happens if something went wrong with renewal.
5. **Revoked**: The certificate was explicitly revoked. This is rare.
6. **Failed**: Validation failed—usually because the DNS or email validation wasn't completed within 72 hours.

You can check the status of your certificate at any time:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --region us-east-1 \
  --output json
```

The response includes everything about the certificate—its status, domain names, validation method, and the validation records you need to add to your DNS:

```json
{
  "Certificate": {
    "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "DomainName": "example.com",
    "SubjectAlternativeNames": ["example.com", "www.example.com"],
    "Status": "PENDING_VALIDATION",
    "Type": "AMAZON_ISSUED",
    "KeyAlgorithm": "RSA-2048",
    "DomainValidationOptions": [
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
  }
}
```

The `DomainValidationOptions` array contains the DNS records you need to add. Each domain (or subdomain) in your certificate gets its own validation record. In the next lesson, we'll walk through adding these records and completing validation.

## IAM Permissions for ACM

To request a certificate, your IAM user or role needs the `acm:RequestCertificate` permission. If you followed the account setup in [Creating and Securing an AWS Account](creating-and-securing-an-aws-account.md) and are using an admin user, you already have this. For more restrictive setups, here is a minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["acm:RequestCertificate", "acm:DescribeCertificate", "acm:ListCertificates"],
      "Resource": "*"
    }
  ]
}
```

> [!TIP]
> ACM doesn't support resource-level permissions for `RequestCertificate`—the `Resource` must be `"*"`. You can restrict `DescribeCertificate` and other read operations to specific certificate ARNs after the certificate exists, but the initial request always requires a wildcard resource.

## What You Have So Far

At this point, you have a certificate in ACM with a status of **Pending validation**. It exists, it has an ARN, but it isn't usable yet. The next step is proving to ACM that you actually own the domain listed on the certificate—and for that, you need to understand the difference between DNS validation and email validation.
