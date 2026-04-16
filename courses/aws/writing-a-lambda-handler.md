---
title: Writing a Lambda Handler
description: >-
  Write a Lambda handler in TypeScript that receives an event, processes it, and
  returns a properly formatted response.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - lambda
  - typescript
  - handler
---

You know what Lambda is and how the execution model works. Now you need to write the code that Lambda actually runs. A Lambda **handler** is just an exported async function with a specific signature—it receives an event, does some work, and returns a response. If you've ever written an API route in Next.js or a serverless function in Vercel, the shape is nearly identical.

If you want AWS's version of the handler contract in front of you, the [Node.js handler guide for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) is the official reference.

## Project Setup

Start by creating the Lambda project directory and initializing it. This follows the project structure from the course conventions:

```
my-frontend-app/
├── lambda/
│   ├── src/
│   │   └── handler.ts
│   ├── package.json
│   └── tsconfig.json
```

Initialize the project and install dependencies:

```bash
mkdir -p lambda/src
cd lambda
npm init -y
npm install -D typescript @types/aws-lambda @types/node
```

The key dependency here is `@types/aws-lambda`—this package provides TypeScript type definitions for every Lambda event source. You won't install the AWS SDK as a dependency because Lambda provides it in the execution environment already. You only need the types.

## The tsconfig.json

Create a `tsconfig.json` in the `lambda/` directory:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "types": ["node"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

> [!TIP]
> Lambda's Node.js 22 runtime uses CommonJS by default. Setting `"module": "commonjs"` keeps things simple. You can use ESM with Lambda, but it adds configuration overhead with no practical benefit for most Lambda functions.

## The Handler Signature

Every Lambda handler follows the same pattern: it's an exported async function that receives an `event` and returns a response. The type of the event depends on what triggers the function. Since you're building an API backend that will sit behind API Gateway later in the course, you'll use the `APIGatewayProxyHandlerV2` type.

Here's the minimal handler:

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

Let's break this down.

### The Type: `APIGatewayProxyHandlerV2`

This type comes from `@types/aws-lambda` and tells TypeScript three things:

1. The `event` parameter is an `APIGatewayProxyEventV2`—an HTTP request from API Gateway's HTTP API.
2. The return type is an `APIGatewayProxyResultV2`—an HTTP response with `statusCode`, `headers`, and `body`.
3. The handler is async and returns a `Promise`.

The "V2" in the name refers to API Gateway's HTTP API (the newer, cheaper, faster version). There's also `APIGatewayProxyHandler` (without V2) for the older REST API. This course uses HTTP APIs, so you'll use the V2 types throughout.

### The Event Object

The `event` object contains everything about the incoming HTTP request. Here are the fields you'll use most often:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  // [!note The HTTP method is nested inside `requestContext`, not at the top level.]
  const path = event.requestContext.http.path;
  const queryParams = event.queryStringParameters;
  const body = event.body ? JSON.parse(event.body) : null;
  // [!note `event.body` is always a string—you need to parse it yourself.]
  const headers = event.headers;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      path,
      queryParams,
      receivedBody: body,
    }),
  };
};
```

### The Response Object

The response must include a `statusCode` and a `body`. The `body` must be a string—if you're returning JSON, you need to `JSON.stringify` it yourself. The `headers` object is optional but you should always set `Content-Type`.

```typescript
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
  body: JSON.stringify({ message: 'Hello from Lambda' }),
};
```

> [!WARNING]
> If you forget to `JSON.stringify` the body, Lambda will call `.toString()` on your object, and your API will return `[object Object]` instead of JSON. This is one of the most common Lambda mistakes.

## A Complete Handler

Here's a more realistic handler that demonstrates parsing query parameters, handling different HTTP methods, and returning appropriate error responses:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

interface GreetingResponse {
  greeting: string;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method !== 'GET') {
    const errorResponse: ErrorResponse = { error: 'Method not allowed' };

    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorResponse),
    };
  }

  const name = event.queryStringParameters?.name ?? 'World';
  // [!note The `??` operator handles both missing and `undefined` query params.]

  const response: GreetingResponse = {
    greeting: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  };
};
```

