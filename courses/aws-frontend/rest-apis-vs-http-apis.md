---
title: REST APIs vs. HTTP APIs
description: >-
  Understand the differences between API Gateway REST APIs and HTTP APIs, and why
  HTTP APIs are the right default for most frontend-to-Lambda integrations.
date: 2026-03-18
modified: 2026-04-01
tags:
  - aws
  - api-gateway
  - comparison
---

API Gateway offers two flavors of API: **REST APIs** and **HTTP APIs**. If you've ever tried to create an API in the console, you've seen both options sitting side by side with no clear guidance on which to pick. The naming doesn't help—both can serve RESTful endpoints, and both speak HTTP. The difference is in what they include and what they cost.

If you want AWS's version of the product surface while you read, the [HTTP APIs documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) is the official reference for the flavor this course uses.

For this course, you'll use HTTP APIs. They're cheaper, faster, and simpler. But you should understand when REST APIs earn their overhead, because you'll run into them on teams that have been using AWS longer.

## Why This Matters

Choosing the wrong API Gateway product is one of those mistakes that does not break anything immediately. It just quietly makes every request more expensive, every configuration screen more cluttered, and every explanation to your future self more annoying. Summit Supply does not need the heavyweight option, and most frontend-driven backends do not either.

## Builds On

This lesson builds on the Lambda foundation you already put in place. You already have compute. What you need now is the HTTP layer that turns a Lambda function into something your frontend can call with `fetch`.

## HTTP APIs: The Default Choice

**HTTP APIs** (sometimes called "v2" APIs) launched in 2019 as a streamlined alternative to REST APIs. AWS built them specifically for the most common use case: putting an HTTP layer in front of Lambda functions. Here's what they give you:

- **Lower cost.** HTTP APIs cost roughly 70% less than REST APIs—$1.00 per million requests versus $3.50 per million.
- **Lower latency.** AWS reports that HTTP APIs have up to 60% lower latency compared to REST APIs. That latency reduction compounds when your frontend makes multiple API calls on a single page.
- **Automatic deployments.** HTTP APIs deploy changes to the `$default` stage automatically. No manual deployment step.
- **Built-in CORS.** CORS configuration is a first-class setting on the API itself. You configure it once and it applies to all routes.
- **JWT authorizers.** Native JWT validation without writing a Lambda authorizer—point it at a Cognito user pool or any OIDC provider.
- **Simpler routing.** Routes are defined as `METHOD /path`, and proxy integrations send the entire request to Lambda. No mapping templates, no Velocity templates, no request/response transformation language to learn.

If you're building a frontend that calls a Lambda-backed API—which is exactly what we're doing in this course—HTTP APIs are the right tool.

## REST APIs: When You Need More Control

**REST APIs** (sometimes called "v1" APIs) are the original API Gateway product. They include features that HTTP APIs deliberately left out:

- **API key usage plans.** If you need to issue API keys to third-party consumers and enforce rate limits per key, REST APIs have built-in usage plans and throttling.
- **Request validation.** REST APIs can validate request bodies and query parameters against JSON schemas before your Lambda function ever runs. HTTP APIs leave validation to your handler code.
- **Caching.** REST APIs have built-in response caching—you can cache responses at the API Gateway layer for a configurable TTL, reducing Lambda invocations and latency. HTTP APIs have no caching layer.
- **WAF integration.** REST APIs integrate directly with AWS WAF (Web Application Firewall) for IP-based filtering, rate limiting, and bot detection. HTTP APIs don't.
- **Resource policies.** REST APIs support resource-based policies that restrict access by IP address, VPC, or AWS account. HTTP APIs rely on authorizers and IAM for access control.
- **Request/response transformation.** REST APIs include Velocity Template Language (VTL) mapping templates that can transform requests and responses between the client and your integration. This is powerful but complex—and rarely needed when your frontend and backend are both under your control.

## The Decision Table

| Feature                    | HTTP APIs              | REST APIs                   |
| -------------------------- | ---------------------- | --------------------------- |
| Price per million requests | ~$1.00                 | ~$3.50                      |
| Latency                    | Lower                  | Higher                      |
| Lambda proxy integration   | Yes                    | Yes                         |
| CORS configuration         | Built-in               | Manual (per method)         |
| JWT authorizers            | Native                 | Lambda authorizer required  |
| Lambda authorizers         | Yes                    | Yes                         |
| API keys and usage plans   | No                     | Yes                         |
| Request body validation    | No                     | Yes                         |
| Response caching           | No                     | Yes                         |
| AWS WAF integration        | No                     | Yes                         |
| Automatic deployments      | Yes (`$default` stage) | No (manual deploy)          |
| Custom domain names        | Yes                    | Yes                         |
| WebSocket support          | No                     | No (separate WebSocket API) |

## How to Choose

Start with HTTP APIs. Move to REST APIs only when you hit a feature you actually need. Here's the short version:

**Use HTTP APIs when:**

- You're building a backend for your own frontend (the scenario in this course)
- You want the lowest cost and latency
- JWT-based authentication is sufficient
- You don't need to cache responses at the gateway layer

**Use REST APIs when:**

- You're exposing a public API to third-party consumers who need API keys
- You need request validation at the gateway layer before Lambda runs
- You need response caching to reduce Lambda invocations
- You need WAF integration for IP filtering or rate limiting

> [!TIP]
> If you're not sure, use an HTTP API. You can migrate to a REST API later if you need a feature that HTTP APIs lack. The Lambda handler code is the same for both—only the API Gateway configuration differs.

## A Note on Naming

AWS's naming here is genuinely confusing. "REST API" is a product name, not a description of architectural style. An HTTP API can serve perfectly RESTful endpoints. When you see "REST API" in AWS documentation, it refers to the older, feature-rich API Gateway product. When you see "HTTP API," it refers to the newer, streamlined product. The terms have nothing to do with whether your API follows REST principles.

> [!WARNING]
> The AWS CLI uses different command families for each type. REST APIs use `aws apigateway` (without the "v2"). HTTP APIs use `aws apigatewayv2`. If you're following tutorials or Stack Overflow answers, check which API type the commands target. A `create-rest-api` command won't work when you meant to create an HTTP API.

## Verification

- You can explain why HTTP APIs are the default for this course without reducing the answer to "because they are newer."
- You can name at least two features that might justify a REST API's extra cost and complexity.
- You can tell, from the CLI command family alone, whether a tutorial is talking about REST APIs or HTTP APIs.

## Common Failure Modes

- **Picking REST APIs because the name sounds more "correct":** In AWS, the product names are historical, not architectural guidance.
- **Assuming migration cost is zero:** The handler code is portable, but the gateway configuration and operational surface are not identical.
- **Following documentation for the wrong API family:** `apigateway` and `apigatewayv2` are easy to confuse and will waste time fast.

Next up, you're going to create an HTTP API using the CLI. The process takes three commands: create the API, create an integration pointing to your Lambda function, and create a route that maps an HTTP method and path to that integration. You already have a deployed Lambda function from [Deploying and Testing a Lambda Function](deploying-and-testing-a-lambda-function.md)—now you're going to give it a public URL.
