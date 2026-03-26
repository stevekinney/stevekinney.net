---
title: Request and Response Mapping
description: >-
  Understand how API Gateway transforms HTTP requests into Lambda event objects
  and how your handler's return value maps to an HTTP response.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - api-gateway
  - lambda
  - events
---

When a request hits your API Gateway endpoint, it doesn't arrive at your Lambda function as a raw HTTP request. API Gateway serializes the entire request — method, path, headers, query parameters, body — into a JSON event object and passes it to your handler. Your handler returns a JSON object, and API Gateway turns that back into an HTTP response. Understanding both sides of this transformation is the difference between confidently building an API and guessing at field names until something works.

## The Incoming Event: `APIGatewayProxyEventV2`

When you use an HTTP API with payload format version 2.0 (which you configured in [Connecting API Gateway to Lambda](connecting-api-gateway-to-lambda.md)), your handler receives an `APIGatewayProxyEventV2` object. Here's what a real event looks like for a `POST /items?category=books` request:

```json
{
  "version": "2.0",
  "routeKey": "POST /items",
  "rawPath": "/items",
  "rawQueryString": "category=books",
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer eyJhbG...",
    "host": "abc123def4.execute-api.us-east-1.amazonaws.com",
    "user-agent": "Mozilla/5.0..."
  },
  "queryStringParameters": {
    "category": "books"
  },
  "requestContext": {
    "accountId": "123456789012",
    "apiId": "abc123def4",
    "domainName": "abc123def4.execute-api.us-east-1.amazonaws.com",
    "http": {
      "method": "POST",
      "path": "/items",
      "protocol": "HTTP/1.1",
      "sourceIp": "203.0.113.42",
      "userAgent": "Mozilla/5.0..."
    },
    "requestId": "abc123-request-id",
    "stage": "$default",
    "time": "18/Mar/2026:12:00:00 +0000",
    "timeEpoch": 1774051200000
  },
  "body": "{\"name\":\"TypeScript in Action\",\"price\":29.99}",
  "isBase64Encoded": false
}
```

That's a lot of fields. Here are the ones you'll use in almost every handler.

## The Fields That Matter

### HTTP Method and Path

```typescript
const method = event.requestContext.http.method;
const path = event.requestContext.http.path;
```

The method and path are nested under `requestContext.http`, not at the top level. This catches people who are used to Express or Next.js API routes where `req.method` is a top-level property.

### Query String Parameters

```typescript
const category = event.queryStringParameters?.category;
```

`queryStringParameters` is an object mapping parameter names to values. If the request has no query string, the field is `undefined` — not an empty object. Always use optional chaining.

For repeated query parameters (like `?tag=js&tag=ts`), API Gateway joins the values with a comma: `"js,ts"`. If you need individual values, split on the comma.

### Headers

```typescript
const contentType = event.headers['content-type'];
const authorization = event.headers['authorization'];
```

All header names are lowercased. If the client sends `Content-Type`, you access it as `event.headers['content-type']`. This is consistent behavior from API Gateway — you don't need to handle case variations.

### Request Body

```typescript
const body = event.body ? JSON.parse(event.body) : null;
// [!note The body is always a string. You must parse it yourself.]
```

The `body` is always a string, even when the client sends `Content-Type: application/json`. API Gateway doesn't parse it for you. If the request has no body (GET requests, for example), `event.body` is `undefined`.

> [!WARNING]
> Wrap `JSON.parse` in a try/catch. A client can send a malformed body that parses unsuccessfully, and an unhandled exception in your handler returns a 500 with no useful information to the caller.

```typescript
let body: unknown = null;
try {
  body = event.body ? JSON.parse(event.body) : null;
} catch {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Invalid JSON in request body' }),
  };
}
```

### Path Parameters

If your route includes path parameters (like `GET /items/{id}`), the values are available in `event.pathParameters`:

```typescript
const itemId = event.pathParameters?.id;
```

Like `queryStringParameters`, the `pathParameters` field is `undefined` when no path parameters are defined on the route — not an empty object. (I wish it were an empty object, but here we are.)

### The Stage

```typescript
const stage = event.requestContext.stage;
```

