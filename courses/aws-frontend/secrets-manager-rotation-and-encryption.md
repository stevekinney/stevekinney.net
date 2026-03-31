---
title: 'Secrets Manager: Rotation and Encryption'
description: >-
  Store sensitive credentials in Secrets Manager, understand automatic rotation,
  and know when Secrets Manager is worth the cost over Parameter Store.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - secrets-manager
  - rotation
  - encryption
---

**Secrets Manager** is a standalone AWS service built for one thing: storing and rotating sensitive credentials. While Parameter Store can hold encrypted values (SecureString), Secrets Manager goes further with built-in rotation, cross-service integration, and a purpose-built API for credential lifecycle management.

Think of it this way: Parameter Store is a configuration store that happens to support encryption. Secrets Manager is a credential vault with rotation as a first-class feature.

## Creating a Secret

You can create a secret from the CLI with a JSON string:

```bash
aws secretsmanager create-secret \
  --name "/my-frontend-app/production/stripe-key" \
  --secret-string '{"apiKey":"sk_live_abc123xyz","webhookSecret":"whsec_def456"}' \
  --region us-east-1 \
  --output json
```

The response includes the secret's ARN and name:

```json
{
  "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/my-frontend-app/production/stripe-key-AbCdEf",
  "Name": "/my-frontend-app/production/stripe-key",
  "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111"
}
```

Notice the random suffix on the ARN (`-AbCdEf`). Secrets Manager appends this automatically to ensure uniqueness. When you reference the secret in IAM policies, you can use the name or the full ARN.

You can also store a plain string instead of JSON:

```bash
aws secretsmanager create-secret \
  --name "/my-frontend-app/production/sendgrid-key" \
  --secret-string "SG.abc123xyz" \
  --region us-east-1 \
  --output json
```

But JSON is the better default. I almost always reach for it. Most credentials have multiple related values — an API key and a secret, a username and password, a client ID and client secret. Storing them together as a JSON object keeps them in sync.

## Retrieving a Secret

```bash
aws secretsmanager get-secret-value \
  --secret-id "/my-frontend-app/production/stripe-key" \
  --region us-east-1 \
  --output json
```

The response includes the decrypted value:

```json
{
  "ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/my-frontend-app/production/stripe-key-AbCdEf",
  "Name": "/my-frontend-app/production/stripe-key",
  "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
  "SecretString": "{\"apiKey\":\"sk_live_abc123xyz\",\"webhookSecret\":\"whsec_def456\"}",
  "VersionStages": ["AWSCURRENT"],
  "CreatedDate": "2026-03-18T10:00:00.000Z"
}
```

The `SecretString` field contains your decrypted value. If you stored JSON, you parse it in your application code.

## Encryption with KMS

Every secret in Secrets Manager is encrypted with a KMS key. By default, Secrets Manager uses an AWS-managed key (`aws/secretsmanager`). You can also specify a customer-managed KMS key when creating the secret:

```bash
aws secretsmanager create-secret \
  --name "/my-frontend-app/production/database-password" \
  --secret-string "my-database-password-here" \
  --kms-key-id "arn:aws:kms:us-east-1:123456789012:key/1a2b3c4d-5678-90ab-cdef-EXAMPLE22222" \
  --region us-east-1 \
  --output json
```

Why would you use a customer-managed key? Two reasons. First, it lets you control who can decrypt the secret independently of who can access Secrets Manager. Second, it lets you track KMS key usage in CloudTrail, giving you a separate audit trail for decryption operations.

For most frontend applications, the default AWS-managed key is fine. You'd use a customer-managed key when your organization's security policy requires it, or when you need to share secrets across AWS accounts (cross-account access requires a customer-managed key).

## Automatic Rotation

This is the feature that separates Secrets Manager from everything else. You can configure a secret to rotate automatically on a schedule — every 30 days, every 7 days, whatever your security policy requires.

Rotation works through a Lambda function. When the rotation schedule triggers, Secrets Manager invokes a rotation Lambda that:

1. Creates a new credential with the external service (e.g., generates a new database password)
2. Stores the new credential in Secrets Manager as a pending version
3. Tests the new credential to make sure it works
4. Promotes the new credential to the current version

For AWS-native services like RDS, Redshift, and DocumentDB, AWS provides pre-built rotation Lambda functions. You enable rotation with a single CLI command:

