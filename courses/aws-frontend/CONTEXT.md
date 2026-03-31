---
title: Shared Context Document
description: >-
  Internal working document for content drafting agents. Not published.
date: 2026-03-18
modified: 2026-03-31
---

# AWS for Frontend Engineers — Shared Context Document

This document is the single source of truth for all content-drafting agents working on the "AWS for Frontend Engineers" course. Every lesson file must be written in alignment with this document. If something is ambiguous, defer to this file.

---

## 1. Narrative Arc

This course tells a single story: **you already know how to build frontend applications, and now you are going to learn how to deploy, serve, and operate them on AWS.** The 13 modules are not isolated topics — they are chapters in a narrative that builds from "create an account" to "ship with confidence."

### Capstone Application: Summit Supply

From Module 6 onward, the course should stop feeling like a parade of unrelated snippets. The running application is **Summit Supply**, a small outdoor gear storefront:

- Modules 1–5 build the infrastructure for the static storefront and marketing pages.
- Module 6 deploys the full static Summit Supply frontend end to end.
- Modules 7–8 add the first backend behavior: product and lightweight storefront APIs that the frontend calls.
- Module 9 adds edge logic for redirects, experiments, and lightweight request shaping.
- Module 10 adds DynamoDB-backed user data such as saved gear lists and lightweight account state.
- Module 11 adds secrets for integrations like Stripe, SendGrid, or other third-party services.
- Module 12 traces Summit Supply requests across API Gateway, Lambda, and DynamoDB.
- Module 13 hardens the same deployment for production.

The prose should name Summit Supply when it helps the reader keep context, but all AWS resource names in commands stay generic: `my-frontend-app-*`.

### Modules 1–5: Build the Foundation

The course opens by establishing the infrastructure layer that every frontend deployment needs. Module 1 (IAM) answers "how do I even get into AWS without immediately creating a security incident?" Module 2 (S3) gives the reader a place to put files — the most natural starting point for someone who has been deploying static assets their entire career. Module 3 (ACM) handles certificates because HTTPS is non-negotiable and the reader needs to understand why AWS treats certificates as their own service. Module 4 (CloudFront) puts a CDN in front of S3, which is the moment the reader goes from "I uploaded files to a bucket" to "I have a globally distributed frontend." Module 5 (Route 53) wires up a custom domain so the deployment looks real.

Each of these modules introduces exactly one AWS service. The reader should never feel like they are juggling multiple new concepts at once. By the end of Module 5, the reader understands five services and how they relate to each other, but has not yet stitched them together end-to-end.

### Module 6: Put It All Together

Module 6 is the first integration checkpoint. The reader deploys a complete static site — S3 bucket, CloudFront distribution, ACM certificate, Route 53 DNS — and automates the deployment with the AWS CLI and GitHub Actions. This module produces no new AWS service knowledge. Its purpose is to build confidence by proving that the five preceding modules actually compose into a working deployment pipeline.

### Modules 7–8: Add Dynamic Behavior

With the static layer in place, the course pivots to compute. Module 7 (Lambda) introduces serverless functions — the reader writes a handler, deploys it, and sees it execute. Module 8 (API Gateway) puts an HTTP layer in front of Lambda so the reader's frontend can call it. This is the moment the course goes from "static hosting" to "full-stack application." The reader can now build a React app that calls an API they own, running on infrastructure they control.

### Module 9: Extend to the Edge

Module 9 (Lambda@Edge and CloudFront Functions) takes the compute model from Modules 7–8 and pushes it to the edge. The reader learns to intercept and transform requests at CloudFront's edge locations — A/B testing, redirects, header manipulation, lightweight authentication. This module bridges the static layer (Modules 1–5) and the dynamic layer (Modules 7–8) by showing how code can run inside the CDN itself.

### Modules 10–11: Add State and Secrets

Module 10 (DynamoDB) gives the reader a data layer. The reader connects their Lambda functions to DynamoDB tables, completing the frontend-to-database loop: React app calls API Gateway, which triggers Lambda, which reads from and writes to DynamoDB. Module 11 (Secrets Manager and Parameter Store) addresses the inevitable question of "where do I put my API keys and database credentials?" — a question the reader has been ignoring since Module 7.

### Module 12: See What Is Happening

Module 12 (CloudWatch) introduces monitoring and observability. The reader learns to read logs, set up alarms, and trace requests across the services they have built in Modules 1–11. This module deliberately comes late because monitoring is most meaningful when the reader has real infrastructure to observe.

### Module 13: Ship with Confidence

Module 13 closes the course by zooming out. The reader performs a security review, sets up billing alerts, gets an introduction to Infrastructure as Code (CloudFormation, CDK, SST), and surveys the AWS services they will eventually need but do not need today. This module is a launchpad, not a deep dive.

### Lesson Shape

Every first instructional lesson in a module should visibly establish the module:

- Open with a concrete scenario the reader can picture.
- Include a `Why This Matters` section early.
- Include a `Builds On` section that names the prerequisite lessons or modules.
- Include at least one concrete example, diagram, or request flow.
- Include a `Verification` section with commands, browser checks, or console checks.
- Include a `Common Failure Modes` section that tells the reader what usually goes wrong.

Every exercise should include:

- Explicit prerequisites
- Exact inputs and commands
- At least one end-to-end proof step using `curl`, the browser, or logs
- A checkpoint list
- A `Failure Diagnosis` section

Every solution should explain _why_ the steps work, not just dump the final answer.

---

## 2. Per-Module Learning Objectives

### Module 1 — AWS Account & IAM Foundations

- After this module, you can create and secure an AWS account with MFA, set up a non-root admin user, and explain why the root user should almost never be used.
- After this module, you can write an IAM policy from scratch and explain the relationship between users, groups, roles, and policies.
- After this module, you can install and configure the AWS CLI with named profiles and verify your credentials.

### Module 2 — S3 (Static Hosting Foundation)

- After this module, you can create an S3 bucket, upload a static site, and enable static website hosting.
- After this module, you can write a bucket policy that controls public access and configure CORS headers for API-calling frontends.
- After this module, you can enable versioning and set lifecycle rules to manage storage costs.

### Module 3 — ACM (SSL/TLS Certificates)

- After this module, you can request a public SSL/TLS certificate in ACM using DNS validation.
- After this module, you can explain the us-east-1 requirement for CloudFront certificates and how certificate auto-renewal works.

### Module 4 — CloudFront (CDN & Edge Distribution)

- After this module, you can create a CloudFront distribution with an S3 origin, attach an ACM certificate, and configure Origin Access Control to lock down the bucket.
- After this module, you can configure cache behaviors, TTLs, and invalidation strategies to control how content is served at the edge.
- After this module, you can set up custom error responses to handle SPA routing (404 → index.html).

### Module 5 — Route 53 (DNS)

- After this module, you can create a hosted zone, configure DNS records, and point a custom domain to a CloudFront distribution.
- After this module, you can explain the difference between alias records and CNAME records and choose the right one for AWS resources.

### Module 6 — Deploying a Full Static Site

- After this module, you can deploy a complete static site (S3 + CloudFront + ACM + Route 53) from scratch and automate the deployment using the AWS CLI.
- After this module, you can set up a GitHub Actions workflow that deploys your frontend on every push to main.

### Module 7 — Lambda (Serverless Compute)

- After this module, you can write and deploy a Lambda function in TypeScript, configure its execution role, and read its logs in CloudWatch.
- After this module, you can explain the Lambda execution model — invocations, cold starts, and how the runtime lifecycle works.
- After this module, you can configure environment variables and manage function versions.

### Module 8 — API Gateway (HTTP Layer for Lambda)

- After this module, you can create an HTTP API in API Gateway, connect it to a Lambda function, and call it from a frontend application.
- After this module, you can configure CORS, define routes and methods, and manage deployment stages.
- After this module, you can describe the tradeoffs between REST APIs and HTTP APIs and choose the right one for your use case.

### Module 9 — Lambda@Edge & CloudFront Functions

- After this module, you can explain where edge functions execute in the request lifecycle (viewer request, viewer response, origin request, origin response) and choose between Lambda@Edge and CloudFront Functions.
- After this module, you can write and deploy edge functions for practical use cases like A/B testing, redirects, and header manipulation.
- After this module, you can debug edge functions and navigate the constraints around deployment region, runtime limits, and logging across edge locations.

### Module 10 — DynamoDB (Lightweight Data Layer)

- After this module, you can create a DynamoDB table, define partition and sort keys, and perform basic CRUD operations.
- After this module, you can connect a Lambda function to DynamoDB and implement the full request loop from frontend to database.

### Module 11 — Secrets Manager & Parameter Store

- After this module, you can store and retrieve configuration values using Parameter Store and secrets using Secrets Manager.
- After this module, you can configure IAM permissions that grant Lambda functions access to specific secrets and parameters at runtime.

### Module 12 — CloudWatch (Monitoring & Observability)

- After this module, you can navigate CloudWatch log groups, query logs with Insights, and set up metric alarms with SNS notifications.
- After this module, you can trace a request from API Gateway through Lambda to DynamoDB using CloudWatch logs and metrics.

### Module 13 — Production Hardening & What's Next

- After this module, you can perform a security review of your AWS deployment and set up billing alerts to avoid surprise charges.
- After this module, you can describe the purpose of Infrastructure as Code tools (CloudFormation, CDK, SST) and identify which AWS services to learn next based on your application's needs.

---

## 3. Terminology Glossary

Use these definitions consistently across all lesson files. Bold each term on its first appearance in a given lesson. Do not redefine terms — link back to the lesson where they were first introduced if clarification is needed.