For the `$default` stage, this value is `"$default"`. If you create named stages (covered in [API Gateway Stages and Custom Domains](api-gateway-stages-and-custom-domains.md)), the stage name appears here. This can be useful for conditional behavior — different database tables per environment, different log levels, and so on.

## The Response Format

Your handler returns an object that API Gateway converts into an HTTP response. The format is straightforward:

```typescript
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ items: [] }),
};
```

### Required Fields

- **`statusCode`**: An integer HTTP status code. API Gateway passes this through to the client.
- **`body`**: A string. If you're returning JSON, you must `JSON.stringify` it. If you forget, the client receives `[object Object]`.

### Optional Fields

- **`headers`**: An object of response headers. You should always set `Content-Type`. You can also set caching headers, custom headers, or CORS headers (though CORS is better handled at the API Gateway level — covered in [API Gateway CORS Configuration](api-gateway-cors-configuration.md)).
- **`isBase64Encoded`**: Set to `true` if the body is base64-encoded binary data (images, PDFs). Defaults to `false`.
- **`cookies`**: An array of `Set-Cookie` header values. Using this field instead of setting cookies in the `headers` object ensures proper formatting when multiple cookies are set.

```typescript
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=300',
  },
  cookies: ['session=abc123; HttpOnly; Secure; SameSite=Strict'],
  body: JSON.stringify({ items: [] }),
};
```

## A Complete Handler Pattern

Here's a pattern that handles the common cases — routing by method, parsing the body, reading path parameters, and returning proper error responses:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

interface Item {
  id: string;
  name: string;
  price: number;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (method === 'GET' && path === '/items') {
    const category = event.queryStringParameters?.category;
    // [!note Use query parameters for filtering, sorting, and pagination.]
    const items: Item[] = []; // Fetch from database in a real application

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    };
  }

  if (method === 'POST' && path === '/items') {
    let body: { name: string; price: number };

    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }

    if (!body.name || typeof body.price !== 'number') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: name, price' }),
      };
    }

    const item: Item = {
      id: crypto.randomUUID(),
      name: body.name,
      price: body.price,
    };

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' }),
  };
};
```

> [!TIP]
> `crypto.randomUUID()` is available natively in Node.js 20. No need to install the `uuid` package for basic ID generation.

## Payload Format Version 1.0 vs. 2.0

If you're reading tutorials or Stack Overflow answers, you might see event shapes that look different from what's described here. That's because API Gateway has two payload format versions:

| Feature                  | Version 1.0                             | Version 2.0                        |
| ------------------------ | --------------------------------------- | ---------------------------------- |
| Method location          | `event.httpMethod`                      | `event.requestContext.http.method` |
| Path location            | `event.path`                            | `event.requestContext.http.path`   |
| Query params             | `event.queryStringParameters`           | `event.queryStringParameters`      |
| Multi-value query params | `event.multiValueQueryStringParameters` | Comma-separated in single field    |
| Multi-value headers      | `event.multiValueHeaders`               | Comma-separated in single field    |
| TypeScript type          | `APIGatewayProxyEvent`                  | `APIGatewayProxyEventV2`           |

Version 2.0 is the default for HTTP APIs created with `--payload-format-version 2.0`. Version 1.0 is the format used by REST APIs. This course uses 2.0 exclusively.

## Common Mistakes

**Accessing `event.httpMethod` instead of `event.requestContext.http.method`.** This is a version 1.0 field. In version 2.0, it doesn't exist. If your code references `event.httpMethod`, you're either using the wrong payload format or following a REST API tutorial.

**Returning an object as the body.** The body must be a string. Returning `{ items: [] }` instead of `JSON.stringify({ items: [] })` produces `[object Object]` in the response.

**Not handling undefined fields.** `queryStringParameters`, `pathParameters`, and `body` can all be `undefined`. TypeScript warns you about this if you're using the correct types — pay attention to those warnings.

Your API works, but try calling it from a React app running on `localhost:3000`. The browser blocks the request with a CORS error. You've seen this before — and now you're on the server side of the problem. The next lesson covers configuring CORS on your HTTP API so your frontend can actually call it.
