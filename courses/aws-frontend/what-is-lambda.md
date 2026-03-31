---
title: What is Lambda?
description: >-
  Understand the Lambda execution model — how Lambda runs your code without
  servers, how invocations work, and how Lambda differs from traditional server
  deployments.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - lambda
  - serverless
  - fundamentals
---

If you've ever deployed a serverless function on Vercel, you already know the core idea: you write a function, you deploy it, and the platform runs it when someone makes a request. You don't provision servers, you don't manage uptime, and you don't pay when nothing is happening. **Lambda** is the AWS service that powers this model — and it's literally what Vercel's serverless functions are built on top of.

Up to this point in the course, everything you've deployed has been static. S3 holds files, CloudFront serves them to the world. But the moment your frontend needs to talk to a backend — an API endpoint, a form submission handler, a webhook receiver — you need compute. Lambda gives you compute without giving you servers.

## Why This Matters

This is the point where the course stops being "frontend hosting on AWS" and becomes "full-stack frontend architecture on AWS." The Summit Supply storefront has static pages already. Lambda is how it graduates to live inventory, cart actions, webhooks, and API responses without introducing a server you now have to keep alive.

## Builds On

This lesson builds on the static deployment pipeline from Modules 2 through 6. You already know how assets reach users. Now you are adding compute behind those assets so the frontend can ask questions and change data at runtime.

## The Execution Model

Traditional servers run continuously. You spin up a Node.js process, it listens on a port, and it sits there waiting for requests. You pay for every second it runs, whether it handles zero requests or ten thousand. If traffic spikes, you need to figure out scaling. If the process crashes at 3 AM, you need to figure out restarts.

Lambda inverts this model entirely. There's no running process. There's no port. There's no server you manage. Instead:

1. Something triggers your function (an HTTP request via API Gateway, an S3 event, a schedule, a direct invocation).
2. Lambda creates an **execution environment** — a lightweight container with your code and a Node.js runtime.
3. Your function runs, returns a result, and the environment either stays warm for the next request or gets shut down.

You write a function. AWS handles everything else: provisioning, scaling, patching, monitoring. Lambda can run zero instances when nobody is calling your API and spin up thousands of instances if your site goes viral on Hacker News. You pay per **invocation** (each time your function runs) and per millisecond of compute time.

## The Runtime Lifecycle

Every Lambda execution environment goes through three phases. Understanding these phases matters because they directly affect your function's performance — especially the cold start problem you'll learn about later in this module.

### Init Phase

The first time Lambda needs to run your function (or when it scales up to handle more traffic), it creates a new execution environment. During the **init phase**, Lambda:

- Downloads your deployment package (your zipped code)
- Starts the runtime (Node.js 20 in our case)
- Runs your top-level module code — `import` statements, database client initialization, anything outside your handler function

This phase happens once per execution environment, not once per request. Code you put at the top level of your module runs during init and persists across invocations on the same environment. I think of it as the "warm up the kitchen" step — you do it once, and then you're ready to cook for as many customers as Lambda sends your way.

### Invoke Phase

This is when your handler function actually executes. Lambda passes in an **event** object (containing the request data) and a **context** object (containing metadata about the invocation), and your function does its work and returns a response. This phase happens on every single invocation.

### Shutdown Phase

When Lambda decides an execution environment is no longer needed — usually after several minutes of inactivity — it shuts it down. You don't control when this happens, and you generally shouldn't rely on shutdown behavior in your application logic.

The key insight: the init phase is expensive (relatively speaking), and the invoke phase is cheap. Lambda reuses execution environments across multiple invocations to amortize that init cost. A "warm" function skips init entirely and jumps straight to invoke. A "cold" function pays the init cost before it can handle its first request.

## Runtimes

Lambda supports multiple language runtimes. For this course, you'll use **Node.js 20** (`nodejs20.x`). Lambda also supports Python, Java, .NET, Go, Ruby, and custom runtimes via container images.

The runtime you choose affects cold start performance, available SDK versions, and how you structure your code. Node.js is a natural fit for frontend engineers: you already know the language, you can share types between your frontend and your Lambda functions, and the Node.js runtime has some of the fastest cold starts among Lambda's managed runtimes.