**ARN (Amazon Resource Name):** A globally unique identifier for any AWS resource. Format: `arn:aws:<service>:<region>:<account-id>:<resource-type>/<resource-id>`. Every IAM policy references resources by their ARN.

**IAM policy:** A JSON document that defines permissions. Contains a `Version`, a `Statement` array, and each statement specifies `Effect` (Allow or Deny), `Action` (what operations), and `Resource` (which ARNs).

**Principal:** The entity (user, role, service, or account) that is allowed or denied access in a policy. In IAM policies attached to a user or role, the principal is implicit. In resource-based policies (like bucket policies), the principal is explicit.

**Resource:** In IAM context, the specific AWS resource (identified by ARN) that a policy statement applies to. In S3 context, a resource can also refer to a bucket or object.

**Action:** An API operation that a policy allows or denies. Actions follow the pattern `<service>:<operation>`, such as `s3:GetObject` or `lambda:InvokeFunction`.

**Effect:** Either `Allow` or `Deny`. Determines whether the policy statement grants or blocks access. Deny always wins over Allow.

**Bucket:** An S3 container for objects. Bucket names are globally unique across all AWS accounts. A bucket exists in a specific region.

**Object:** A file stored in S3, identified by a key (its full path within the bucket). An object consists of the file data, metadata, and a key.

**Bucket policy:** A resource-based JSON policy attached directly to an S3 bucket. Unlike IAM policies (which attach to users or roles), bucket policies define who can access the bucket and its objects.

**Origin:** In CloudFront, the source server that CloudFront pulls content from. For static sites, the origin is typically an S3 bucket. An origin can also be an API Gateway endpoint, an Application Load Balancer, or any HTTP server.

**Distribution:** A CloudFront configuration that defines how content is delivered to end users. A distribution has one or more origins, cache behaviors, and an optional custom domain with an SSL certificate.

**Behavior:** A CloudFront cache behavior that defines how CloudFront handles requests matching a specific URL path pattern. The default behavior (`*`) applies to all requests not matched by other behaviors.

**Origin Access Control (OAC):** A CloudFront mechanism that restricts S3 bucket access so that objects can only be served through CloudFront, not directly via S3 URLs. Replaces the older Origin Access Identity (OAI).

**Hosted zone:** A Route 53 container for DNS records belonging to a single domain. A hosted zone for `example.com` holds all the records that control how traffic to `example.com` and its subdomains is routed.

**Record set:** A DNS record within a hosted zone. Common types include A (IPv4 address), AAAA (IPv6 address), CNAME (canonical name alias), and MX (mail exchange).

**Alias record:** A Route 53-specific extension of DNS that lets you map a domain name directly to an AWS resource (like a CloudFront distribution or S3 bucket) without a CNAME. Unlike CNAMEs, alias records work at the zone apex (`example.com`, not just `www.example.com`) and resolve with zero additional DNS lookup cost.

**Handler:** The function that AWS Lambda invokes when your function is triggered. In Node.js/TypeScript, the handler is an exported async function that receives an `event` object and returns a response.

**Execution role:** The IAM role that a Lambda function assumes when it runs. This role's policies determine what AWS services the function can access (S3, DynamoDB, CloudWatch Logs, and so on).

**Cold start:** The latency incurred when Lambda creates a new execution environment for your function — downloading code, initializing the runtime, running top-level module code. Subsequent invocations on the same environment ("warm starts") skip this step.

**Invocation:** A single execution of a Lambda function. Lambda bills per invocation (plus duration). Invocations can be synchronous (the caller waits for a response) or asynchronous (the caller fires and forgets).

**Integration:** In API Gateway, the connection between a route and a backend service. For this course, the backend is always a Lambda function, making it a Lambda proxy integration.

**Stage:** An API Gateway deployment target, like `prod` or `dev`. Each stage has its own URL and can have independent configuration (throttling, logging, stage variables).

**Edge function:** Code that runs at CloudFront edge locations rather than in a single region. Includes both Lambda@Edge functions and CloudFront Functions, each with different capabilities and constraints.

**Viewer request:** A CloudFront event that fires when CloudFront receives a request from a client, before checking the cache. Edge functions attached to this event can modify the request or return a response immediately.

**Origin request:** A CloudFront event that fires when CloudFront forwards a request to the origin, after a cache miss. Edge functions attached to this event can modify the request to the origin or generate a response without contacting the origin.

**Partition key:** The primary component of a DynamoDB table's primary key. DynamoDB uses the partition key's value to determine which physical partition stores the item. Choosing a good partition key (high cardinality, even distribution) is critical for performance.

**Sort key:** The optional second component of a DynamoDB composite primary key. Items with the same partition key are stored together and sorted by the sort key, enabling range queries.

**Item:** A single record in a DynamoDB table, analogous to a row in a relational database. An item is a collection of attributes, and every item must have the table's primary key attributes.

**Parameter path:** A hierarchical naming scheme for Parameter Store parameters, using forward slashes: `/my-app/production/database-url`. Paths enable you to organize parameters by application, environment, and purpose, and to grant IAM access to entire subtrees.

