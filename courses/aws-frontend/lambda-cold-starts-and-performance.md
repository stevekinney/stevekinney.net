---
title: Lambda Cold Starts and Performance
description: >-
  Understand what causes cold starts, how they affect latency, and practical
  strategies for minimizing their impact on your frontend's API calls.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - lambda
  - performance
  - cold-starts
---

You've deployed a Lambda function, invoked it, and it works. But if you invoke it after a period of inactivity, the first response is noticeably slower than the ones that follow. That first slow response is a **cold start**, and it's the performance characteristic of Lambda that matters most to frontend engineers building API backends.

A cold start adds latency to the first request after an idle period. For an API endpoint that your frontend calls on page load, that latency is the difference between a snappy experience and a visible loading spinner. You can't eliminate cold starts entirely, but you can make them fast enough that users don't notice.

## What Happens During a Cold Start

Recall the runtime lifecycle from [What is Lambda?](what-is-lambda.md): every execution environment goes through init, invoke, and (eventually) shutdown. A cold start is what happens when Lambda has no warm execution environment available for your function.

During the **init phase**, Lambda does the following:

1. **Downloads your deployment package** from internal storage to the execution environment.
2. **Starts the runtime** — in your case, Node.js 20.
3. **Runs your top-level module code** — every `import` statement, every module-level variable initialization, every database client constructor.

Only after all of that completes does your handler function execute. Steps 1 and 2 are controlled by Lambda. Step 3 is controlled by you.

A **warm start** skips all three steps. The execution environment is already running, the runtime is already initialized, your top-level code has already executed. Lambda goes straight to calling your handler function. This is why the second request is faster: it reuses the existing environment.

## How Long Do Cold Starts Take?

For a Node.js 20 function with a small deployment package and no heavy dependencies, cold start latency is typically in the range of **100-400 milliseconds**. For a function with a large `node_modules` directory, several AWS SDK clients, and complex initialization logic, cold starts can reach **1-3 seconds**.

Here's what affects cold start duration, roughly in order of impact:

### Deployment Package Size

The biggest factor. Lambda downloads your zip file from internal storage before it can start the runtime. A 1 MB zip downloads faster than a 50 MB zip. This is why tree-shaking, removing unused dependencies, and being selective about what goes into `node_modules` matters for Lambda in a way it doesn't for a Vercel deployment (where the CDN layer hides the startup cost).

### Number and Size of Dependencies

Every `import` or `require` statement in your top-level code executes during init. If your handler imports the entire AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/client-dynamodb`, `@aws-sdk/client-ses`) but only uses DynamoDB, those unused imports still run during initialization. Import only what you use.

### Runtime Choice

Node.js and Python have the fastest cold starts among Lambda's managed runtimes. Java and .NET have significantly slower cold starts because their runtimes take longer to initialize. This is one reason Node.js is a natural choice for frontend API backends: you already know the language, and the cold start performance is among the best available.

### Memory Configuration

Lambda allocates CPU proportionally to memory. A 128 MB function gets a fraction of a vCPU; a 1,024 MB function gets substantially more. More CPU means faster initialization — your `import` statements execute faster, your SDK clients initialize faster. For cold-start-sensitive functions, increasing memory from 128 MB to 512 MB or 1,024 MB often reduces cold start latency by 40-60%, and the cost increase is negligible because the function initializes faster (you pay per millisecond).

### VPC Configuration

If your Lambda function is configured to run inside a VPC (Virtual Private Cloud), cold starts include creating and attaching a network interface. This used to add 5-10 seconds of cold start latency, but AWS improved VPC networking significantly — the penalty is now roughly 1-2 seconds. Still, avoid putting functions in a VPC unless they need to access VPC-only resources like an RDS database. For this course, your functions don't need VPC access.

## When Cold Starts Happen

Cold starts don't happen on every request. They happen when:

- **Your function hasn't been invoked recently.** Lambda keeps execution environments warm for roughly 5-15 minutes of inactivity (the exact duration isn't guaranteed and varies).
- **Traffic spikes.** If your function is handling 10 concurrent requests and an 11th arrives, Lambda creates a new execution environment for that 11th request. The 11th user experiences a cold start even though the function has been running continuously.
- **You deploy new code.** After `update-function-code`, existing warm environments use the old code. New environments with the new code experience cold starts.

For a frontend API that receives consistent traffic, cold starts are rare after the initial invocation. For an API that gets sporadic traffic — a few requests per hour from an internal tool — cold starts are the norm.

## Practical Mitigation Strategies

### Keep Your Bundle Small

This is the highest-impact change you can make. Remove unused dependencies, use tree-shaking, and audit your `package.json` regularly. I can't stress this one enough.

```bash
# Check the size of your deployment package
ls -lh function.zip
```

A good target for a typical API handler is under 5 MB zipped. If your zip is over 10 MB, you probably have dependencies you don't need.

### Use Lazy Imports for Rarely-Used Dependencies

If your handler conditionally uses a large dependency (like an image processing library for one specific route), import it inside the handler instead of at the top level:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const path = event.requestContext.http.path;

  if (path === '/generate-thumbnail') {
    // Only loaded when this code path is hit
    const sharp = await import('sharp');
    // [!note Dynamic imports run only when the code path executes, not during init.]
    // ... use sharp
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'OK' }),
  };
};
```

