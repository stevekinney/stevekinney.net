---
title: AWS for Frontend Engineers
description: >-
  Deploy, scale, and secure frontend applications on AWS—from S3 and
  CloudFront to Lambda, API Gateway, and DynamoDB—without ever needing to
  become a full-time cloud engineer.
layout: page
date: 2026-03-18
modified: '2026-03-31'
---

This course walks you through the AWS services that matter most to frontend engineers—the ones you'll actually use to ship, scale, and secure your applications. No hand-waving, no "just click here" tutorials that fall apart when the console changes. You'll understand what each service does, why it exists, and how it connects to the problems you've already been solving on the frontend.

> [!NOTE]
> Keep the [AWS documentation home](https://docs.aws.amazon.com/) and the [AWS CLI configuration guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) nearby while you work through the course. I'll usually teach the why first, and the AWS docs are the source of truth when the console or CLI wording drifts.

We start with the basics—getting an AWS account set up without shooting yourself in the foot—then build the static-hosting pipeline in the order that actually makes sense when you're doing this from scratch. You learn S3 first so the storage model clicks. Then you step into domains and DNS so you actually control the name you want to use. From there, ACM certificate validation stops feeling mystical, CloudFront has something real to terminate TLS for, and Route 53 becomes the final routing layer instead of a vague side quest at the end.

Along the way, you'll still do the public S3 website version because it's the cleanest way to see the moving parts in isolation. But the course treats that as a learning checkpoint, not the production answer. The production answer is the stack you actually want: private S3 bucket, CloudFront in front, ACM for HTTPS, and Route 53 alias records pointing your domain at the distribution.

Throughout the second half of the course, you'll keep returning to the same capstone app: **Summit Supply**, a small outdoor gear storefront that starts as a static frontend and gradually picks up real backend behavior. The marketing pages live on S3 and CloudFront. The product API runs on Lambda behind API Gateway. DynamoDB stores customer-specific data. Secrets Manager and Parameter Store hold credentials and configuration. CloudWatch shows you what breaks when real users start clicking around. Same app, more layers, higher stakes.

By the end, you'll have deployed a real application to AWS and understood every layer of the stack you built.