**Log group:** A CloudWatch container for log streams that share the same retention, monitoring, and access settings. Lambda automatically creates a log group named `/aws/lambda/<function-name>` for each function.

**Log stream:** A sequence of log events within a log group, typically representing a single source (one Lambda execution environment, one EC2 instance). New log streams are created as Lambda scales.

**Alarm:** A CloudWatch alarm that watches a metric and triggers an action (like sending an SNS notification) when the metric crosses a threshold for a specified number of evaluation periods.

**Metric:** A time-ordered set of data points published to CloudWatch. AWS services publish metrics automatically (Lambda: `Invocations`, `Errors`, `Duration`; API Gateway: `4XXError`, `5XXError`, `Latency`). You can also publish custom metrics.

**SNS topic:** An Amazon Simple Notification Service topic — a communication channel that sends messages to subscribed endpoints (email, SMS, Lambda, HTTP). In this course, SNS topics are used as the notification target for CloudWatch Alarms.

---

## 4. Cross-Reference Map

Each entry lists the modules that a given module explicitly references or builds upon. Content-drafting agents must include these cross-references in their lessons using explicit links.

| Module                                         | References                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module 1 — AWS Account & IAM Foundations       | None (starting point)                                                                                                                                                                                  |
| Module 2 — S3                                  | Module 1 (IAM users and policies for bucket access)                                                                                                                                                    |
| Module 3 — ACM                                 | Module 1 (AWS account, IAM permissions for certificate requests)                                                                                                                                       |
| Module 4 — CloudFront                          | Module 2 (S3 bucket as origin, bucket policies), Module 3 (ACM certificates for HTTPS)                                                                                                                 |
| Module 5 — Route 53                            | Module 4 (CloudFront distribution as the alias target)                                                                                                                                                 |
| Module 6 — Deploying a Full Static Site        | Modules 1–5 (all foundation modules: IAM, S3, ACM, CloudFront, Route 53)                                                                                                                               |
| Module 7 — Lambda                              | Module 1 (IAM execution roles and policies), Module 12 (CloudWatch Logs — forward-reference exception: mention that logs exist and will be covered in Module 12, but do not teach CloudWatch in depth) |
| Module 8 — API Gateway                         | Module 7 (Lambda functions as integration targets), Module 2 (CORS concepts introduced in S3 context)                                                                                                  |
| Module 9 — Lambda@Edge & CloudFront Functions  | Module 4 (CloudFront distributions and behaviors), Module 7 (Lambda function authoring), Module 3 (us-east-1 requirement, introduced for ACM)                                                          |
| Module 10 — DynamoDB                           | Module 7 (Lambda functions for CRUD operations), Module 8 (API Gateway as the HTTP entry point), Module 1 (IAM policies for DynamoDB access)                                                           |
| Module 11 — Secrets Manager & Parameter Store  | Module 7 (Lambda environment variables and runtime access), Module 1 (IAM policies for secret access), Module 10 (DynamoDB connection strings as a motivating example)                                 |
| Module 12 — CloudWatch                         | Module 7 (Lambda logs), Module 8 (API Gateway logs and metrics), Module 10 (DynamoDB metrics)                                                                                                          |
| Module 13 — Production Hardening & What's Next | All preceding modules (security review covers IAM, S3, CloudFront, Lambda, API Gateway, DynamoDB)                                                                                                      |

### A Note on Forward References

The course avoids forward references as a rule. The one permitted exception is Module 7's mention of CloudWatch Logs: when the reader deploys their first Lambda function, they need to know where the logs go. The lesson should say something like "Lambda writes logs to CloudWatch Logs — we will dig into CloudWatch properly in Module 12, but for now, here is how to find your function's log group." Do not teach CloudWatch concepts in Module 7.

---

## 5. Per-Subsection Learning Objectives and File Assignments

### Module 1 — AWS Account & IAM Foundations

