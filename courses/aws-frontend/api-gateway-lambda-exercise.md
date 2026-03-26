---
title: 'Exercise: Build an API with API Gateway and Lambda'
description: >-
  Build a 2-endpoint API backed by Lambda, configure CORS, and call it from a
  React frontend using fetch.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - api-gateway
  - exercise
---

You're going to build a complete API from scratch — an HTTP API in API Gateway with two routes, each wired to a Lambda function, with CORS configured so a React app can call it. By the end of this exercise, you'll have a working API that accepts GET and POST requests and returns JSON responses to your frontend.

This exercise ties together everything from Module 7 (Lambda) and Module 8 (API Gateway). You'll write the handler, deploy the function, create the API, wire the integration, and call it from the browser.

## Why It Matters

On Vercel, creating an API endpoint means dropping a file in the `api/` directory. On AWS, you build each layer yourself: the compute (Lambda), the HTTP layer (API Gateway), the routing, the permissions, and the CORS configuration. That sounds like more work — and it is — but when something breaks at 2am, you know exactly where to look because you built every piece. That's the trade-off.

## Your Task

Build and deploy an API with two endpoints:

- **`GET /items`** — returns a JSON array of items
- **`POST /items`** — accepts a JSON body with `name` and `price`, returns the created item with a generated `id`

Then call both endpoints from a React app running on `localhost:3000` (or `localhost:5173` if using Vite).

Use the account ID `123456789012`, region `us-east-1`, function name `my-frontend-app-api`, and `--output json` for all commands.

## Write the Lambda Handler

Create (or update) `lambda/src/handler.ts` with a handler that:

1. Uses the `APIGatewayProxyHandlerV2` type
2. Reads `event.requestContext.http.method` to distinguish between GET and POST
3. For GET requests: returns a 200 response with a JSON body containing an `items` array (hardcode 2-3 items, each with `id`, `name`, and `price` fields)
4. For POST requests: parses `event.body` as JSON, validates that `name` and `price` are present, generates an `id` using `crypto.randomUUID()`, and returns a 201 response with the created item
5. Returns a 405 response for any other HTTP method

Build the project and create the deployment zip.

### Checkpoint

`npm run build` succeeds with no TypeScript errors. `lambda/function.zip` contains the compiled handler.

## Deploy the Lambda Function

If you already have the `my-frontend-app-api` function from the Module 7 exercise, update its code. If not, create a new function with the execution role from [Lambda Execution Roles and Permissions](lambda-execution-roles-and-permissions.md).

For updating an existing function:

```bash
aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://lambda/function.zip \
  --region us-east-1 \
  --output json
```

### Checkpoint

Invoke the function directly with a GET test event and a POST test event. The GET event returns a 200 with items. The POST event returns a 201 with the created item.

## Create the HTTP API

Create an HTTP API named `my-frontend-app-api` with protocol type `HTTP`.

Save the `ApiId` from the response — you'll need it for every subsequent command.

### Checkpoint

`aws apigatewayv2 get-api --api-id YOUR_API_ID --region us-east-1 --output json` returns the API with the correct name and protocol type.

## Create the Integration

Create a Lambda proxy integration pointing to your function:

- Integration type: `AWS_PROXY`
- Integration URI: the ARN of your Lambda function
- Payload format version: `2.0`

Save the `IntegrationId` from the response.

### Checkpoint

`aws apigatewayv2 get-integrations --api-id YOUR_API_ID --region us-east-1 --output json` shows one integration with type `AWS_PROXY` and the correct function ARN.

## Create the Routes

Create two routes:

1. `GET /items` targeting your integration
2. `POST /items` targeting the same integration

Remember: the `--target` value is `integrations/{IntegrationId}`, with the `integrations/` prefix.

### Checkpoint

`aws apigatewayv2 get-routes --api-id YOUR_API_ID --region us-east-1 --output json` shows both routes with the correct route keys and targets.

## Grant Permission

Add a resource-based policy to your Lambda function that allows API Gateway to invoke it. Use `apigateway.amazonaws.com` as the principal, and set the source ARN to `arn:aws:execute-api:us-east-1:123456789012:YOUR_API_ID/*`.

### Checkpoint

```bash
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/items
```

Returns a 200 response with your items array. If you get a 500 error, the Lambda permission is missing.

## Configure CORS

Update the API with a CORS configuration that allows:

- Origins: `http://localhost:3000` and `http://localhost:5173`
- Methods: `GET`, `POST`
- Headers: `Content-Type`
- Max age: `86400`

### Checkpoint

Test the preflight response:

```bash
curl -i -X OPTIONS \
  https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/items \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

The response includes `access-control-allow-origin: http://localhost:3000` and `access-control-allow-methods` containing `GET` and `POST`.

## Call the API from React

Create a minimal React component (or use an existing React project) that calls both endpoints:

```typescript
const API_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com';

// GET /items
async function fetchItems() {
  const response = await fetch(`${API_URL}/items`);
  return response.json();
}

// POST /items
async function createItem(name: string, price: number) {
  const response = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price }),
  });
  return response.json();
}
```

Open the browser's DevTools Network tab and verify:

1. The GET request returns your items array
2. The POST request returns the created item with a generated `id`
3. No CORS errors appear in the console

### Checkpoint

Both `fetch` calls succeed from the browser. The Network tab shows 200/201 responses with the correct JSON bodies. No CORS errors in the console.

## Checkpoints Summary

- [ ] Lambda handler builds and handles both GET and POST
- [ ] Lambda function is deployed and invocable from the CLI
- [ ] HTTP API exists with the correct protocol type
- [ ] Integration connects to the Lambda function with payload format 2.0
- [ ] Routes exist for `GET /items` and `POST /items`
- [ ] Lambda permission allows API Gateway to invoke the function
- [ ] `curl` to the API endpoint returns the expected JSON
- [ ] CORS is configured and preflight requests succeed
- [ ] React app can call both endpoints without CORS errors

## Stretch Goals

- **Add a `GET /items/{id}` route.** Create a third route with a path parameter. Update your handler to read `event.pathParameters?.id` and return a single item. Test it with `curl` and from your React app.

- **Add error handling for invalid POST bodies.** Send a POST request with an empty body, a non-JSON body, and a JSON body missing required fields. Verify your handler returns appropriate 400 responses in each case.

- **Add a custom domain.** If you have a domain managed in Route 53 and an ACM certificate, create a custom domain name for your API and test that it works.

When you're ready, check your work against the [Solution: Build an API with API Gateway and Lambda](api-gateway-lambda-solution.md).