This keeps the init phase fast for the common case. The uncommon path pays the import cost only when it's actually used.

### Increase Memory

If your cold starts are in the 500+ millisecond range, try doubling the memory:

```bash
aws lambda update-function-configuration \
  --function-name my-frontend-app-api \
  --memory-size 512 \
  --region us-east-1 \
  --output json
```

The increase in per-millisecond cost is usually offset by the decrease in duration. Test both configurations and compare total cost, not just per-millisecond pricing.

### Initialize Clients Outside the Handler

If your function uses the AWS SDK (for DynamoDB, S3, etc.), create the client at the top level so it initializes once during init and is reused across warm invocations:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
// [!note Top-level initialization runs once during init and persists across warm invocations.]

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const result = await client.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: 'some-id' },
    }),
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.Item),
  };
};
```

This is a general best practice, not just a cold start optimization. A warm function reuses the existing client (and its TCP connections) instead of creating a new one on every request.

## Provisioned Concurrency

Lambda offers a feature called **provisioned concurrency** that pre-creates a specified number of warm execution environments for your function. These environments are always ready, eliminating cold starts entirely — at a cost.

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name my-frontend-app-api \
  --qualifier $LATEST \
  --provisioned-concurrent-executions 5 \
  --region us-east-1 \
  --output json
```

This keeps 5 execution environments warm at all times. You pay for them whether they handle requests or not — it's essentially the cost of running a small server continuously.

For most frontend API backends, provisioned concurrency is overkill. It makes sense for latency-critical production workloads where even occasional cold starts are unacceptable (payment processing, real-time gaming). For a typical frontend API, the strategies above — small bundles, increased memory, top-level initialization — are sufficient and far cheaper.

> [!TIP]
> Before reaching for provisioned concurrency, measure your actual cold start latency. If your function initializes in 200 milliseconds and your API's p95 latency requirement is under 500 milliseconds, you're already fine. Optimize based on measurement, not anxiety.

## Measuring Cold Starts

You can see cold start duration in your function's CloudWatch Logs. Lambda logs an `Init Duration` field on cold start invocations:

```
REPORT RequestId: abc-123 Duration: 15.23 ms Billed Duration: 16 ms
Memory Size: 128 MB Max Memory Used: 67 MB Init Duration: 245.67 ms
```

The `Init Duration` field only appears on cold start invocations. If you don't see it, the invocation was a warm start. Compare the `Duration` (your handler execution time) to the `Init Duration` (the cold start overhead) to understand where your latency comes from.

You now understand all the core Lambda concepts: writing handlers, configuring execution roles, deploying and testing, setting environment variables, and managing cold start performance. In the next module, you'll put an HTTP layer in front of your function with API Gateway, so your frontend can call it with a `fetch` request.
