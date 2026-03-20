---
title: 'Exercise: Build a Lambda-Backed Data API with DynamoDB'
description: >-
  Create a DynamoDB table, write a Lambda handler for GET, POST, and DELETE
  operations, wire it through API Gateway, and call it from the frontend.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - dynamodb
  - exercise
---

You are going to build a complete data API backed by DynamoDB. By the end of this exercise, you will have a working endpoint that your frontend can call to create, list, and delete items — with data persisted in a DynamoDB table and served through the same Lambda and API Gateway infrastructure you set up in Modules 7 and 8.

This is the exercise where "static site" becomes "full-stack application."

## Why It Matters

On Vercel or Netlify, you might use a hosted database like PlanetScale or Supabase and call it from a serverless function. On AWS, you are building the equivalent — but you own every piece. The table, the function, the HTTP layer, the permissions. When something breaks, you know exactly where to look. When something costs money, you know exactly why.

## Your Task

Build a data API that:

- Stores items in a DynamoDB table named `my-frontend-app-data`
- Supports GET (list items for a user), POST (create an item), and DELETE (remove an item)
- Runs as a Lambda function with the correct DynamoDB permissions
- Returns proper HTTP status codes and JSON responses

Use account ID `123456789012`, region `us-east-1`, and the table/role names from the course conventions.

## Step 1: Create the DynamoDB Table

Create the `my-frontend-app-data` table with:

- A **partition key** named `userId` (string)
- A **sort key** named `itemId` (string)
- **On-demand billing** (`PAY_PER_REQUEST`)

Use the CLI to create the table and wait for it to become active.

### Checkpoint

Running `aws dynamodb describe-table --table-name my-frontend-app-data --region us-east-1 --output json --query "Table.TableStatus"` returns `"ACTIVE"`.

## Step 2: Add DynamoDB Permissions to the Lambda Role

Your Lambda execution role (`my-frontend-app-lambda-role`) currently only has logging permissions. Create and attach a policy that grants:

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`

Scope the policy to the specific table ARN: `arn:aws:dynamodb:us-east-1:123456789012:table/my-frontend-app-data`.

Remember the principle of least privilege from [Principle of Least Privilege](principle-of-least-privilege.md) — do not grant `dynamodb:*` or use `*` as the resource.

### Checkpoint

`aws iam list-attached-role-policies --role-name my-frontend-app-lambda-role --region us-east-1 --output json` shows both `AWSLambdaBasicExecutionRole` and your new DynamoDB policy.

## Step 3: Install the SDK and Update the Handler

Add the DynamoDB SDK packages to your Lambda project:

```bash
cd lambda
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Update `src/handler.ts` to:

1. Create a `DynamoDBDocumentClient` at the top level (outside the handler function)
2. Read the table name from `process.env.TABLE_NAME`, falling back to `my-frontend-app-data`
3. Handle three HTTP methods:
   - **GET**: If `itemId` is provided, return that single item (404 if not found). If no `itemId`, query all items for the given `userId`.
   - **POST**: Parse the request body for a `title`, generate an `itemId`, and write the item to DynamoDB. Return the created item with a 201 status.
   - **DELETE**: Delete the item identified by `userId` and `itemId`. Return `{ "deleted": true }`.
4. Return 400 for missing required parameters
5. Return 405 for unsupported HTTP methods
6. Catch errors and return 500 with a generic error message

Build the project and verify it compiles without errors.

### Checkpoint

`npm run build` completes with no TypeScript errors. `dist/handler.js` exists.

## Step 4: Set the Environment Variable and Deploy

Set the `TABLE_NAME` environment variable on your Lambda function:

```bash
aws lambda update-function-configuration \
  --function-name my-frontend-app-api \
  --environment 'Variables={TABLE_NAME=my-frontend-app-data}' \
  --region us-east-1 \
  --output json
```

Package and deploy the updated handler code.

### Checkpoint

`aws lambda get-function-configuration --function-name my-frontend-app-api --region us-east-1 --output json --query "Environment"` shows `TABLE_NAME` set to `my-frontend-app-data`.

## Step 5: Test Creating an Item

Invoke the function with a POST event:

```json
{
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/"
    }
  },
  "queryStringParameters": {
    "userId": "user-123"
  },
  "body": "{\"title\": \"Learn DynamoDB\"}"
}
```

Save this as `test-create.json` and invoke the function. Check the response.

### Checkpoint

The response has `statusCode: 201` and the body includes `userId`, `itemId`, `title`, `status`, and `createdAt`.

## Step 6: Test Listing Items

Create a second item with a different title (use the same `userId`), then invoke with a GET event that only includes `userId` — no `itemId`:

```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/"
    }
  },
  "queryStringParameters": {
    "userId": "user-123"
  }
}
```

### Checkpoint

The response has `statusCode: 200` and the body includes an `items` array with both items you created.

## Step 7: Test Deleting an Item

Use the `itemId` from one of the items you created. Invoke with a DELETE event:

```json
{
  "requestContext": {
    "http": {
      "method": "DELETE",
      "path": "/"
    }
  },
  "queryStringParameters": {
    "userId": "user-123",
    "itemId": "item-1234567890"
  }
}
```

Replace `item-1234567890` with the actual `itemId` from Step 5 or 6. Then list items again with a GET to confirm the item is gone.

### Checkpoint

The DELETE response has `statusCode: 200` and `{ "deleted": true }`. A subsequent GET for the same user shows only one item.

## Step 8: Test Error Cases

Invoke the function with a missing `userId` parameter and confirm you get a 400 response. Invoke with an unsupported method (like PUT) and confirm you get a 405.

### Checkpoint

Missing `userId` returns `statusCode: 400`. Unsupported method returns `statusCode: 405`.

## Checkpoints Summary

- [ ] DynamoDB table `my-frontend-app-data` exists and is `ACTIVE`
- [ ] Lambda role has both `AWSLambdaBasicExecutionRole` and a DynamoDB policy attached
- [ ] Handler compiles without errors
- [ ] `TABLE_NAME` environment variable is set on the Lambda function
- [ ] POST creates an item and returns 201
- [ ] GET lists all items for a user
- [ ] DELETE removes an item
- [ ] Missing parameters return 400
- [ ] Unsupported methods return 405

## Stretch Goals

- **Wire it through API Gateway.** If you completed the API Gateway exercise in Module 8, connect your function to an HTTP API route and call it from `curl` or the browser instead of using `aws lambda invoke`.

- **Add an update endpoint.** Handle PATCH requests that update the `status` field of an existing item using `UpdateCommand` with an `UpdateExpression`. Return the updated item with `ReturnValues: 'ALL_NEW'`.

- **Add pagination.** Modify the GET handler to accept a `limit` query parameter and return a `nextCursor` value. The client can pass the cursor back to get the next page of results.

When you are ready, check your work against the [Solution: Build a Lambda-Backed Data API with DynamoDB](dynamodb-lambda-solution.md).
