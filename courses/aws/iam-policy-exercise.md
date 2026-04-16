---
title: 'Exercise: IAM Policy for a Deploy Bot'
description: >-
  Create an IAM user and policy that can only sync files to an S3 bucket and
  create CloudFront invalidations.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - iam
  - exercise
---

You're going to create a **deploy bot**—an IAM user whose sole purpose is to deploy your frontend. This user can sync files to a specific S3 bucket and invalidate a specific CloudFront distribution's cache. It can't do anything else. No reading DynamoDB tables, no creating Lambda functions, no changing IAM permissions.

In production, this deploy identity would be an **OIDC-federated IAM role** rather than a user with static access keys—GitHub Actions can request short-lived credentials from AWS without storing any secrets. You'll graduate `deploy-bot` (or its OIDC role equivalent) into the GitHub Actions deploy in the CI/CD lesson. For now, building it as an IAM user with scoped keys is the right learning path: it forces you to think explicitly about which permissions are needed and why.

> [!WARNING] Delete these keys after the CI/CD lesson
> The access keys you generate in this exercise are training wheels. Once you reach [CI/CD with GitHub Actions](cicd-with-github-actions.md) and wire up the OIDC-federated role, **delete the `deploy-bot` access keys** (`aws iam delete-access-key --user-name deploy-bot --access-key-id <id>`). Long-lived access keys sitting around after you no longer need them are the textbook way AWS accounts get compromised. The IAM role stays, the policy attached to it stays, but the keys go.

This is the same deploy bot you'll wire into a GitHub Actions pipeline later in the course. I want you to build it now so you understand exactly what permissions it has and why.

> [!TIP]
> If you want the AWS version of the policy mechanics while you work, keep the [IAM JSON policy reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html) and the [`aws iam create-policy` command reference](https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html) open.

## Why It Matters

Every CI/CD pipeline needs credentials. On Vercel, the platform handles this for you—you never think about what permissions the deploy process has. On AWS, you control those permissions explicitly. And the permissions you choose determine the blast radius if those credentials leak.

A deploy bot with `AdministratorAccess` can delete your database. A deploy bot with a scoped policy can, at worst, overwrite your static files. The difference is a bad day versus a catastrophic one.

## Your Task

Create an IAM user named `deploy-bot` with:

- **No console access**—this user exists purely for CLI/API use.
- **Access keys** for programmatic access.
- **A custom IAM policy** that allows exactly these operations and nothing more:
  - Sync files to the `my-frontend-app-assets` S3 bucket (upload, delete, and list)
  - Create cache invalidations on the CloudFront distribution with ID `E1A2B3C4D5E6F7`

Use the account ID `123456789012` and region `us-east-1` for all ARNs.

## Step-by-Step

### Create the IAM User

In the AWS Console, navigate to **IAM** > **Users** > **Create user**.

- Set the username to `deploy-bot`.
- **Do not** enable console access. This user will only authenticate via access keys.
- Skip the permissions step for now—you'll attach a policy after creating it.
- Click through to create the user.

Alternatively, use the CLI:

```bash
aws iam create-user \
  --user-name deploy-bot \
  --region us-east-1 \
  --output json
```

### Create Access Keys for the User

Navigate to the `deploy-bot` user's **Security credentials** tab and create an access key. Choose **Other** as the use case.

Or via CLI:

```bash
aws iam create-access-key \
  --user-name deploy-bot \
  --region us-east-1 \
  --output json
```

Save the Access Key ID and Secret Access Key somewhere secure. You'll need them later when configuring the deploy pipeline.

### Write the Policy

Create a file called `deploy-bot-policy.json` with a policy that:

1. Allows `s3:PutObject` and `s3:DeleteObject` on objects in the `my-frontend-app-assets` bucket.
2. Allows `s3:ListBucket` on the `my-frontend-app-assets` bucket itself.
3. Allows `cloudfront:CreateInvalidation` on the distribution `E1A2B3C4D5E6F7`.

Remember:

- `s3:PutObject` and `s3:DeleteObject` operate on **objects**, so the resource ARN needs `/*` at the end.
- `s3:ListBucket` operates on the **bucket**, so the resource ARN doesn't have `/*`.
- CloudFront distribution ARNs have no region (use an empty region segment) and follow the pattern `arn:aws:cloudfront::<account-id>:distribution/<distribution-id>`.
- Every statement needs `Effect`, `Action`, and `Resource`.
- The policy needs `"Version": "2012-10-17"`.

### Create the Policy in IAM

```bash
aws iam create-policy \
  --policy-name DeployBotPolicy \
  --policy-document file://deploy-bot-policy.json \
  --region us-east-1 \
  --output json
```

Note the policy ARN from the output—you'll need it for the next step.

### Attach the Policy to the User

```bash
aws iam attach-user-policy \
  --user-name deploy-bot \
  --policy-arn arn:aws:iam::123456789012:policy/DeployBotPolicy \
  --region us-east-1 \
  --output json
```

### Verify the Setup

Configure a named profile for the deploy bot:

```bash
aws configure --profile deploy-bot
```

Enter the access key ID and secret access key you saved earlier, `us-east-1` as the region, and `json` as the output format.

