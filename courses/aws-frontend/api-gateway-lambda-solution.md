---
title: 'Solution: Build an API with API Gateway and Lambda'
description: >-
  Complete solution for the API Gateway and Lambda exercise, with all commands,
  handler code, and expected output.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - api-gateway
  - exercise
  - solution
---

Here is the complete solution for every step, including the handler code, all CLI commands, and the expected output at each stage.

## The Handler

### `lambda/src/handler.ts`

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

interface Item {
  id: string;
  name: string;
  price: number;
}

const items: Item[] = [
  { id: '1', name: 'TypeScript in Action', price: 29.99 },
  { id: '2', name: 'AWS for Humans', price: 34.99 },
  { id: '3', name: 'React Patterns', price: 24.99 },
];

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  // [!note Route by HTTP method since both GET and POST /items hit the same Lambda function.]

  if (method === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    };
  }

  if (method === 'POST') {
    let body: { name?: string; price?: number };

    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    if (!body.name || typeof body.price !== 'number') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing required fields: name (string), price (number)',
        }),
      };
    }

    const newItem: Item = {
      id: crypto.randomUUID(),
      name: body.name,
      price: body.price,
    };

    items.push(newItem);
    // [!note This in-memory array resets on cold starts. A real API would write to DynamoDB.]

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    };
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
```

### Build and Zip

```bash
cd lambda
npm run build
cd dist && zip -r ../function.zip . && cd ..
```

Expected: `dist/handler.js` is created with no errors. `function.zip` contains the compiled output.

## Deploy the Lambda Function

### Update Existing Function

If you have the function from the Module 7 exercise:

```bash
aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://lambda/function.zip \
  --region us-east-1 \
  --output json
```

### Create New Function

If you are starting fresh, create the execution role and function first:

```bash
aws iam create-role \
  --role-name my-frontend-app-lambda-role \
  --assume-role-policy-document file://trust-policy.json \
  --region us-east-1 \
  --output json

aws iam attach-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --region us-east-1 \
  --output json

aws lambda create-function \
  --function-name my-frontend-app-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/my-frontend-app-lambda-role \
  --handler handler.handler \
  --zip-file fileb://lambda/function.zip \
  --region us-east-1 \
  --output json
```

### Verify with Direct Invocation

Test GET:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload '{"requestContext":{"http":{"method":"GET","path":"/items"}}}' \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected response:

```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"items\":[{\"id\":\"1\",\"name\":\"TypeScript in Action\",\"price\":29.99},{\"id\":\"2\",\"name\":\"AWS for Humans\",\"price\":34.99},{\"id\":\"3\",\"name\":\"React Patterns\",\"price\":24.99}]}"
}
```

Test POST:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload '{"requestContext":{"http":{"method":"POST","path":"/items"}},"body":"{\"name\":\"Node.js Essentials\",\"price\":19.99}"}' \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected response:

```json
{
  "statusCode": 201,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"id\":\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\",\"name\":\"Node.js Essentials\",\"price\":19.99}"
}
```

The `id` will be a different UUID on each invocation.

## Create the HTTP API

```bash
aws apigatewayv2 create-api \
  --name my-frontend-app-api \
  --protocol-type HTTP \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "ApiEndpoint": "https://abc123def4.execute-api.us-east-1.amazonaws.com",
  "ApiId": "abc123def4",
  "CreatedDate": "2026-03-18T12:00:00+00:00",
  "Name": "my-frontend-app-api",
  "ProtocolType": "HTTP",
  "RouteSelectionExpression": "${request.method} ${request.path}"
}
```

Save the API ID:

```bash
API_ID="abc123def4"
```

## Create the Integration

```bash
aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-api \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "ConnectionType": "INTERNET",
  "IntegrationId": "a1b2c3",
  "IntegrationType": "AWS_PROXY",
  "IntegrationUri": "arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-api",
  "PayloadFormatVersion": "2.0",
  "TimeoutInMillis": 30000
}
```

Save the integration ID:

```bash
INTEGRATION_ID="a1b2c3"
```

## Create the Routes

### GET /items

```bash
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /items" \
  --target "integrations/$INTEGRATION_ID" \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "ApiKeyRequired": false,
  "RouteId": "route-get-123",
  "RouteKey": "GET /items",
  "Target": "integrations/a1b2c3"
}
```

### POST /items

```bash
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /items" \
  --target "integrations/$INTEGRATION_ID" \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "ApiKeyRequired": false,
  "RouteId": "route-post-456",
  "RouteKey": "POST /items",
  "Target": "integrations/a1b2c3"
}
```

### Verify routes

```bash
aws apigatewayv2 get-routes \
  --api-id $API_ID \
  --region us-east-1 \
  --output json
