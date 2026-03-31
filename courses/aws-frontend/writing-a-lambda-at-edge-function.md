---
title: Writing a Lambda@Edge Function
description: >-
  Write and deploy a Lambda@Edge function that runs at origin request or
  response events, understanding the us-east-1 deployment requirement and the
  replication model.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - lambda-at-edge
  - deployment
---

Lambda@Edge is a full Lambda function that runs at CloudFront's regional edge caches instead of in a single region. If CloudFront Functions are like Vercel Edge Functions — tiny, fast, constrained — then Lambda@Edge is like a Vercel Serverless Function that AWS has moved closer to your users. You get the full Node.js runtime, npm packages, network access, and up to 30 seconds of execution time on origin events.

You already wrote and deployed a Lambda function in [Deploying and Testing a Lambda Function](deploying-and-testing-a-lambda-function.md). Lambda@Edge follows the same general pattern, but with a handful of additional constraints that trip people up. This lesson walks through all of them. Honestly, most of the gotchas aren't hard once you know they exist — the problem is that first time when you don't.

## The us-east-1 Requirement

Lambda@Edge functions **must** be created in `us-east-1`. This is the same requirement you encountered with ACM certificates in [Certificate Renewal and us-east-1](certificate-renewal-and-us-east-1.md) — CloudFront is a global service, and its control plane lives in `us-east-1`. When you associate a Lambda function with a CloudFront distribution, AWS replicates your function code to regional edge caches around the world. But the source of truth for that replication is always `us-east-1`.

If you try to associate a Lambda function from any other region with a CloudFront behavior, the API will reject it.

## The Handler Signature

Lambda@Edge handlers use the `CloudFrontRequestHandler` or `CloudFrontResponseHandler` types from `@types/aws-lambda`. The event structure is different from what you used with API Gateway.

```typescript
import type { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  // [!note The request lives at event.Records[0].cf.request — not event.request like in CloudFront Functions.]

  // Modify the request
  request.uri = request.uri.replace(/^\/api\//, '/v2/api/');

  return request;
};
```

The event object wraps the CloudFront data inside `event.Records[0].cf`. This structure exists because Lambda@Edge uses the same event delivery mechanism as other Lambda triggers — a `Records` array — even though there's always exactly one record.

### Event Object Shape

For an **origin request** event, the event object looks like this:

```typescript
{
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd111111abcdef8.cloudfront.net',
          distributionId: 'E1A2B3C4D5E6F7',
          eventType: 'origin-request',
          requestId: 'abcdef123456',
        },
        request: {
          clientIp: '203.0.113.1',
          method: 'GET',
          uri: '/about',
          querystring: 'page=1',
          headers: {
            host: [{ key: 'Host', value: 'example.com' }],
            'user-agent': [{ key: 'User-Agent', value: 'Mozilla/5.0...' }],
          },
          origin: {
            s3: {
              domainName: 'my-frontend-app-assets.s3.amazonaws.com',
              path: '',
              region: 'us-east-1',
              authMethod: 'origin-access-identity',
            },
          },
        },
      },
    },
  ];
}
```

Notice the differences from CloudFront Functions:

- **Headers** are arrays of objects with `key` and `value` properties, not single objects. This is because HTTP headers can have multiple values.
- **Query string** is a plain string, not a parsed object.
- **The `origin` property** is present on origin request events and tells you where CloudFront's about to forward the request. You can modify this to change the origin dynamically.

### Returning a Request vs. a Response

Just like CloudFront Functions, returning the `request` object tells CloudFront to continue processing. Returning a **response** object short-circuits the origin request and sends a response directly:

```typescript
import type { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;

  if (request.uri === '/health') {
    return {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'application/json' }],
      },
      body: JSON.stringify({ status: 'healthy' }),
    };
  }

  return request;
};
```

> [!WARNING]
> In Lambda@Edge response objects, `status` is a **string**, not a number. Writing `status: 200` instead of `status: '200'` will cause a runtime error. This catches people coming from regular Lambda handlers where `statusCode` is a number.

## Writing and Deploying the Function

### Write the handler

Create a Lambda@Edge function that adds a custom header to origin requests. This is useful for passing information to your origin that the viewer didn't send.

