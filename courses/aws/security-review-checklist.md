---
title: Security Review Checklist
description: >-
  Walk through a security review checklist that covers IAM policies, S3 bucket
  access, CloudFront settings, Lambda permissions, API Gateway authentication,
  and DynamoDB access.
date: 2026-03-18
modified: 2026-04-15
tags:
  - aws
  - security
  - checklist
  - review
---

You've built a full-stack application on AWS. S3 holds your static assets, CloudFront serves them globally, Lambda runs your API logic, API Gateway handles HTTP routing, DynamoDB stores your data, and Secrets Manager keeps your credentials safe. Every one of those services has security configuration, and every one of them defaults to something you should probably change.

If you want AWS's official security baseline next to this checklist, the [IAM best practices guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) is the reference worth bookmarking.

This is your pre-flight checklist. Work through it before you point real users at your deployment. None of these items are new—you've configured all of them throughout this course—but seeing them together in one place is how you catch the one you forgot.

## Why This Matters

Security failures in AWS are usually accumulation failures. One permissive IAM policy, one bucket policy left public, one secret still sitting in configuration, one unauthenticated route you meant to lock down later. This lesson is where you review Summit Supply as a system instead of as a pile of individually reasonable decisions.

## Builds On

This lesson builds on every service section in the course. It is intentionally a synthesis lesson: IAM foundations, static hosting, domain and certificate management, Lambda and API Gateway, DynamoDB, and secret storage all show up here at once.

## IAM: Who Can Do What

IAM is the foundation everything else sits on. If your IAM policies are too broad, every other security measure is undermined. I can't overstate this one.

- [ ] **The root user has MFA enabled and isn't used for daily work.** You set this up in [Creating and Securing an AWS Account](creating-and-securing-an-aws-account.md). Go to the IAM dashboard right now and confirm MFA is active on the root user. If you've been using root credentials for CLI work, stop.

- [ ] **No IAM user has `AdministratorAccess` unless they genuinely need it.** Your `admin` user from the IAM foundation section may have broad permissions for learning purposes. In production, even admin users should have scoped policies. Review the policies attached to every IAM user and group in your account.

- [ ] **Lambda execution roles follow least privilege.** Your `my-frontend-app-lambda-role` should only have the permissions your function actually uses. If your Lambda reads from DynamoDB, the role needs `dynamodb:GetItem` and `dynamodb:Query` on your specific table—not `dynamodb:*` on `*`. Revisit the approach from [Principle of Least Privilege](principle-of-least-privilege.md).

- [ ] **CI/CD credentials are scoped to deployment actions only.** The IAM user or role your GitHub Actions workflow uses (from [CI/CD with GitHub Actions](cicd-with-github-actions.md)) should have exactly the permissions needed to sync files to S3, create CloudFront invalidations, and update Lambda functions. Nothing more.

- [ ] **No access keys exist that you aren't actively using.** Run this command and review every key:

```bash
aws iam list-access-keys \
  --user-name admin \
  --region us-east-1 \
  --output json
```

If you created access keys during the course that you no longer need, delete them. Old keys are the most common source of credential leaks.

- [ ] **No inline policies exist on users.** Policies should be attached to groups or roles, not directly to users. Inline policies are harder to audit and easier to forget about.

## S3: Who Can Read Your Files

S3 buckets are one of the most common sources of AWS security incidents. Misconfigured bucket policies have exposed everything from customer data to classified documents.

- [ ] **Public access is blocked at the account level (unless you have a specific reason).** S3 has an account-level setting called "Block Public Access" that overrides bucket-level policies. If you're serving assets through CloudFront with Origin Access Control, your bucket should never be directly public.

- [ ] **Your bucket policy only grants access to CloudFront via OAC.** You configured this in [Origin Access Control for S3](origin-access-control-for-s3.md). The bucket policy should reference your CloudFront distribution's service principal—not `"Principal": "*"`. Verify:

