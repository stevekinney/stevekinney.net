---
title: 'Solution: IAM Policy for a Deploy Bot'
description: >-
  Complete solution for the deploy bot IAM policy exercise, with annotations
  explaining each policy statement.
date: 2026-03-18
modified: 2026-04-01
tags:
  - aws
  - iam
  - exercise
  - solution
---

Here's the complete policy, the CLI commands to wire it up, and an explanation of every decision. I'll walk through each statement so you can see the reasoning, not just the end result.

## Why This Works

- The policy separates bucket-level and object-level permissions, which is the core IAM trick that makes S3 access control feel less arbitrary.
- The CloudFront permission is scoped to one distribution, so the deploy bot can refresh only the cache it actually owns.
- The final `get-caller-identity` check proves you did not just create policy JSON. You created a principal that can authenticate with the boundaries you intended.

> [!TIP]
> If you want the AWS version of the policy mechanics while you work, keep the [IAM JSON policy reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html) and the [`aws iam create-policy` command reference](https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html) open.

## The Policy

Create a file called `deploy-bot-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ObjectSync",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
    },
    {
      "Sid": "AllowS3ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets"
    },
    {
      "Sid": "AllowCloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    }
  ]
}
```

### Why Three Statements Instead of One?

You could combine the S3 actions into a single statement with both resource ARNs, like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Deploy",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-frontend-app-assets", "arn:aws:s3:::my-frontend-app-assets/*"]
    },
    {
      "Sid": "AllowCloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    }
  ]
}
```

Both versions work identically. AWS evaluates each action against each resource in the arrays—`s3:ListBucket` matches the bucket ARN, and `s3:PutObject`/`s3:DeleteObject` match the objects ARN. The combined version is more compact. The split version makes it explicit which actions go with which resources. Either approach is fine; pick whichever your team finds more readable.

The three-statement version is a bit more self-documenting: each Sid tells you exactly what that block is for. When a policy grows to ten or fifteen statements, the extra clarity pays for itself.

## Statement-by-Statement Breakdown

### Statement 1: AllowS3ObjectSync

```json
{
  "Sid": "AllowS3ObjectSync",
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
}
```

- **`s3:PutObject`**—required by `aws s3 sync` to upload new or changed files.
- **`s3:DeleteObject`**—required by `aws s3 sync --delete` to remove files from S3 that no longer exist in the local build directory. Without this, old files accumulate in your bucket.
- **Resource ends with `/*`**—these actions operate on individual objects within the bucket, not the bucket itself. The `/*` wildcard matches every object key in the bucket.

What this doesn't allow: `s3:GetObject` (reading files back), `s3:DeleteBucket` (deleting the bucket itself), or any other S3 action. The deploy bot can push files in and remove stale ones. That's it.

### Statement 2: AllowS3ListBucket

```json
{
  "Sid": "AllowS3ListBucket",
  "Effect": "Allow",
  "Action": ["s3:ListBucket"],
  "Resource": "arn:aws:s3:::my-frontend-app-assets"
}
```

- **`s3:ListBucket`**—required by `aws s3 sync` to compare the local directory against what's already in the bucket. Without list permission, sync can't determine which files need to be uploaded or deleted.
- **Resource has no `/*`**—`ListBucket` is a bucket-level operation, not an object-level operation. The ARN points to the bucket itself.

This is the distinction that trips people up most often. As covered in [Writing Your First IAM Policy](writing-your-first-iam-policy.md), mixing up the bucket ARN and the object ARN is the most common cause of "my policy doesn't work" debugging sessions.

### Statement 3: AllowCloudFrontInvalidation

```json
{
  "Sid": "AllowCloudFrontInvalidation",
  "Effect": "Allow",
  "Action": ["cloudfront:CreateInvalidation"],
  "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
}
```

- **`cloudfront:CreateInvalidation`**—tells CloudFront to purge cached versions of your files at edge locations worldwide so users see the latest deployment.
- **Resource targets one specific distribution**—the deploy bot can only invalidate this distribution's cache, not any other distribution in the account.
- **No region in the ARN**—CloudFront is a global service, so the region segment in the ARN is empty (the `::` between `cloudfront` and the account ID).

What this doesn't allow: `cloudfront:UpdateDistribution` (changing the distribution's settings), `cloudfront:DeleteDistribution` (removing the distribution), or invalidation on other distributions. The deploy bot can clear the cache. Period.

## Full CLI Walkthrough

Here are all the commands in sequence:

### Create the user

```bash
aws iam create-user \
  --user-name deploy-bot \
  --region us-east-1 \
  --output json
```

### Create access keys

```bash
aws iam create-access-key \
  --user-name deploy-bot \
  --region us-east-1 \
  --output json
```

Save the `AccessKeyId` and `SecretAccessKey` from the response.

### Create the policy

```bash
aws iam create-policy \
  --policy-name DeployBotPolicy \
  --policy-document file://deploy-bot-policy.json \
  --region us-east-1 \
  --output json
```

The response includes the policy's ARN:

```json
{
  "Policy": {
    "PolicyName": "DeployBotPolicy",
    "PolicyId": "ANPAIOSFODNN7EXAMPLE",
    "Arn": "arn:aws:iam::123456789012:policy/DeployBotPolicy",
    "Path": "/",
    "DefaultVersionId": "v1",
    "AttachmentCount": 0,
    "IsAttachable": true,
    "CreateDate": "2026-03-18T00:00:00Z"
  }
}
```

### Attach the policy to the user

```bash
aws iam attach-user-policy \
  --user-name deploy-bot \
  --policy-arn arn:aws:iam::123456789012:policy/DeployBotPolicy \
  --region us-east-1 \
  --output json
```

### Configure a CLI profile for the deploy bot

```bash
aws configure --profile deploy-bot
```

Enter the access key ID, secret access key, `us-east-1`, and `json`.

### Verify the identity

```bash
aws sts get-caller-identity \
  --profile deploy-bot \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "UserId": "AIDAIOSFODNN7EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/deploy-bot"
}
```

### Test that unauthorized actions are denied

```bash
aws iam list-users \
  --profile deploy-bot \
  --region us-east-1 \
  --output json
```

Expected: an `AccessDenied` error. This is correct behavior—the deploy bot has no IAM permissions. The policy is doing exactly what it should.

## Stretch Goal: Explicit Deny on DeleteBucket

If you attempted the stretch goal of adding an explicit Deny for `s3:DeleteBucket`, here's what that looks like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ObjectSync",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
    },
    {
      "Sid": "AllowS3ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets"
    },
    {
      "Sid": "AllowCloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    },
    {
      "Sid": "DenyBucketDeletion",
      "Effect": "Deny",
      "Action": ["s3:DeleteBucket"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets"
    }
  ]
}
```

The `DenyBucketDeletion` statement is technically redundant here—the deploy bot has no Allow for `s3:DeleteBucket`, so it's already implicitly denied. But as discussed in [Principle of Least Privilege](principle-of-least-privilege.md), explicit Deny statements act as **guardrails**. If someone later modifies this policy and accidentally adds `s3:*` to an Allow statement, the explicit Deny still prevents bucket deletion. Defense in depth.