```typescript
import type { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;

  request.headers['x-forwarded-by-edge'] = [
    {
      key: 'X-Forwarded-By-Edge',
      value: 'true',
    },
  ];

  return request;
};
```

Build and package this the same way you did in [Deploying and Testing a Lambda Function](deploying-and-testing-a-lambda-function.md): compile with TypeScript, zip the output.

### Create the execution role

Lambda@Edge requires a trust policy that allows **both** `lambda.amazonaws.com` and `edgelambda.amazonaws.com` to assume the role. This is different from a standard Lambda function, which only needs `lambda.amazonaws.com`. It's an easy thing to miss.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
aws iam create-role \
  --role-name my-frontend-app-edge-role \
  --assume-role-policy-document file://edge-trust-policy.json \
  --region us-east-1 \
  --output json
```

Attach the basic execution role policy so the function can write logs:

```bash
aws iam attach-role-policy \
  --role-name my-frontend-app-edge-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --region us-east-1 \
  --output json
```

### Deploy to us-east-1

```bash
aws lambda create-function \
  --function-name my-frontend-app-edge-rewrite \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/my-frontend-app-edge-role \
  --handler handler.handler \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

### Publish a numbered version

This is the critical step that differs from standard Lambda. Lambda@Edge **requires** a published, numbered version. You can't use `$LATEST`.

```bash
aws lambda publish-version \
  --function-name my-frontend-app-edge-rewrite \
  --description "Initial deployment" \
  --region us-east-1 \
  --output json
```

The response includes a `Version` field (e.g., `"1"`) and a versioned ARN:

```
arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-edge-rewrite:1
```

That versioned ARN — with the `:1` at the end — is what you use when associating the function with CloudFront.

### Associate with a CloudFront behavior

Retrieve your distribution config, add a `LambdaFunctionAssociations` block to the behavior, and update:

```json
{
  "LambdaFunctionAssociations": {
    "Quantity": 1,
    "Items": [
      {
        "LambdaFunctionARN": "arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-edge-rewrite:1",
        "EventType": "origin-request",
        "IncludeBody": false
      }
    ]
  }
}
```

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match ETAG_FROM_GET \
  --distribution-config file://dist-config.json \
  --region us-east-1 \
  --output json
```

After the distribution finishes deploying (this takes a few minutes), your Lambda@Edge function will run on every origin request.

## The Replication Model

When you associate a Lambda@Edge function with a CloudFront distribution, AWS replicates your function to regional edge caches worldwide. This has three implications:

1. **Deployment isn't instant.** Unlike CloudFront Functions (which propagate in seconds), Lambda@Edge replicas take several minutes to deploy globally.

2. **You can't delete the function while replicas exist.** If you remove a Lambda@Edge association from your distribution, AWS doesn't immediately delete the replicas. You may need to wait hours (sometimes up to a day) before you can delete the Lambda function itself. The API will return a `ReplicatedFunctionStillCreating` or `ResourceConflictException` error until replication cleanup is complete.

3. **Each update requires a new version.** You can't update a version in place. You publish a new version (`:2`, `:3`, etc.), update the CloudFront behavior to point to the new version ARN, and wait for replication.

> [!TIP]
> Updating a Lambda@Edge function follows this cycle: update the function code, publish a new version, update the CloudFront behavior to reference the new version ARN, wait for distribution deployment. It's more steps than CloudFront Functions, but you get the full Node.js runtime in exchange.

## Constraints to Remember

- **No user-defined environment variables.** Lambda@Edge doesn't support user-defined environment variables at all, whether the function runs on viewer events or origin events.
- **128 MB memory cap for viewer events.** If your viewer-triggered function needs more memory, you need to reconsider your approach — either move the logic to an origin trigger (up to 10,240 MB) or simplify it.
- **5-second timeout for viewer events, 30 seconds for origin events.** A viewer request function that takes 5 seconds will make your site feel broken. Keep viewer-triggered functions fast — if it's slow enough for the user to notice, it's too slow.
- **1 MB package size for viewer events.** This is the compressed zip size. If you bundle large libraries, you may exceed this. Use tree-shaking and keep dependencies minimal.

These constraints are covered in detail in [Edge Function Debugging and Limitations](edge-function-debugging-and-limitations.md). The important one to remember here is the least intuitive: Lambda@Edge doesn't support user-defined environment variables at all, other than the reserved ones AWS injects automatically.
