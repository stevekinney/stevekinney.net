---
title: 'Writing Your First IAM Policy'
description: >-
  Write an IAM policy from scratch, understanding the Version, Statement,
  Effect, Action, and Resource fields.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - iam
  - policies
  - json
---

You know how every API endpoint in your frontend app has some middleware that checks whether the user has the right permissions before letting the request through? IAM policies are that middleware, but for all of AWS. They're JSON documents—you already know JSON—and once you understand the five fields that matter, you can write them from scratch instead of copying examples from Stack Overflow and hoping for the best. (I've been there. We've all been there.)

If you want AWS's version of the policy language while you read, the [IAM JSON policy reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html) is the official source of truth.

## The Structure of an IAM Policy

Every **IAM policy** follows the same shape:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DescriptiveNameForThisStatement",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
    }
  ]
}
```

Five fields. That's it. Let's break each one down.

### Version

```json
"Version": "2012-10-17"
```

This is the **policy language version**, not a date you update. The current (and only practical) version is `2012-10-17`. AWS introduced this version in 2012 and has kept it ever since. There's an older version (`2008-10-17`) that lacks features like policy variables—don't use it.

Always include this field. Always set it to `2012-10-17`. Move on.

### Statement

The **Statement** is an array of individual permission rules. Each element in the array is one rule that either allows or denies specific actions on specific resources. A single policy can contain multiple statements:

```json
"Statement": [
  { "Effect": "Allow", "Action": "s3:GetObject", "Resource": "..." },
  { "Effect": "Allow", "Action": "s3:PutObject", "Resource": "..." }
]
```

You can combine these into a single statement with an array of actions (we'll get to that), but splitting them keeps each rule readable.

### Sid (Optional)

The **Sid** (Statement ID) is an optional human-readable label for the statement. It has no functional effect on evaluation—it's purely for you and your human teammates.

```json
"Sid": "AllowReadAccessToAssetsBucket"
```

I'd recommend always including one. When you're staring at a policy six months from now trying to figure out what it does, a descriptive Sid is worth its weight in gold.

### Effect

**Effect** is either `"Allow"` or `"Deny"`. There are no other options. This field determines whether the statement grants or blocks access.

As we covered in [IAM Mental Model](iam-mental-model.md), `Deny` always beats `Allow`. If one statement says Allow and another says Deny for the same action and resource, the Deny wins.

> [!NOTE] `Effect` versus `Action`
> Think of **Action** as _what someone is trying to do_ and **Effect** as _AWS's answer to that request_. `s3:GetObject` is the action. `"Allow"` or `"Deny"` is the effect. Put them together and you get a complete rule: "allow `s3:GetObject`" or "deny `s3:GetObject`." Same action, different verdict.

### Action

An **Action** specifies which AWS API operations the statement applies to. Actions follow the pattern `<service>:<operation>`:

- `s3:GetObject`—read a file from S3
- `s3:PutObject`—upload a file to S3
- `cloudfront:CreateInvalidation`—invalidate cached files in CloudFront
- `iam:CreateUser`—create a new IAM user

You can specify a single action as a string or multiple actions as an array:

```json
"Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
```

Wildcards work too. `s3:*` means "every S3 action." `s3:Get*` means "every S3 action that starts with Get." We'll talk about why wildcards are dangerous in [Principle of Least Privilege](principle-of-least-privilege.md).

> [!TIP]
> You don't need to memorize action names. AWS documents every action for every service. Search for "IAM actions for S3" or "IAM actions for CloudFront" and you'll find the complete list. The AWS Policy Generator tool can also help you discover the right action names.

### Resource

The **Resource** field specifies which AWS resources the statement applies to, identified by their **ARN (Amazon Resource Name)**. ARNs are globally unique identifiers that follow this format:

```
arn:aws:<service>:<region>:<account-id>:<resource-type>/<resource-id>
```

A few examples:

| Resource                           | ARN                                                            |
| ---------------------------------- | -------------------------------------------------------------- |
| A specific S3 bucket               | `arn:aws:s3:::my-frontend-app-assets`                          |
| All objects in that bucket         | `arn:aws:s3:::my-frontend-app-assets/*`                        |
| A specific CloudFront distribution | `arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7` |
| All resources (dangerous)          | `*`                                                            |

Notice that S3 bucket ARNs don't include a region or account ID—bucket names are globally unique, so AWS doesn't need them to identify the resource. Other services do include the region and account. You'll get used to the pattern for each service as you use it.

> [!WARNING]
> The difference between `arn:aws:s3:::my-frontend-app-assets` (the bucket itself) and `arn:aws:s3:::my-frontend-app-assets/*` (the objects in the bucket) matters. `s3:ListBucket` operates on the bucket, while `s3:GetObject` operates on objects within the bucket. If you mix these up, your policy won't work and the error messages won't tell you why.

## A Real Policy: Read-Only Access to Your Assets Bucket

> [!TIP]
> All IAM policies from this lesson are available as standalone JSON files in the [Scratch Lab repository](https://github.com/stevekinney/scratch-lab/tree/main/policies/iam-policies).

Let's write a policy that grants read-only access to your static assets bucket. This is the kind of policy you'd attach to a role that only needs to serve files—no uploading, no deleting.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets"
      // [!note `s3:ListBucket` operates on the bucket ARN, not the objects inside it.]
    },
    {
      "Sid": "AllowReadObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
      // [!note `s3:GetObject` operates on objects, so the ARN ends with `/*`.]
    }
  ]
}
```

Two statements, two different resource scopes. The first lets you list what's in the bucket. The second lets you read individual files. Together, they give you read-only access. Nothing more.

## Attaching a Policy

A policy sitting by itself doesn't do anything. You need to attach it to a user, group, or role.

### Using the Console

1. Navigate to **IAM** > **Policies** > **Create policy**.
2. Click the **JSON** tab (the visual editor is fine for exploration, but you should know the JSON).
3. Paste your policy document.
4. Click **Next**, give it a name like `S3AssetsReadOnly`, and click **Create policy**.
5. Navigate to the user or role you want to grant these permissions to.
6. Click **Add permissions** > **Attach policies**.
7. Search for `S3AssetsReadOnly` and attach it.

### Using the CLI

You can also create and attach policies with the AWS CLI:

```bash
aws iam create-policy \
  --policy-name S3AssetsReadOnly \
  --policy-document file://s3-assets-read-only.json \
  --region us-east-1 \
  --output json
```

This command returns the policy's **ARN**, which you'll need to attach it:

```bash
aws iam attach-user-policy \
  --user-name admin \
  --policy-arn arn:aws:iam::123456789012:policy/S3AssetsReadOnly \
  --region us-east-1 \
  --output json
```

### With the SDK

```typescript
import { IAMClient, CreatePolicyCommand, AttachUserPolicyCommand } from '@aws-sdk/client-iam';

const iam = new IAMClient({ region: 'us-east-1' });

const policy = await iam.send(
  new CreatePolicyCommand({
    PolicyName: 'S3AssetsReadOnly',
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowListBucket',
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: 'arn:aws:s3:::my-frontend-app-assets',
        },
        {
          Sid: 'AllowReadObjects',
          Effect: 'Allow',
          Action: ['s3:GetObject'],
          Resource: 'arn:aws:s3:::my-frontend-app-assets/*',
        },
      ],
    }),
  }),
);

await iam.send(
  new AttachUserPolicyCommand({
    UserName: 'admin',
    PolicyArn: policy.Policy!.Arn!,
  }),
);
```

## A More Practical Policy: Deploy Permissions

Here's something closer to what you'll actually need. This policy lets a user sync files to an S3 bucket and create CloudFront invalidations—the two operations required to deploy a static frontend:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3Sync",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-frontend-app-assets", "arn:aws:s3:::my-frontend-app-assets/*"]
    },
    {
      "Sid": "AllowCloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
      // [!note Scoped to one specific distribution, not all distributions in the account.]
    }
  ]
}
```

Notice that the **Resource** field in the CloudFront statement targets a specific distribution by its ARN. The user can't invalidate caches on other distributions—only the one you specified. That's intentional.

> [!TIP]
> When building a policy, start by asking: "What CLI commands or SDK calls does this user need to run?" Each CLI command maps to one or more IAM actions. `aws s3 sync` needs `s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket`. `aws cloudfront create-invalidation` needs `cloudfront:CreateInvalidation`. Work backwards from the commands to the policy.

## Condition Keys: Narrowing Allows

The five fields above (`Version`, `Statement`, `Effect`, `Action`, `Resource`) form a working policy. A sixth field, `Condition`, lets you narrow an allow to only fire when specific request attributes match. It's how you turn "allow this action on this resource" into "allow this action on this resource _only when the request comes from my own region_" or "only when the caller's source IP is in a certain range."

One concrete example: restrict an IAM user to operations in `us-east-1` only. Even if they have permission to call `ec2:RunInstances`, the condition refuses the call unless the request is scoped to `us-east-1`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

`aws:RequestedRegion` is a **global condition key**—available on every request. Others worth knowing:

- **`aws:SourceIp`** — CIDR-scoped access (office networks).
- **`aws:SourceVpc`** — only from a specific VPC (for private workloads).
- **`aws:MultiFactorAuthPresent`** — require MFA for sensitive actions.
- **`aws:PrincipalTag/<tagKey>`** — ABAC-style gating by caller tag.

The full list lives in the [AWS global condition context keys reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html).

## Common Mistakes

**Forgetting the `Version` field.** Without it, AWS falls back to the 2008 policy language, which behaves differently. Always include `"Version": "2012-10-17"`.

**Using `Resource: "*"` by habit.** This grants access to every resource of the action's type in your account. Sometimes it's necessary (IAM actions like `iam:ListUsers` don't support resource-level restrictions), but for S3 and CloudFront, always scope to specific ARNs.

**Confusing bucket ARNs and object ARNs.** `arn:aws:s3:::my-bucket` is the bucket. `arn:aws:s3:::my-bucket/*` is the objects inside the bucket. Some actions operate on the bucket (like `s3:ListBucket`), others operate on objects (like `s3:GetObject`). If your policy isn't working, this is the first thing to check.

You now know how to write a policy from scratch. In [Principle of Least Privilege](principle-of-least-privilege.md), we'll talk about how to make sure your policies aren't granting more access than they should.