| Filename                                  | Learning Objective                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creating-and-securing-an-aws-account.md` | Learn how to create an AWS account, enable MFA on the root user, and understand why the root user should be locked away after initial setup.               |
| `iam-mental-model.md`                     | Build a mental model of IAM by understanding how users, groups, roles, and policies relate to each other and how AWS decides whether a request is allowed. |
| `writing-your-first-iam-policy.md`        | Write an IAM policy from scratch, understanding the Version, Statement, Effect, Action, and Resource fields and how they combine to grant or deny access.  |
| `principle-of-least-privilege.md`         | Apply the principle of least privilege by scoping IAM policies to the narrowest set of actions and resources that a user or service actually needs.        |
| `setting-up-the-aws-cli.md`               | Install the AWS CLI v2, configure it with named profiles and access keys, and verify that your credentials work by making a test API call.                 |

### Module 2 — S3 (Static Hosting Foundation)

| Filename                               | Learning Objective                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `what-is-s3.md`                        | Understand what S3 is, how buckets and objects work, and why S3 is the natural starting point for frontend engineers deploying to AWS.             |
| `creating-and-configuring-a-bucket.md` | Create an S3 bucket with appropriate settings for static site hosting, including region selection and public access configuration.                 |
| `uploading-and-organizing-files.md`    | Upload files to S3 using the AWS CLI and the console, and understand how S3 key prefixes create a virtual folder structure.                        |
| `bucket-policies-and-public-access.md` | Write a bucket policy that grants public read access to your static assets and understand how bucket policies differ from IAM policies.            |
| `static-website-hosting-on-s3.md`      | Enable S3 static website hosting, configure an index document and error document, and access your site through the S3 website endpoint.            |
| `s3-versioning-lifecycle-and-cost.md`  | Enable versioning to protect against accidental overwrites, configure lifecycle rules to manage old versions, and understand how S3 pricing works. |

### Module 3 — ACM (SSL/TLS Certificates)

| Filename                                        | Learning Objective                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `why-https-matters.md`                          | Understand why HTTPS is required for modern frontends (browser APIs, SEO, user trust) and how SSL/TLS certificates make it work.                                                 |
| `requesting-a-certificate-in-acm.md`            | Request a public SSL/TLS certificate in AWS Certificate Manager for your domain.                                                                                                 |
| `dns-validation-vs-email-validation.md`         | Complete domain validation for your ACM certificate using DNS validation (preferred) or email validation, and understand why DNS validation is the better choice for automation. |
| `wildcard-certificates-and-multiple-domains.md` | Request a wildcard certificate or a certificate covering multiple Subject Alternative Names (SANs) and understand when each approach is appropriate.                             |
| `certificate-renewal-and-us-east-1.md`          | Understand ACM's auto-renewal process and the requirement that certificates used with CloudFront must be provisioned in us-east-1.                                               |

### Module 4 — CloudFront (CDN & Edge Distribution)

| Filename                                  | Learning Objective                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `what-is-a-cdn.md`                        | Understand what a CDN does, why it matters for frontend performance, and how CloudFront fits into the AWS ecosystem.                                     |
| `creating-a-cloudfront-distribution.md`   | Create a CloudFront distribution with an S3 origin and configure its basic settings (default root object, price class, enabled status).                  |
| `origin-access-control-for-s3.md`         | Configure Origin Access Control so that your S3 bucket only serves content through CloudFront, not through direct S3 URLs.                               |
| `cache-behaviors-and-invalidations.md`    | Configure cache behaviors and TTLs to control how CloudFront caches your content, and create invalidations to force cache refreshes after deployments.   |
| `custom-error-pages-and-spa-routing.md`   | Set up custom error responses that redirect 403 and 404 errors to index.html, enabling client-side routing for single-page applications.                 |
| `attaching-an-ssl-certificate.md`         | Attach an ACM certificate to your CloudFront distribution and configure it to serve your site over HTTPS with a custom domain.                           |
| `cloudfront-headers-cors-and-security.md` | Configure CloudFront response headers policies for CORS, security headers (HSTS, X-Content-Type-Options, X-Frame-Options), and cache-control directives. |

### Module 5 — Route 53 (DNS)

| Filename                                  | Learning Objective                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dns-for-frontend-engineers.md`           | Understand the DNS resolution process from a frontend engineer's perspective — what happens between typing a URL and receiving a response.                           |
| `hosted-zones-and-record-types.md`        | Create a hosted zone in Route 53 and understand the common DNS record types (A, AAAA, CNAME, MX, TXT) and when to use each.                                          |
| `pointing-a-domain-to-cloudfront.md`      | Create DNS records that point your custom domain to your CloudFront distribution, making your site accessible at your own domain name.                               |
| `alias-records-vs-cname-records.md`       | Understand the difference between Route 53 alias records and standard CNAME records, and why alias records are preferred for AWS resources.                          |
| `registering-and-transferring-domains.md` | Register a new domain through Route 53 or transfer an existing domain from another registrar, including configuring nameservers for an externally registered domain. |

### Module 6 — Deploying a Full Static Site

| Filename                             | Learning Objective                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `full-static-pipeline.md`            | Walk through the end-to-end process of deploying a static site to AWS, connecting S3, CloudFront, ACM, and Route 53 into a working pipeline. |
| `automating-deploys-with-aws-cli.md` | Automate your deployment process using AWS CLI commands for syncing files to S3 and creating CloudFront invalidations.                       |
| `cicd-with-github-actions.md`        | Set up a GitHub Actions workflow that builds your frontend and deploys it to AWS on every push to the main branch.                           |

### Module 7 — Lambda (Serverless Compute)

