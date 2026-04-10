---
title: "What's Next: Services You'll Eventually Need"
description: >-
  Survey the AWS services you'll likely need next—Amplify, Cognito, Step
  Functions, EventBridge, SQS, ECS/Fargate, and WAF—and understand when each
  becomes relevant.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - services
  - next-steps
  - overview
---

You now know how to deploy a static frontend with S3 and CloudFront, run serverless functions with Lambda, expose APIs through API Gateway, store data in DynamoDB, manage secrets with Secrets Manager and Parameter Store, and monitor all of it with CloudWatch. That's a real stack. You can build and ship production applications with exactly what you've learned.

If you want AWS's official version of the services in this tour, start with the [Amazon ECS Developer Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html) and the [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html).

But AWS has over 200 services, and at some point your application will need something that isn't in your current toolkit. This lesson is a map of the services you're most likely to reach for next—not a tutorial, just enough context to know what each one does and when it becomes relevant.

## Amplify

**AWS Amplify** is a managed platform for full-stack web and mobile applications. Think of it as AWS's answer to Vercel or Netlify—it handles hosting, CI/CD, and backend provisioning through a single interface.

**When you'd reach for it:** You want the developer experience of Vercel (Git-push deploys, preview environments, managed hosting) but on AWS infrastructure. Amplify supports Next.js, Nuxt, Astro, and other frameworks with server-side rendering, and it provisions backend resources (auth, APIs, storage) through a CLI workflow.

**Why you didn't use it in this course:** Amplify abstracts away the services you spent 12 modules learning. That abstraction is valuable when you want speed, but this course was about understanding what's underneath. Now that you know what Amplify does behind the scenes—S3, CloudFront, Lambda, API Gateway, DynamoDB—you can use it with informed confidence instead of blind trust.

## Cognito

**Amazon Cognito** provides user authentication and authorization. It handles sign-up, sign-in, password resets, multi-factor authentication, and social login (Google, Apple, Facebook) without you building any of that infrastructure yourself.

**When you'd reach for it:** Your application needs user accounts. You set up JWT authorizers or Lambda authorizers in [API Gateway Authentication](api-gateway-authentication.md)—Cognito is what generates those JWTs. It gives you a hosted login UI, user pools for managing identities, and direct integration with API Gateway and Lambda.

**The frontend angle:** Cognito provides a JavaScript SDK (`amazon-cognito-identity-js` and the newer Amplify Auth library) that handles the entire authentication flow from your React application. You call a function, the user sees a login form, and you get back tokens that your API Gateway authorizer validates. No auth server to build or maintain.

## Step Functions

**AWS Step Functions** is a serverless orchestration service. It lets you chain multiple Lambda functions (and other AWS services) into workflows with branching, retries, error handling, and parallel execution.

**When you'd reach for it:** Your backend logic outgrows a single Lambda function. Instead of one function that processes a form submission, sends an email, updates a database, and generates a PDF, you break the work into steps—each step is a Lambda function, and Step Functions manages the flow between them. If step three fails, Step Functions retries it without re-running steps one and two.

**The mental model:** If Lambda is a single function call, Step Functions is `async/await` with `try/catch` for a series of function calls—except the orchestration runs on AWS infrastructure, not in your code.

## EventBridge

**Amazon EventBridge** is a serverless event bus. It routes events between AWS services, third-party SaaS applications, and your own custom code based on rules you define.

**When you'd reach for it:** Your application needs to react to things happening in your AWS account without tight coupling. A user uploads a file to S3, and you want to resize it with Lambda. A DynamoDB item changes, and you want to send a notification. An external service (Stripe, Shopify, Auth0) fires a webhook, and you want to process it. EventBridge decouples the "something happened" from the "do something about it."

**Why it matters:** Without EventBridge, you end up with Lambda functions that call other Lambda functions, creating a tangle of direct invocations that's hard to debug and harder to change. EventBridge gives you a central routing layer where you can add, remove, or modify event handlers without touching the producers.

## SQS