This handler:

- Checks the HTTP method and returns a 405 if it's not a GET request
- Reads the `name` query parameter, defaulting to "World"
- Returns a JSON response with a greeting and a timestamp

## The Context Object

The handler also receives a second argument: the **context** object. It contains metadata about the invocation itself:

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.log('Request ID:', context.awsRequestId);
  console.log('Function name:', context.functionName);
  console.log('Remaining time:', context.getRemainingTimeInMillis(), 'ms');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: context.awsRequestId }),
  };
};
```

The most useful fields:

- **`awsRequestId`**: A unique ID for this invocation. Include it in error responses so you can find the corresponding log entry.
- **`functionName`**: The name of the function being invoked.
- **`getRemainingTimeInMillis()`**: How much time is left before Lambda kills your function. Useful if you need to bail out of a long operation gracefully.

You won't use the context object in every handler, but it's good to know it's there.

## Compiling and Building

Add a build script to `lambda/package.json`:

```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

Run the build:

```bash
cd lambda
npm run build
```

TypeScript compiles `src/handler.ts` to `dist/handler.js`. The compiled JavaScript file is what Lambda actually runs. In the next lesson, you'll package this output into a zip file and deploy it.

## Common Mistakes

**Returning an object instead of a stringified body.** Lambda expects `body` to be a string. If you pass an object, the response will be mangled. I've lost more time to this one than I'd like to admit.

**Forgetting to handle missing fields.** Query parameters, headers, and the request body can all be `undefined`. TypeScript helps here—the `APIGatewayProxyEventV2` type marks these fields as optional, so the compiler will warn you if you access them without checking.

**Using callbacks instead of async/await.** Lambda supports both patterns, but the callback pattern (`callback(null, response)`) is a holdover from the Node.js 6 era. Use async handlers. They're cleaner, they work with try/catch, and they're what the types expect.

> [!TIP]
> The `@types/aws-lambda` package includes types for every Lambda event source: S3 events, DynamoDB streams, SNS messages, CloudFront requests, and more. Even though this course focuses on API Gateway events, the same pattern applies to all of them: import the right handler type, and TypeScript tells you exactly what the event looks like.

## Error Handling and Retry Semantics

How Lambda treats thrown errors depends entirely on _who invoked the function_—and this trips people up because the rules aren't obvious from the handler's perspective.

- **Synchronous invokes** (API Gateway, Function URLs, direct `invoke` calls): if your handler throws, Lambda surfaces the exception to the caller. API Gateway returns a 5xx to the browser. Lambda does **not** retry. The handler owns its own retry logic.
- **Asynchronous invokes** (S3 events, SNS, EventBridge): Lambda automatically retries a failed invocation **twice** (two retries, three total attempts), with exponential backoff. If all three attempts fail, the event is either dropped or sent to a **destination** or **dead-letter queue (DLQ)** if you configured one.
- **Stream-based invokes** (DynamoDB Streams, Kinesis): Lambda retries _indefinitely_ on the failing batch until it succeeds or the record ages out of the stream—unless you set `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds` on the event source mapping. A poison-pill record can block a shard forever if you don't configure this.

For async workloads, always configure a DLQ or failure destination so you don't silently lose events:

```bash
aws lambda put-function-event-invoke-config \
  --function-name my-worker \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:us-east-1:123456789012:my-worker-dlq"}}' \
  --region us-east-1
```

In handler code, prefer catching expected errors and returning a structured response over letting them throw. Throwing is for genuinely unexpected failures:

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const data = await doWork(event);
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    console.error('handler error', { error, awsRequestId: event.requestContext.requestId });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal server error' }),
    };
  }
};
```

You've got a compiled TypeScript handler ready to go. Before you can deploy it, you need an IAM execution role—the role that Lambda assumes when it runs your function. That role determines what AWS services your function can access. You'll create one in the next lesson, building on the IAM concepts from [The IAM Mental Model](iam-mental-model.md).