```bash
aws secretsmanager rotate-secret \
  --secret-id "/my-frontend-app/production/database-password" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:123456789012:function:my-rotation-function" \
  --rotation-rules '{"AutomaticallyAfterDays": 30}' \
  --region us-east-1 \
  --output json
```

For third-party services (Stripe, SendGrid, Twilio), you write your own rotation Lambda that calls the third-party API to generate a new key.

> [!WARNING]
> Automatic rotation means your application must handle credential changes gracefully. If your Lambda function caches a secret at init time and never refreshes it, a rotated credential will cause failures until the next cold start. The solution is to cache with a TTL and re-fetch when the cache expires. The next lesson covers caching strategies in detail.

## Version Stages

Secrets Manager uses **version stages** to manage rotation without downtime. The two important stages are:

- **`AWSCURRENT`** — the active version. This is what your application gets by default when it retrieves the secret.
- **`AWSPENDING`** — the version being tested during rotation. Once validated, it becomes `AWSCURRENT`.

There's also **`AWSPREVIOUS`** — the old version, retained so applications that cached the previous value can still authenticate during the rotation window. This is how zero-downtime rotation works: the old credential remains valid until the rotation Lambda explicitly revokes it.

## Pricing

Secrets Manager isn't free. Here's the cost breakdown:

| Component | Cost                       |
| --------- | -------------------------- |
| Storage   | $0.40 per secret per month |
| API calls | $0.05 per 10,000 API calls |

Ten secrets cost $4.00 per month. A hundred secrets cost $40.00 per month. The API call cost is negligible for most applications — a Lambda function that retrieves a secret once per cold start generates very few API calls.

Compare this to Parameter Store's standard tier, which is free. For a frontend application with a handful of secrets that don't need automatic rotation, the $0.40 per secret per month is hard to justify. For database credentials that must rotate every 30 days with zero downtime, it's worth every penny.

## When Secrets Manager Is Worth It

Use Secrets Manager when:

- **You need automatic rotation.** This is the primary differentiator. If a credential needs to rotate on a schedule — database passwords, service account keys — Secrets Manager is the tool.
- **You're using RDS, Redshift, or DocumentDB.** AWS provides pre-built rotation functions for these services. Rotation is nearly turnkey.
- **Your organization requires credential lifecycle management.** Secrets Manager tracks creation dates, rotation dates, and version history. Compliance teams like this.
- **You need cross-region replication.** Secrets Manager can replicate secrets to multiple regions for disaster recovery.

Use Parameter Store SecureString when:

- **The credential doesn't need to rotate automatically.** A third-party API key that you update manually once a year doesn't need Secrets Manager.
- **Cost matters.** Parameter Store's standard tier is free. For a personal project or an early-stage startup, free is hard to beat.
- **You want to store configuration and secrets in the same place.** Parameter Store handles both with its hierarchical path structure.

> [!TIP]
> A common pattern is to use both: Parameter Store for non-sensitive configuration and secrets that don't rotate, Secrets Manager for database credentials and other secrets that need automatic rotation. They aren't competing services — they complement each other.

## Updating a Secret

To update a secret's value:

```bash
aws secretsmanager put-secret-value \
  --secret-id "/my-frontend-app/production/stripe-key" \
  --secret-string '{"apiKey":"sk_live_newkey789","webhookSecret":"whsec_newsecret456"}' \
  --region us-east-1 \
  --output json
```

This creates a new version of the secret. The previous version moves to the `AWSPREVIOUS` stage.

## Deleting a Secret

Secrets Manager doesn't delete secrets immediately. Instead, it schedules deletion with a recovery window:

```bash
aws secretsmanager delete-secret \
  --secret-id "/my-frontend-app/production/stripe-key" \
  --recovery-window-in-days 7 \
  --region us-east-1 \
  --output json
```

During the recovery window (minimum 7 days, default 30 days), you can restore the secret. This protects against accidental deletion. If you're absolutely sure and want to skip the recovery window, add `--force-delete-without-recovery`, but think twice before using it.

You know where to store secrets. The next question is: how does your Lambda function actually read them at runtime? The next lesson covers SDK calls, IAM permissions, and the caching strategies that make secret retrieval efficient.