> [!TIP]
> Lambda also supports `nodejs22.x` if you want the latest Node.js features. This course uses `nodejs20.x` because it's the current LTS version and widely supported. The concepts are identical regardless of which Node.js version you choose.

## How Lambda Differs from What You Know

If you've used Vercel's serverless functions, Lambda will feel familiar — but there are differences worth calling out:

|                       | Vercel Serverless Functions    | AWS Lambda                                                        |
| --------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Deployment            | Push to Git, Vercel handles it | You package and deploy (CLI, CI/CD)                               |
| HTTP routing          | File-based (`api/hello.ts`)    | Separate service (API Gateway, covered in Module 8)               |
| Environment variables | Dashboard UI                   | CLI or console, 4 KB total limit                                  |
| Logs                  | Vercel dashboard               | CloudWatch Logs (covered in Module 12)                            |
| Scaling               | Automatic, opaque              | Automatic, configurable concurrency limits                        |
| Cold starts           | Managed by Vercel              | You manage (bundle size, runtime choice, provisioned concurrency) |

The biggest conceptual shift: on Vercel, a serverless function and its HTTP route are a single thing. On AWS, the function (Lambda) and its HTTP layer (API Gateway) are separate services that you wire together. This feels like extra work at first, but it gives you control over routing, authentication, CORS, and rate limiting that Vercel abstracts away.

## Pricing

Lambda pricing has two components:

- **Requests**: $0.20 per million invocations. The first one million invocations per month are free.
- **Duration**: Billed per millisecond of compute time, based on the memory you allocate. At 128 MB (the default), the cost is roughly $0.0000000021 per millisecond.

For most frontend API backends, you'll stay within the free tier for a long time. A function that handles 100,000 requests per month with an average duration of 50 milliseconds costs essentially nothing. This is a meaningful advantage over running an always-on server — especially during development and for low-traffic projects.

> [!WARNING]
> Lambda bills for the **init phase** as well as the invoke phase. A function with a large deployment package that takes 500 milliseconds to initialize pays for that initialization time on every cold start. This is one of the reasons keeping your bundle size small matters — it's not just about cold start latency, it's about cost.

## What Lambda Is Not

Lambda isn't a general-purpose server. It has constraints you should know before writing code:

- **Execution timeout**: Maximum 15 minutes per invocation. For API responses, you'll typically stay under 10 seconds.
- **Memory**: 128 MB to 10,240 MB. CPU scales proportionally with memory.
- **Deployment package**: 50 MB zipped, 250 MB unzipped. This is your code plus `node_modules`.
- **Stateless**: Each invocation is independent. There's no persistent filesystem, no in-memory state between requests (except within a single warm execution environment, which isn't guaranteed).
- **Ephemeral storage**: `/tmp` gives you up to 10 GB of scratch space, but it's cleared when the environment is recycled.

These constraints push you toward a specific architecture: small, focused functions that do one thing, respond quickly, and store state externally (in DynamoDB, S3, or another service). This is exactly the architecture you want for a frontend API backend.

## Where Logs Go

When your Lambda function runs, anything you write to `console.log` (or `console.error`, `console.warn`) goes to **CloudWatch Logs**. Lambda automatically creates a log group named `/aws/lambda/<function-name>` — in your case, `/aws/lambda/my-frontend-app-api`. Each execution environment gets its own log stream within that group.

## Verification

- You can explain the difference between an invocation, an execution environment, and a warm reuse of that environment.
- You can look at a frontend feature like "submit the Summit Supply contact form" and describe it as an event that triggers a Lambda function.
- You know where Lambda logs land before you ever open the CloudWatch console.

## Common Failure Modes

- **Thinking Lambda is an always-on server with a different billing model:** It is event-driven compute with lifecycle constraints, not a tiny VPS.
- **Ignoring package size and initialization cost:** Those become both latency and cost problems once cold starts enter the picture.
- **Assuming local process state is durable:** Warm reuse exists, but Lambda is still fundamentally a stateless architecture.

We'll dig into CloudWatch properly in Module 12. For now, just know that your logs exist and where to find them: in the CloudWatch console under **Log groups**, or via the CLI with `aws logs` commands. Next up, you'll write your first Lambda handler in TypeScript — a function that receives an event and returns a JSON response.