| Filename                                     | Learning Objective                                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `what-is-lambda.md`                          | Understand the Lambda execution model — how Lambda runs your code without servers, how invocations work, and how Lambda differs from traditional server deployments.               |
| `writing-a-lambda-handler.md`                | Write a Lambda handler in TypeScript that receives an event, processes it, and returns a properly formatted response.                                                              |
| `lambda-execution-roles-and-permissions.md`  | Create an IAM execution role for your Lambda function and attach policies that grant access to the AWS services your function needs.                                               |
| `deploying-and-testing-a-lambda-function.md` | Package, deploy, and test a Lambda function using the AWS CLI, including creating test events and reading invocation results.                                                      |
| `lambda-environment-variables.md`            | Configure environment variables for a Lambda function and access them in your handler code, understanding when to use environment variables versus other configuration approaches. |
| `lambda-cold-starts-and-performance.md`      | Understand what causes cold starts, how they affect latency, and practical strategies for minimizing their impact on your frontend's API calls.                                    |

### Module 8 — API Gateway (HTTP Layer for Lambda)

| Filename                                   | Learning Objective                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rest-apis-vs-http-apis.md`                | Understand the differences between API Gateway REST APIs and HTTP APIs, and why HTTP APIs are the right default for most frontend-to-Lambda integrations. |
| `creating-an-http-api.md`                  | Create an HTTP API in API Gateway with routes and methods that map to your application's endpoints.                                                       |
| `connecting-api-gateway-to-lambda.md`      | Wire an HTTP API route to a Lambda function using a Lambda proxy integration, so that API requests trigger your function and return its response.         |
| `request-and-response-mapping.md`          | Understand how API Gateway transforms HTTP requests into Lambda event objects and how your handler's return value maps to an HTTP response.               |
| `api-gateway-cors-configuration.md`        | Configure CORS on your HTTP API so that your frontend application (running on a different origin) can call your API without browser errors.               |
| `api-gateway-stages-and-custom-domains.md` | Deploy your API to stages, configure custom domain names, and understand how stages map to different environments (development, production).              |
| `api-gateway-authentication.md`            | Add authentication to your API Gateway routes using JWT authorizers or Lambda authorizers, protecting your endpoints from unauthorized access.            |

### Module 9 — Lambda@Edge & CloudFront Functions

| Filename                                     | Learning Objective                                                                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edge-compute-comparison.md`                 | Compare Lambda@Edge and CloudFront Functions across dimensions that matter — runtime, execution limits, supported events, pricing — and know which to reach for based on your use case.  |
| `writing-a-cloudfront-function.md`           | Write and deploy a CloudFront Function that manipulates viewer requests or responses, using the lightweight JavaScript runtime available at CloudFront edge locations.                   |
| `writing-a-lambda-at-edge-function.md`       | Write and deploy a Lambda@Edge function that runs at origin request or response events, understanding the us-east-1 deployment requirement and the replication model.                    |
| `edge-function-use-cases.md`                 | Identify practical use cases for edge functions — URL rewrites, redirects, header injection, geolocation-based routing, and lightweight authentication checks.                           |
| `ab-testing-at-the-edge.md`                  | Implement an A/B testing mechanism using edge functions that routes users to different content versions based on cookies or random assignment.                                           |
| `edge-function-debugging-and-limitations.md` | Debug edge functions using CloudWatch Logs (understanding that logs appear in the region closest to the edge location), and navigate the runtime constraints and deployment limitations. |

### Module 10 — DynamoDB (Lightweight Data Layer)

| Filename                               | Learning Objective                                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `what-is-dynamodb.md`                  | Understand what DynamoDB is, how it differs from relational databases, and why it is a practical choice for frontend engineers who need a lightweight data layer.       |
| `dynamodb-tables-and-keys.md`          | Create a DynamoDB table, define partition keys and sort keys, and understand how key design affects query patterns and performance.                                     |
| `dynamodb-reading-and-writing-data.md` | Perform basic CRUD operations on DynamoDB items using the AWS SDK (PutItem, GetItem, UpdateItem, DeleteItem) from a Lambda function.                                    |
| `dynamodb-querying-and-scanning.md`    | Use Query to retrieve items by partition key (with optional sort key conditions) and understand when and why Scan should be avoided.                                    |
| `connecting-dynamodb-to-lambda.md`     | Connect the full request loop — frontend calls API Gateway, API Gateway triggers Lambda, Lambda reads from and writes to DynamoDB — and return results to the frontend. |

### Module 11 — Secrets Manager & Parameter Store

| Filename                                        | Learning Objective                                                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `the-problem-with-hardcoded-secrets.md`         | Understand why hardcoding secrets in Lambda environment variables or source code is a security risk and what the alternatives look like on AWS.          |
| `parameter-store-hierarchical-configuration.md` | Store and retrieve application configuration using Parameter Store's hierarchical path structure, including both plain text and SecureString parameters. |
| `secrets-manager-rotation-and-encryption.md`    | Store sensitive credentials in Secrets Manager, understand automatic rotation, and know when Secrets Manager is worth the cost over Parameter Store.     |
| `accessing-secrets-from-lambda.md`              | Retrieve secrets and parameters from a Lambda function at runtime using the AWS SDK, with proper IAM permissions and caching strategies.                 |
| `parameter-store-vs-secrets-manager.md`         | Choose between Parameter Store and Secrets Manager based on your use case, understanding the tradeoffs in cost, features, and complexity.                |

