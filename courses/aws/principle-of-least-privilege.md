---
title: 'Principle of Least Privilege'
description: >-
  Apply the principle of least privilege by scoping IAM policies to the narrowest
  set of actions and resources a user or service actually needs.
date: 2026-03-18
modified: 2026-04-15
tags:
  - aws
  - iam
  - security
  - best-practices
---

There's a tempting pattern you'll encounter the moment IAM gets in your way: you attach `AdministratorAccess`, everything works, and you move on with your life. I've done it. Everyone's done it. And it works fine until it doesn't—until an access key leaks, or a Lambda function has a bug that lets user input reach an SDK call, or a junior developer accidentally deletes a production database because their CI bot had permissions it never needed.

If you want AWS's canonical version of the same model while you read, the [IAM User Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html) and the [IAM best practices guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) are worth keeping open.

The **principle of least privilege** says: grant only the permissions required to perform a task, and nothing more. It sounds obvious when you say it out loud: don't give the intern the root password. But in practice, least privilege requires discipline—it's easier to over-grant than to figure out exactly which five actions a service needs.

## Why It Matters for Frontend Engineers

On Vercel or Netlify, permissions are mostly invisible. The platform manages access to its own infrastructure, and you interact through a constrained UI. On AWS, you're the platform operator. Every IAM user, every Lambda execution role, every CI pipeline credential is an attack surface. The broader the permissions, the bigger the blast radius when something goes wrong.

Consider this scenario: your GitHub Actions pipeline uses an IAM user with `AdministratorAccess` to deploy your frontend. The deploy only needs to sync files to S3 and invalidate a CloudFront cache—two actions. But the credential has access to everything: DynamoDB tables, Lambda functions, IAM itself, billing. If that access key leaks (and keys leak—in logs, in error messages, in accidental commits), the attacker inherits unlimited power.

Now compare that to a user whose policy allows exactly `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, and `cloudfront:CreateInvalidation` on exactly one bucket and one distribution. If that key leaks, the attacker can push files to one bucket and invalidate one cache. Bad, but containable. The difference is everything.

## The Wildcard Problem

Wildcards are the most common way policies become over-permissive. There are two flavors:

### Wildcard Actions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
```

This policy allows every S3 action on every S3 resource in your account. That includes `s3:DeleteBucket`, `s3:PutBucketPolicy` (which can make your bucket public), and `s3:GetObject` on buckets you didn't intend to expose. The `*` in Action is a blanket grant.

### Wildcard Resources

Even if you narrow the actions, a wildcard resource can be dangerous:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "*"
    }
  ]
}
```

This allows reading and writing files to _every_ S3 bucket in your account. If you have a logging bucket, a data bucket, and an assets bucket, this policy grants access to all three. The fix is to scope the resource to the specific bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
    }
  ]
}
```

> [!WARNING]
> Some IAM actions don't support resource-level restrictions. For example, `s3:ListAllMyBuckets` can only use `"Resource": "*"` because it operates across all buckets by definition. When AWS tells you an action doesn't support resource-level restrictions, use `*` for that specific action—but never use it as an excuse to wildcard everything else.

## Refining a Policy in Practice

Here's a realistic workflow for getting to least privilege:

### Start with What You Need to Do

Ask yourself: what commands will this user or service run? For a frontend deploy pipeline, the answer is:

- `aws s3 sync ./build s3://my-frontend-app-assets`—uploads files to S3
- `aws cloudfront create-invalidation`—clears the CDN cache

### Map Commands to Actions

Each CLI command maps to one or more IAM actions:

| CLI Command                          | IAM Actions                                        |
| ------------------------------------ | -------------------------------------------------- |
| `aws s3 sync` (upload + delete)      | `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` |
| `aws cloudfront create-invalidation` | `cloudfront:CreateInvalidation`                    |

### Scope Resources to Specific ARNs

Don't use `*`. Identify the exact resources:

- S3 bucket: `arn:aws:s3:::my-frontend-app-assets` (for `ListBucket`)
- S3 objects: `arn:aws:s3:::my-frontend-app-assets/*` (for `PutObject`, `DeleteObject`)
- CloudFront distribution: `arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7`

### Write the Policy

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
      "Sid": "AllowCacheInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    }
  ]
}
```

### Test and Iterate

Run the commands with the new policy. If something fails with an `AccessDenied` error, the error message usually tells you which action was denied. Add that specific action—don't expand to `s3:*` because one thing didn't work.

> [!TIP]
> AWS CloudTrail logs every API call made in your account, including which actions were actually invoked. If you're unsure what actions a service needs, attach a broader policy temporarily, run the workflow, then check CloudTrail to see exactly which actions were called. Narrow the policy to match. This is a legitimate way to get to least privilege—the key is that you actually narrow it down afterwards, not leave the broad policy in place.
>
> For IAM roles and users specifically, **IAM Access Advisor** (in the IAM console under the identity's details, and via `aws iam generate-service-last-accessed-details`) shows which AWS services the identity has _actually used_ in the last tracking period. It's the fastest path to spotting services attached via `AdministratorAccess` that the identity has never touched. Start with Access Advisor for a quick hit list, use CloudTrail when you need the specific `Action` names.

## Common Patterns for Frontend Deployments

Here are a few least-privilege policy patterns you'll encounter throughout this course:

### Static Site Deployer

Needs: push files to S3, invalidate CloudFront cache.

Actions: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `cloudfront:CreateInvalidation`.

### Lambda Execution Role

Needs: write logs (mandatory for any Lambda), plus whatever AWS services the function calls.

Baseline actions: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`. Add only the specific service actions the function needs—`dynamodb:GetItem` for reading data, `s3:GetObject` for reading files, etc.

### Read-Only Viewer

Needs: view resources in the console without modifying anything.

AWS provides a managed policy called `ReadOnlyAccess` for this, but even that might be broader than necessary. If someone only needs to see S3 and CloudFront, scope it to those services.

## The Rule of Thumb

When in doubt, deny. You can always add permissions later when something breaks with an `AccessDenied` error. You can't undo a data breach because your deploy bot had `iam:CreateUser` permissions it never needed.

Start narrow. Add actions one at a time. Always scope resources to specific ARNs. Treat every wildcard as a code smell that needs justification.

This isn't theoretical security advice—this is the practical discipline that separates "I deployed a site to AWS" from "I deployed a site to AWS and didn't end up on the front page of Hacker News for a credential leak." Honestly, it's worth the extra ten minutes.