```bash
aws s3api get-bucket-policy \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

- [ ] **Versioning is enabled on buckets containing important data.** You set this up in [S3 Versioning, Lifecycle, and Cost](s3-versioning-lifecycle-and-cost.md). Versioning protects against accidental overwrites and deletions.

- [ ] **No bucket has a policy granting `s3:*` to `"Principal": "*"`.** This is the "open bucket" configuration that makes the news. If you see it, remove it immediately.

## CloudFront: What Reaches the Edge

CloudFront sits between your users and your origin. Its configuration determines what gets served, how it gets served, and whether security headers are present.

- [ ] **HTTPS is enforced.** Your distribution should redirect HTTP to HTTPS or deny HTTP entirely. You configured this when you attached your ACM certificate in [Attaching an SSL Certificate](attaching-an-ssl-certificate.md). Verify that the viewer protocol policy is set to "Redirect HTTP to HTTPS" or "HTTPS Only."

- [ ] **Origin Access Control is configured (not the older OAI).** OAC is the current recommended mechanism. If you set up your distribution early in the course using Origin Access Identity, migrate to OAC as described in [Origin Access Control for S3](origin-access-control-for-s3.md).

- [ ] **Security headers are configured.** You set up response header policies in [CloudFront Headers, CORS, and Security](cloudfront-headers-cors-and-security.md). At minimum, your distribution should send:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or `SAMEORIGIN` if you need iframes)

- [ ] **The default root object is set to `index.html`.** Without this, requests to your domain root return an error instead of your application.

- [ ] **Custom error pages handle SPA routing.** You configured 403/404 responses to return `index.html` with a 200 status in [Custom Error Pages and SPA Routing](custom-error-pages-and-spa-routing.md). Verify this still works by navigating directly to a deep route in your application.

## Lambda: What Your Functions Can Access

Every Lambda function runs with an execution role. That role's policies define the blast radius if your function has a bug or gets exploited.

- [ ] **Each function has its own execution role.** Don't share execution roles across functions with different permission needs. A function that reads from DynamoDB shouldn't also have permission to send emails via SES just because another function in the same account needs that.

- [ ] **Environment variables don't contain secrets.** You moved secrets to Secrets Manager or Parameter Store in [The Problem with Hardcoded Secrets](the-problem-with-hardcoded-secrets.md) and [Accessing Secrets from Lambda](accessing-secrets-from-lambda.md). Verify by checking the function's configuration:

```bash
aws lambda get-function-configuration \
  --function-name my-frontend-app-api \
  --region us-east-1 \
  --output json
```

If you see API keys, database passwords, or tokens in the `Environment.Variables` section, move them to Secrets Manager.

- [ ] **The function timeout is set to a reasonable value.** The default timeout is 3 seconds. If your function calls external APIs, you might need more—but setting it to the maximum (15 minutes) means a runaway function burns compute for 15 minutes before Lambda kills it.

- [ ] **The function memory is right-sized.** Lambda charges by GB-second. A function with 1024 MB of memory costs twice as much per millisecond as one with 512 MB. But more memory also means more CPU, so a function might run twice as fast with double the memory—netting out to the same cost.

## API Gateway: Who Can Call Your API

API Gateway is the front door to your backend. Without authentication and proper CORS configuration, anyone can call your endpoints.

- [ ] **Authentication is configured on routes that need it.** You set up JWT authorizers or Lambda authorizers in [API Gateway Authentication](api-gateway-authentication.md). Verify that protected routes actually reject unauthenticated requests:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/protected-route
```

You should get a `401` back, not a `200`.

- [ ] **CORS is configured to allow only your domain.** In [API Gateway CORS Configuration](api-gateway-cors-configuration.md), you set `Access-Control-Allow-Origin`. Make sure it's set to your specific domain (`https://example.com`), not `*`. A wildcard CORS policy lets any website call your API from a user's browser.