### Module 12 — CloudWatch (Monitoring & Observability)

| Filename                                          | Learning Objective                                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `what-is-cloudwatch.md`                           | Understand what CloudWatch is and how it collects logs, metrics, and events from the AWS services you have deployed throughout this course.                          |
| `cloudwatch-log-groups-and-structured-logging.md` | Navigate CloudWatch log groups and log streams, implement structured JSON logging in your Lambda functions, and query logs using CloudWatch Logs Insights.           |
| `cloudwatch-metrics-and-dashboards.md`            | Identify the key metrics for Lambda, API Gateway, and DynamoDB, and create a CloudWatch dashboard that gives you a single view of your application's health.         |
| `cloudwatch-alarms-and-sns.md`                    | Create CloudWatch alarms that trigger SNS notifications when error rates or latency exceed thresholds, so you know when something breaks before your users tell you. |
| `tracing-requests-across-services.md`             | Trace a single request from API Gateway through Lambda to DynamoDB using correlation IDs, structured logs, and CloudWatch Logs Insights queries.                     |

### Module 13 — Production Hardening & What's Next

| Filename                                       | Learning Objective                                                                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-review-checklist.md`                 | Walk through a security review checklist that covers IAM policies, S3 bucket access, CloudFront settings, Lambda permissions, and API Gateway authentication.                    |
| `cost-monitoring-and-budget-alarms.md`         | Set up AWS Budgets and billing alerts so you are notified before costs exceed your expectations, and understand where the free tier boundaries are.                              |
| `infrastructure-as-code-and-cdk.md`            | Understand why Infrastructure as Code matters, survey the options (CloudFormation, CDK, SST), and see what the infrastructure you built by hand looks like when defined in code. |
| `whats-next-services-youll-eventually-need.md` | Survey the AWS services you will likely need next — Amplify, Step Functions, EventBridge, SQS, ECS/Fargate — and understand when each becomes relevant.                          |

---

## 6. Shared Code Conventions

All code examples, CLI commands, and configuration snippets across the course must follow these conventions. Consistency matters — a reader should never wonder "is this a different account?" when they see a different account ID.

### Placeholder Values

| Placeholder                 | Value                         | Notes                                                                    |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| AWS Account ID              | `123456789012`                | Always use this exact 12-digit number                                    |
| Default region              | `us-east-1`                   | Also the required region for ACM/CloudFront certificates and Lambda@Edge |
| Domain name                 | `example.com`                 | Use `www.example.com` for subdomain examples                             |
| S3 bucket (assets)          | `my-frontend-app-assets`      | Primary bucket for static site files                                     |
| S3 bucket (logs)            | `my-frontend-app-logs`        | For access logging if needed                                             |
| CloudFront distribution ID  | `E1A2B3C4D5E6F7`              | Use when referencing a distribution by ID                                |
| Lambda function name        | `my-frontend-app-api`         | For the main API function                                                |
| API Gateway API name        | `my-frontend-app-api`         | Matches the Lambda function name                                         |
| DynamoDB table name         | `my-frontend-app-data`        | For the primary data table                                               |
| IAM user (admin)            | `admin`                       | The non-root admin user from Module 1                                    |
| IAM role (Lambda)           | `my-frontend-app-lambda-role` | The Lambda execution role                                                |
| Parameter Store path prefix | `/my-frontend-app/`           | Hierarchical parameter paths                                             |

### AWS CLI

- Always use `--output json` for consistency and parseability.
- Always show the `--region us-east-1` flag explicitly, even if it is the default. Do not assume the reader's default region is configured.
- Use `aws` CLI v2 syntax.
- For multi-line commands, use backslash continuation (`\`) for readability.

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete \
  --output json
```

### IAM Policies

- Always show the complete JSON document: `Version`, `Statement` array, and every statement must have `Effect`, `Action`, and `Resource`.
- Never abbreviate policies with `...` or `<!-- truncated -->`. Show the full policy.
- Use `2012-10-17` as the Version (this is the current policy language version, not a date you update).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
    }
  ]
}
```

### Lambda Handlers

- Always use TypeScript.
- Always import types from `@types/aws-lambda`.
- Use the `APIGatewayProxyHandlerV2` type for API Gateway HTTP API handlers.
- Use explicit handler signature with `export const handler`.
- Use `async` handlers (not callback style).

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Lambda' }),
  };
};
```

For Lambda functions that are not behind API Gateway (for example, Lambda@Edge or direct invocations), use the appropriate type from `@types/aws-lambda` (such as `CloudFrontRequestHandler` for Lambda@Edge).

### DynamoDB SDK Usage