**Amazon Simple Queue Service (SQS)** is a managed message queue. You put messages in, consumers pull them out, and SQS guarantees that every message gets processed at least once.

**When you'd reach for it:** Your Lambda function receives a burst of requests and you need to process them reliably without losing any. Instead of your API handler doing heavy work synchronously (making the user wait), it drops a message on an SQS queue and returns immediately. A separate Lambda function polls the queue and processes messages at its own pace. If the processor crashes, the message goes back on the queue and gets retried.

**The frontend angle:** SQS is what makes "we received your request and will process it shortly" responses possible. Any time your API needs to do more work than it can finish within a reasonable response time, a queue is the answer.

## ECS and Fargate

**Amazon Elastic Container Service (ECS)** runs Docker containers. **Fargate** is the serverless launch type for ECS—you define your container and Fargate handles the servers, scaling, and scheduling.

**When you'd reach for it:** Lambda doesn't fit. Maybe your workload runs longer than 15 minutes (Lambda's maximum). Maybe you need a persistent WebSocket connection. Maybe you're running a service that wasn't designed for the request-response model—a background worker, a long-running process, a service that needs to maintain state in memory. Fargate lets you run a container without managing EC2 instances.

**How it relates to what you know:** Think of Fargate as "Lambda for containers." You still don't manage servers. You still pay for what you use (roughly). But instead of writing a handler function, you package your application as a Docker image and let ECS run it.

## WAF

**AWS Web Application Firewall (WAF)** filters malicious web traffic before it reaches your application. It protects against common attacks like SQL injection, cross-site scripting (XSS), and DDoS attempts.

**When you'd reach for it:** Your application is public-facing and you want protection beyond what CloudFront provides by default. WAF integrates directly with CloudFront and API Gateway, letting you define rules that block suspicious requests based on IP addresses, request patterns, geographic location, or rate limiting.

**The practical version:** WAF is the service that lets you say "block any IP that makes more than 1,000 requests per minute" or "block requests that contain SQL injection patterns in the query string." You can use AWS-managed rule groups (pre-built rule sets maintained by AWS) for common protections without writing custom rules.

> [!TIP]
> If you're using the CloudFront free tier flat-rate plan, basic WAF protection is included at no additional cost. For custom rules beyond the managed set, WAF charges per rule and per million requests evaluated.

## A Word on the Services You Don't Need Yet

AWS has services for machine learning, satellite ground stations, quantum computing, and IoT device management. You don't need any of them for a frontend application. The list above covers the services that a frontend engineer building web applications will encounter first after the foundation this course provides.

The pattern for learning new AWS services is the same pattern you followed here: understand the problem the service solves, build something small with it, wire it into your existing stack, and then read the documentation with enough context to know what matters and what you can skip. That last part is key—I find AWS documentation is _dramatically_ easier to read once you have a mental model for how the pieces connect.

You now have that context. You understand IAM policies well enough to grant a new service the permissions it needs. You understand CloudWatch well enough to debug it when it breaks. You understand API Gateway well enough to put it in front of whatever backend you build. These fundamentals transfer to every new service you adopt.

The hardest part of AWS was getting started—understanding the account model, decoding IAM, navigating the console, and building that first deployment pipeline. You've done all of that. Everything from here is incremental: one new service at a time, wired into an architecture you already understand. You know how the pieces fit together. The rest is just adding more pieces.

## Final Teardown Checklist

If you built along with the course and want to tear down everything you created, work through this list. Each section below links to the lesson that has the full teardown commands—this is a checklist, not a second copy of the same commands.

Resources are listed in reverse dependency order (tear down what depends on other things first):

**CloudFront and DNS**

- [ ] Delete the CloudFront distribution (disable it first, then delete after 10–15 minutes). See [CloudFront Distribution Exercise](cloudfront-distribution-exercise.md).
- [ ] Remove Route 53 alias record pointing at CloudFront. See [Route 53 DNS Exercise](route-53-dns-exercise.md).
- [ ] Delete the hosted zone. See [Hosted Zones and Record Types](hosted-zones-and-record-types.md).
- [ ] Delete the ACM certificate (only after the distribution is deleted—CloudFront won't release the cert while it's in use). See [ACM Certificate Exercise](acm-certificate-exercise.md).

**API Gateway**

- [ ] Delete the HTTP API. `aws apigatewayv2 delete-api --api-id your-api-id --region us-east-1`

**Lambda**

- [ ] Delete the Lambda function. `aws lambda delete-function --function-name my-frontend-app-api --region us-east-1`
- [ ] Delete the CloudWatch log group (Lambda recreates this on deploy). `aws logs delete-log-group --log-group-name /aws/lambda/my-frontend-app-api --region us-east-1`

**DynamoDB**

- [ ] Delete the table. See [Solution: Build a Lambda-Backed Data API with DynamoDB](dynamodb-lambda-solution.md) — there's a Cleanup section at the bottom.

**Secrets and Configuration**

- [ ] Delete Parameter Store parameters. See [Parameter Store: Hierarchical Configuration](parameter-store-hierarchical-configuration.md) and [Solution: Store and Retrieve a Secret in Lambda](secrets-in-lambda-solution.md). The course's secrets exercise uses Parameter Store only—if you followed along with [Parameter Store vs. Secrets Manager](parameter-store-vs-secrets-manager.md) and spun up a real Secrets Manager secret to compare, delete it with `aws secretsmanager delete-secret --secret-id <name> --force-delete-without-recovery` (test secrets only).

**CloudWatch Monitoring**

- [ ] Delete CloudWatch alarms. See [Solution: Set Up Alarms for Your Lambda Functions](cloudwatch-alarms-solution.md).
- [ ] Unsubscribe from and delete the SNS topic. See the same solution file.
- [ ] Delete the CloudWatch dashboard. See [CloudWatch Metrics and Dashboards](cloudwatch-metrics-and-dashboards.md).

**S3**

- [ ] Empty the S3 bucket, then delete it. `aws s3 rm s3://your-bucket-name --recursive && aws s3api delete-bucket --bucket your-bucket-name --region us-east-1`

**IAM**

IAM won't let you delete a role until every attached managed policy is detached _and_ every inline policy is removed. The Lambda execution role accumulates several of these over the course—work through them in order before the final `delete-role`:

- [ ] Detach and delete the DynamoDB managed policy. `aws iam detach-role-policy --role-name my-frontend-app-lambda-role --policy-arn arn:aws:iam::123456789012:policy/MyFrontendAppLambdaDynamoDB && aws iam delete-policy --policy-arn arn:aws:iam::123456789012:policy/MyFrontendAppLambdaDynamoDB`
- [ ] Detach the AWS-managed basic execution role. `aws iam detach-role-policy --role-name my-frontend-app-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` (Don't try to `delete-policy` on this one—it's owned by AWS.)
- [ ] Delete the `parameter-store-access` inline policy added in the secrets exercise. `aws iam delete-role-policy --role-name my-frontend-app-lambda-role --policy-name parameter-store-access`
- [ ] List what's left to confirm the role is bare before deletion. `aws iam list-attached-role-policies --role-name my-frontend-app-lambda-role` and `aws iam list-role-policies --role-name my-frontend-app-lambda-role`—both should return empty arrays.
- [ ] Delete the Lambda execution role. `aws iam delete-role --role-name my-frontend-app-lambda-role`
- [ ] Tear down the `deploy-bot` IAM user: deactivate the access key, detach `DeployBotPolicy`, delete the key, then delete the user. See [Exercise: IAM Policy for a Deploy Bot](iam-policy-exercise.md) for the full command sequence—IAM ordering rules matter here.

**Billing**

- [ ] Delete the AWS Budget. See [Cost Monitoring and Budget Alarms](cost-monitoring-and-budget-alarms.md).

> [!TIP]
> After teardown, run `aws s3 ls`, `aws dynamodb list-tables --region us-east-1`, and `aws lambda list-functions --region us-east-1` to confirm nothing was left behind. Forgotten resources are the most common source of surprise charges.
