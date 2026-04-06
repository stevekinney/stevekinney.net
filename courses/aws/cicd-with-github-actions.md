---
title: 'CI/CD with GitHub Actions'
description: >-
  Set up a GitHub Actions workflow that builds your frontend and deploys it to AWS on every push to the main branch.
date: 2026-03-18
modified: 2026-04-06
tags:
  - aws
  - github-actions
  - cicd
  - deployment
---

You've got a deploy script that works. You run it from your laptop, it uploads to S3, invalidates CloudFront, and the site is updated. The problem: you have to remember to run it. And "you" is a single point of failure. If you're on vacation, nobody deploys. If you deploy from a dirty working tree, broken code goes live. If your laptop dies mid-deploy, the site is in a half-updated state.

If you want the AWS side of this pipeline open in another tab, keep the [IAM guide for managing access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html), the [`aws s3 sync` command reference](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html), and the [`aws cloudfront create-invalidation` command reference](https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html) handy.

CI/CD fixes this. Push to `main`, the pipeline runs, the site deploys. No human in the loop. This lesson sets up a GitHub Actions workflow that does exactly what your deploy script does—but triggered automatically on every push.

## Authentication: OIDC vs. Access Keys

Before writing the workflow, you need to decide how GitHub Actions authenticates with AWS. There are two approaches:

**Long-lived access keys**: Create an IAM user (like the `deploy-bot` from the [IAM Policy for a Deploy Bot exercise](iam-policy-exercise.md)), generate access keys, and store them as GitHub repository secrets. The workflow uses those credentials for every run.

**OIDC (OpenID Connect)**: GitHub Actions requests a short-lived token from AWS using federated identity. No long-lived secrets stored anywhere. AWS trusts GitHub's identity provider, verifies the token, and hands back temporary credentials that expire after the workflow finishes.

OIDC is the better choice, and I'd go as far as saying it should be your default. Access keys are static secrets that can leak—if someone gains access to your repository secrets, they have persistent AWS credentials. OIDC tokens are scoped to a single workflow run and expire automatically. AWS and GitHub both recommend OIDC for this reason.

## Setting Up OIDC: The AWS Side

You need to do two things in AWS: create an identity provider and create an IAM role that GitHub Actions can assume.

### Create the GitHub OIDC Identity Provider

This tells AWS to trust tokens issued by GitHub's OIDC endpoint.

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "ffffffffffffffffffffffffffffffffffffffff" \
  --region us-east-1 \
  --output json
```

AWS no longer validates the thumbprint for GitHub's OIDC provider, but the IAM API still requires a 40-character hex string. In other words, this field is syntactically required and operationally ignored for GitHub's endpoint today. Ridiculous? A little. Still, the command works.

> [!TIP]
> You only need to create this identity provider once per AWS account. If you have multiple repositories deploying to the same account, they all share this provider. Each repository gets its own IAM role with scoped permissions.

### Create an IAM Role for GitHub Actions

Create a trust policy that allows GitHub Actions to assume this role, scoped to your specific repository:

Save this as `github-actions-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

The `Condition` block is critical. Without it, _any_ GitHub repository could assume this role. The `sub` condition restricts it to pushes to the `main` branch of your specific repository. Replace `your-org/your-repo` with your actual GitHub organization and repository name.

> [!WARNING]
> Don't use `"StringLike": {"token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"}` with a trailing wildcard. That allows any branch, any pull request, and any tag in your repository to assume the role. Scope it to `ref:refs/heads/main` if you only want production deploys from the main branch.

Create the role:

```bash
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json \
  --region us-east-1 \
  --output json
```

### Attach Permissions to the Role

The role needs the same permissions as the deploy bot: S3 sync and CloudFront invalidation. You already wrote this policy in the [IAM Policy for a Deploy Bot exercise](iam-policy-exercise.md). Attach it to the new role:

```bash
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::123456789012:policy/DeployBotPolicy \
  --region us-east-1
```

You can reuse the exact same `DeployBotPolicy`—the permissions don't change just because the principal is a role instead of a user. This is the principle of least privilege from [Principle of Least Privilege](principle-of-least-privilege.md) applied to your CI/CD pipeline: the deploy role can sync files and invalidate caches, and nothing else.

## The GitHub Actions Workflow