```

Expected: Two routes with route keys `GET /items` and `POST /items`, both targeting the same integration.

## Grant Permission

```bash
aws lambda add-permission \
  --function-name my-frontend-app-api \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:$API_ID/*" \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "Statement": "{\"Sid\":\"apigateway-invoke\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"apigateway.amazonaws.com\"},\"Action\":\"lambda:InvokeFunction\",\"Resource\":\"arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-api\",\"Condition\":{\"ArnLike\":{\"AWS:SourceArn\":\"arn:aws:execute-api:us-east-1:123456789012:abc123def4/*\"}}}"
}
```

### Test with curl

```bash
curl https://$API_ID.execute-api.us-east-1.amazonaws.com/items
```

Expected:

```json
{
  "items": [
    { "id": "1", "name": "TypeScript in Action", "price": 29.99 },
    { "id": "2", "name": "AWS for Humans", "price": 34.99 },
    { "id": "3", "name": "React Patterns", "price": 24.99 }
  ]
}
```

Test POST:

```bash
curl -X POST \
  https://$API_ID.execute-api.us-east-1.amazonaws.com/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Node.js Essentials","price":19.99}'
```

Expected:

```json
{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Node.js Essentials", "price": 19.99 }
```

> [!TIP]
> If `curl` returns `{"message":"Internal Server Error"}`, the Lambda permission is missing. Run the `add-permission` command above. If the API returns `{"message":"Not Found"}`, the routes were not created correctly — check `get-routes` to verify.

## Configure CORS

```bash
aws apigatewayv2 update-api \
  --api-id $API_ID \
  --cors-configuration \
    AllowOrigins="http://localhost:3000","http://localhost:5173" \
    AllowMethods="GET","POST" \
    AllowHeaders="Content-Type" \
    MaxAge=86400 \
  --region us-east-1 \
  --output json
```

Expected: the response includes a `CorsConfiguration` block with the values you set.

### Test preflight

```bash
curl -i -X OPTIONS \
  https://$API_ID.execute-api.us-east-1.amazonaws.com/items \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Expected headers in the response:

```
access-control-allow-headers: Content-Type
access-control-allow-methods: GET, POST
access-control-allow-origin: http://localhost:3000
access-control-max-age: 86400
```

## Call from React

Here is a minimal React component that calls both endpoints:

```typescript
import { useEffect, useState } from 'react';

interface Item {
  id: string;
  name: string;
  price: number;
}

const API_URL = 'https://abc123def4.execute-api.us-east-1.amazonaws.com';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/items`)
      .then((response) => response.json())
      .then((data) => setItems(data.items));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price: parseFloat(price) }),
    });

    const newItem = await response.json();
    setItems((previous) => [...previous, newItem]);
    setName('');
    setPrice('');
  }

  return (
    <div>
      <h1>Items</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} — ${item.price.toFixed(2)}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          type="number"
          placeholder="Price"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <button type="submit">Add Item</button>
      </form>
    </div>
  );
}
```

Open the browser, verify the items list loads, add a new item using the form, and confirm it appears in the list. Check the DevTools Network tab to verify both requests succeed with 200/201 status codes and no CORS errors.

> [!WARNING]
> The in-memory `items` array in the Lambda handler resets on every cold start. If you add an item through POST and then wait a few minutes (long enough for Lambda to recycle the execution environment), the item will be gone. This is expected — in-memory state is not persistent. In Module 10, you will replace this array with DynamoDB for durable storage.

## Stretch Goal: `GET /items/{id}`

### Add the route

```bash
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /items/{id}" \
  --target "integrations/$INTEGRATION_ID" \
  --region us-east-1 \
  --output json
```

### Update the handler

Add this block before the final 404 return in the handler:

```typescript
if (method === 'GET' && event.pathParameters?.id) {
  const item = items.find((item) => item.id === event.pathParameters!.id);

  if (!item) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Item not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  };
}
```

Rebuild, rezip, and update the function code:

```bash
cd lambda
npm run build
cd dist && zip -r ../function.zip . && cd ..

aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://lambda/function.zip \
  --region us-east-1 \
  --output json
```

Test:

```bash
curl https://$API_ID.execute-api.us-east-1.amazonaws.com/items/1
```

Expected:

```json
{ "id": "1", "name": "TypeScript in Action", "price": 29.99 }
```

```bash
curl https://$API_ID.execute-api.us-east-1.amazonaws.com/items/999
```

Expected:

```json
{ "error": "Item not found" }
```

## Cleanup

To remove everything you created in this exercise:

```bash
# Delete the API (removes all routes, integrations, and stages)
aws apigatewayv2 delete-api \
  --api-id $API_ID \
  --region us-east-1 \
  --output json

# Remove the Lambda permission
aws lambda remove-permission \
  --function-name my-frontend-app-api \
  --statement-id apigateway-invoke \
  --region us-east-1 \
  --output json
```

The Lambda function and execution role are not deleted — you will use them again in later modules.