Verify the identity:

```bash
aws sts get-caller-identity \
  --profile deploy-bot \
  --region us-east-1 \
  --output json
```

You should see the `deploy-bot` user's ARN in the response.

## With the SDK

The whole exercise in TypeScript, for comparison:

```typescript
import {
  IAMClient,
  CreateUserCommand,
  CreateAccessKeyCommand,
  CreatePolicyCommand,
  AttachUserPolicyCommand,
} from '@aws-sdk/client-iam';

const iam = new IAMClient({ region: 'us-east-1' });

await iam.send(new CreateUserCommand({ UserName: 'deploy-bot' }));

const keys = await iam.send(new CreateAccessKeyCommand({ UserName: 'deploy-bot' }));
// This response is the ONLY time the secret is returned — store it now.
console.log('Access key:', keys.AccessKey?.AccessKeyId);
console.log('Secret:', keys.AccessKey?.SecretAccessKey);

const policy = await iam.send(
  new CreatePolicyCommand({
    PolicyName: 'DeployBotPolicy',
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:DeleteObject'],
          Resource: 'arn:aws:s3:::my-frontend-app-assets/*',
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: 'arn:aws:s3:::my-frontend-app-assets',
        },
        {
          Effect: 'Allow',
          Action: ['cloudfront:CreateInvalidation'],
          Resource: 'arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7',
        },
      ],
    }),
  }),
);

await iam.send(
  new AttachUserPolicyCommand({
    UserName: 'deploy-bot',
    PolicyArn: policy.Policy!.Arn!,
  }),
);
```

## Checkpoints

- [ ] `deploy-bot` IAM user exists with no console access
- [ ] Access keys are created and stored securely
- [ ] `DeployBotPolicy` is a customer-managed policy in your account
- [ ] The policy allows exactly four actions: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, and `cloudfront:CreateInvalidation`
- [ ] The S3 actions are scoped to `my-frontend-app-assets` (bucket and objects, with correct ARN patterns)
- [ ] The CloudFront action is scoped to distribution `E1A2B3C4D5E6F7`
- [ ] The policy is attached to the `deploy-bot` user
- [ ] `aws sts get-caller-identity --profile deploy-bot` returns the correct identity

## Failure Diagnosis

- **`aws sts get-caller-identity` fails with `InvalidClientTokenId`:** The named profile is using the wrong access key pair, or the keys were copied incorrectly when you created them.
- **Later deploy commands fail with `AccessDenied` on S3:** Double-check that object actions use `arn:aws:s3:::my-frontend-app-assets/*` while `s3:ListBucket` uses the bucket ARN without `/*`.
- **CloudFront invalidation fails even though S3 sync works:** The distribution ARN is wrong. CloudFront ARNs omit the region segment and must point at `E1A2B3C4D5E6F7` in account `123456789012`.

## Stretch Goals

- **Test the boundaries.** Try running a command the deploy bot shouldn't have access to—like `aws iam list-users --profile deploy-bot --region us-east-1 --output json`. Confirm that you get an `AccessDenied` error. This is the policy doing its job.

- **Add a Deny statement.** Add an explicit Deny statement that prevents the deploy bot from deleting the bucket itself (`s3:DeleteBucket`). Technically the bot already can't do this (the action isn't in the Allow statements), but an explicit Deny acts as a guardrail even if someone later expands the Allow statements.

- **Use Sids.** If you didn't include `Sid` fields in your policy statements, add descriptive ones. When you revisit this policy in three months, `"Sid": "AllowS3DeploySync"` is worth more than staring at a list of actions trying to remember what they're for.

When you're ready, check your work against the [Solution: IAM Policy for a Deploy Bot](iam-policy-solution.md).

## Cleanup

Keep `deploy-bot` around—you'll use it again in the CI/CD lesson. When you're done with the entire course, run this sequence to tear the user down. IAM has strict ordering rules: deactivate the access key, detach the policy, delete the access key, then delete the user. Miss a step and the final `delete-user` call fails with `DeleteConflict`.

First, find the access key ID (the one you saved earlier works too, but this avoids digging through notes):

```bash
aws iam list-access-keys \
  --user-name deploy-bot \
  --region us-east-1 \
  --output json
```

Then deactivate and remove the key:

```bash
aws iam update-access-key \
  --user-name deploy-bot \
  --access-key-id AKIAEXAMPLE \
  --status Inactive \
  --region us-east-1

aws iam delete-access-key \
  --user-name deploy-bot \
  --access-key-id AKIAEXAMPLE \
  --region us-east-1
```

Detach the policy and delete it:

```bash
aws iam detach-user-policy \
  --user-name deploy-bot \
  --policy-arn arn:aws:iam::123456789012:policy/DeployBotPolicy \
  --region us-east-1

aws iam delete-policy \
  --policy-arn arn:aws:iam::123456789012:policy/DeployBotPolicy \
  --region us-east-1
```

Finally, delete the user:

```bash
aws iam delete-user \
  --user-name deploy-bot \
  --region us-east-1
```

Also remove the named profile from your local AWS config by opening `~/.aws/credentials` and `~/.aws/config` and deleting the `[deploy-bot]` sections.