Create the workflow file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync ./build/assets s3://my-frontend-app-assets/assets \
            --cache-control "public, max-age=31536000, immutable" \
            --region us-east-1 \
            --delete \
            --output json

          aws s3 cp ./build/index.html s3://my-frontend-app-assets/index.html \
            --cache-control "public, max-age=60" \
            --content-type "text/html" \
            --region us-east-1 \
            --output json

          aws s3 sync ./build s3://my-frontend-app-assets \
            --exclude "assets/*" \
            --exclude "index.html" \
            --region us-east-1 \
            --delete \
            --output json

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id E1A2B3C4D5E6F7 \
            --paths "/*" \
            --region us-east-1 \
            --output json
```

That's the complete workflow. Push to `main` and it builds, deploys, and invalidates.

## Breaking Down the Workflow

### Trigger

```yaml
on:
  push:
    branches:
      - main
```

The workflow runs on every push to `main`. Pull requests don't trigger a deploy. Pushes to feature branches don't trigger a deploy. Only merges to `main` result in a production deployment.

### Permissions

```yaml
permissions:
  id-token: write
  contents: read
```

The `id-token: write` permission is required for OIDC. It allows the workflow to request a JWT from GitHub's OIDC endpoint. The `contents: read` permission lets the workflow check out the repository code. Without `id-token: write`, the `aws-actions/configure-aws-credentials` step fails with a credentials error.

### AWS Credentials

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeployRole
    aws-region: us-east-1
```

This step uses the `aws-actions/configure-aws-credentials` action to exchange the GitHub OIDC token for temporary AWS credentials. The credentials are exported as environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) that subsequent `aws` CLI commands pick up automatically. The credentials expire when the workflow finishes.

### Deploy Steps

The deploy steps are the same three-phase upload from the [deploy script in the previous lesson](automating-deploys-with-aws-cli.md): hashed assets with long-lived cache headers, `index.html` with a short TTL, and everything else with defaults. The invalidation step clears the CloudFront cache.

## Secrets Configuration (If Using Access Keys)

If you can't use OIDC (some organizations have restrictions on identity providers), the fallback is storing access keys as GitHub repository secrets. Go to your repository's **Settings** > **Secrets and variables** > **Actions** and add:

- `AWS_ACCESS_KEY_ID`: The access key ID from the deploy bot user.
- `AWS_SECRET_ACCESS_KEY`: The secret access key from the deploy bot user.

Then replace the credentials step in the workflow:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
```

> [!WARNING]
> Access keys stored as repository secrets are long-lived credentials. If someone gains access to your repository settings, they have your AWS credentials. Rotate access keys regularly and scope the IAM user's policy as tightly as possible—this is exactly what the [IAM Policy for a Deploy Bot exercise](iam-policy-exercise.md) was designed for. OIDC avoids this risk entirely.

## Verifying the Workflow

After pushing the workflow file to `main`, go to the **Actions** tab in your GitHub repository. You should see the "Deploy to AWS" workflow running. Each step shows its output:

- **Checkout**: pulls the code.
- **Setup Node.js**: installs Node 20.
- **Install dependencies**: runs `npm ci` (clean install, faster than `npm install` in CI).
- **Build**: runs your build command.
- **Configure AWS credentials**: exchanges the OIDC token for temporary credentials.
- **Deploy to S3**: shows the `aws s3 sync` output including uploaded and deleted files.
- **Invalidate CloudFront cache**: shows the invalidation ID.

If any step fails, the workflow stops and subsequent steps don't run. A failed build doesn't result in a partial deploy.

## Common Issues

**"Credentials could not be loaded"**: The OIDC identity provider doesn't exist in your AWS account, or the role's trust policy doesn't match your repository and branch. Double-check the `sub` condition in the trust policy.

**"AccessDenied" on S3 or CloudFront**: The role exists and credentials work, but the attached policy doesn't grant the required permissions. Verify the policy allows `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, and `cloudfront:CreateInvalidation` on the correct resources.

**Build succeeds but files aren't updated**: The S3 sync completed, but you forgot the invalidation step. CloudFront is still serving cached copies. Add the `create-invalidation` step or wait for the cache TTL to expire.

> [!TIP]
> You can add a final verification step to the workflow that checks the deployment:
>
> ```yaml
> - name: Verify deployment
>   run: |
>     HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://example.com)
>     echo "Site returned HTTP $HTTP_STATUS"
> ```
>
> This doesn't block the workflow on failure, but it gives you immediate feedback in the workflow logs.