- [ ] **Throttling is configured.** API Gateway supports rate limiting. Without it, a single client can overwhelm your Lambda functions (and your bill). The default throttle is 10,000 requests per second—probably more than you want for a personal project.

## DynamoDB: Who Can Read Your Data

DynamoDB access is controlled entirely through IAM. There are no database usernames or passwords—which is great for simplicity but means IAM policies are your only line of defense.

- [ ] **Lambda execution roles specify the exact table ARN.** Your IAM policy should reference `arn:aws:dynamodb:us-east-1:123456789012:table/my-frontend-app-data`, not `arn:aws:dynamodb:us-east-1:123456789012:table/*`. You configured this in [Connecting DynamoDB to Lambda](connecting-dynamodb-to-lambda.md).

- [ ] **Only the actions your function uses are allowed.** If your function only reads data, grant `dynamodb:GetItem` and `dynamodb:Query`. Don't grant `dynamodb:DeleteItem` or `dynamodb:DeleteTable` unless the function actually needs to delete things.

- [ ] **DynamoDB Streams aren't enabled unless you're using them.** Streams capture every change to your table and can trigger Lambda functions. If you enabled streams during experimentation, disable them if you don't need them—they're a potential data exfiltration vector.

## The One-Command Audit

AWS provides a service called **IAM Access Analyzer** that can scan your account for resources shared with external entities—public S3 buckets, cross-account IAM roles, and similar misconfigurations. It is free to use and takes about 30 seconds to set up:

```bash
aws accessanalyzer create-analyzer \
  --analyzer-name my-frontend-app-analyzer \
  --type ACCOUNT \
  --region us-east-1 \
  --output json
```

After it runs, check the findings:

```bash
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/my-frontend-app-analyzer \
  --region us-east-1 \
  --output json
```

If the findings list is empty, nothing in your account is publicly accessible or shared with external accounts. If it isn't empty, each finding tells you exactly which resource is exposed and why.

> [!TIP]
> Run IAM Access Analyzer every time you change a bucket policy, IAM role trust policy, or any resource-based policy. It catches misconfigurations that are easy to miss by reading JSON.
>
> Access Analyzer also has an **unused access** analyzer type (`--type ACCOUNT_UNUSED_ACCESS`) that surfaces IAM users and roles that haven't been used recently, plus permissions granted but never exercised. Create one of these in addition to the external-access analyzer above and review the findings monthly—it's the easiest way to prune access drift over time.

## Security Isn't a One-Time Task

This checklist is a snapshot. It covers the state of your infrastructure right now. But infrastructure changes—you add a new Lambda function, you modify a bucket policy, you create a new IAM user for a contractor. Each change is an opportunity to introduce a misconfiguration.

The real security practice is making this review a habit. Run through this list after every significant infrastructure change. Better yet, codify it: Infrastructure as Code (which you'll see in [Infrastructure as Code and CDK](infrastructure-as-code-and-cdk.md)) lets you define security configuration in version-controlled templates, so changes go through code review before they reach AWS.

> [!WARNING]
> The most dangerous moment in AWS security isn't day one—it's month six, when you've forgotten which policies you attached to which roles and a quick `"Action": "*"` feels easier than looking up the right permission. Resist the urge. The checklist exists for a reason.

## Verification

- You can run the one-command audit section and explain what each result means instead of just skimming for the word `DENY`.
- You can trace one real user request through the stack and identify which IAM role, bucket policy, API route, and data permissions it depends on.
- You can point at at least one configuration in your current environment that you would reject in a code review today.

## Common Failure Modes

- **Reviewing services in isolation:** Most real exposures come from the way two services interact, not from an obviously broken single screen in the console.
- **Treating temporary broad permissions as harmless:** Temporary permissions become architecture with enough calendar time.
- **Assuming a successful deployment implies a secure deployment:** Functionality only proves the happy path works. It says nothing about who else can reach it.