- Use AWS SDK v3 (`@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`).
- Use the `DynamoDBDocumentClient` for simplified marshalling.

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
```

### Environment Assumptions

- **Operating system:** macOS or Linux. Do not provide Windows-specific instructions.
- **AWS CLI:** v2, installed and configured.
- **Node.js:** 20+ (the Lambda runtime version used throughout the course).
- **TypeScript:** Used for all Lambda function code.
- **Package manager:** npm (do not introduce yarn, pnpm, or bun for Lambda projects — keep it simple and universal).
- **Frontend framework:** React with Next.js or Vite, but lessons should be framework-agnostic where possible. The frontend is the thing being deployed, not the thing being taught.

### File and Directory Structure

When showing project structure in lessons, use this layout:

```
my-frontend-app/
├── build/                  # Static site output (what gets uploaded to S3)
├── lambda/
│   ├── src/
│   │   └── handler.ts
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml
└── package.json
```

---

## 7. Style Guide Summary

### Audience

The reader is a frontend engineer who has shipped production applications using React and Next.js. They have deployed to Vercel or Netlify. They understand environment variables, CORS, CI/CD pipelines, and single-page applications. They have never logged into the AWS console, never written an IAM policy, and never heard of CloudFront. Do not explain what React is. Do not explain what CORS is conceptually — explain how to configure it in a specific AWS service. Meet them where they are.

### Tone

Direct, practical, no filler. The reader is here because they need to deploy something to AWS and does not want a computer science lecture. Explain through frontend problems they have actually faced:

- "You know how Vercel gives you a preview URL for every pull request? That is a CloudFront distribution with an S3 origin."
- "CORS errors — you have seen them. Here is where you configure the headers in API Gateway."
- "Environment variables work the same way they do in Vercel or Netlify, except you set them on the Lambda function itself."

Avoid:

- "In this lesson, we will learn about..." (just start teaching)
- "AWS provides a robust, scalable, enterprise-grade..." (marketing copy)
- "It is important to note that..." (if it is important, just say it)
- Lengthy introductions that do not add information
- Passive voice when active voice is clearer

### Lesson Structure

Every subsection follows this structure:

1. **What this is and why you care** (1–3 paragraphs). Connect the AWS concept to something the reader already knows from frontend development. Explain why this service exists and what problem it solves.

2. **Core explanation** (the bulk of the lesson). Teach the concept with enough depth to be useful, but do not try to cover every option. Focus on the 20% of the service that handles 80% of frontend use cases.

3. **Concrete example or walkthrough**. Every lesson must include at least one code example, CLI command, or step-by-step walkthrough. The reader should be able to follow along in their own AWS account.

4. **Gotchas and common mistakes** (1–3 items). Call out the things that trip people up. These are often the most valuable part of a lesson. Use callout blocks.

### Cross-References

Cross-references must be explicit and use relative links to other lesson files:

- "Recall the bucket policy structure from [Bucket Policies and Public Access](bucket-policies-and-public-access.md)."
- "You configured Origin Access Control in [Origin Access Control for S3](origin-access-control-for-s3.md)."

Never use vague cross-references like "as we discussed earlier" or "as mentioned previously." Name the specific lesson.

### Callout Blocks

Use `> [!TIP]` for helpful advice and `> [!WARNING]` for things that can break deployments, cost money, or create security vulnerabilities.

```markdown
> [!TIP]
> You can use `aws s3 sync` with the `--delete` flag to remove files from S3 that no longer exist in your local build directory.

> [!WARNING]
> Never make your S3 bucket publicly accessible if you are using CloudFront with Origin Access Control. The whole point of OAC is to ensure traffic flows through CloudFront.
```

### Formatting

- **Bold** key terms on first introduction within a lesson.
- Use code formatting for all service names when they appear in technical context: `S3`, `CloudFront`, `Lambda`. In prose discussion (not technical instructions), plain text is acceptable: "Lambda functions run in response to events."
- Use fenced code blocks with language identifiers (`typescript`, `json`, `bash`, `yaml`).
- Keep paragraphs short — 2–4 sentences. Frontend engineers read documentation, not novels.
- Use headings (`##`, `###`) to break up content. A reader scanning the page should be able to find what they need.

### Length

Each subsection should be 800–1500 words. This is long enough to be substantive and short enough to be read in one sitting. If a lesson is approaching 2000 words, it probably covers too much and should be split.

### No Forward References

Never assume knowledge from a later module. If a concept has not been introduced yet, do not reference it. The one exception is Module 7's brief mention of CloudWatch Logs (see the Cross-Reference Map for details).

### Code Block Annotations

The site supports `// [!note ...]` annotations inside code blocks that render as callout annotations attached to the line above. Use them to highlight important lines:

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}');
  // [!note The event.body is always a string — you need to parse it yourself.]
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Lambda' }),
  };
};
```

Never place an annotation immediately before closing braces/brackets near the end of a code block — it breaks the rendering. Annotations between substantive lines are safe.
