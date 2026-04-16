---
title: 'Solution: Build a Lambda-Backed Data API with DynamoDB'
description: >-
  Complete solution for the DynamoDB Lambda exercise, with all commands, handler
  code, and expected output.
date: 2026-03-18
modified: 2026-04-16
tags:
  - aws
  - dynamodb
  - exercise
  - solution
---

Here's the complete solution for every step, including the DynamoDB table creation, IAM policy, handler code, deployment commands, and expected output at each stage.

## Why This Works

- The table schema aligns with the access pattern in the handler: `userId` groups one user's items together and `itemId` uniquely identifies each record within that partition.
- The Lambda role is scoped to one table, so the API gets the exact data access it needs without turning into `dynamodb:*` on `*`.
- The POST, GET, and DELETE tests prove the whole request lifecycle, not just whether DynamoDB accepted a table definition.

> [!TIP]
> If you want AWS's version of the table and query behavior open while you work, keep the [`aws dynamodb create-table` command reference](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html), the [DynamoDB Query guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html), and the [DynamoDB Scan guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html) nearby.

## Create the DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name my-frontend-app-data \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=itemId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=itemId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "TableDescription": {
    "TableName": "my-frontend-app-data",
    "TableStatus": "CREATING",
    "KeySchema": [
      {
        "AttributeName": "userId",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "itemId",
        "KeyType": "RANGE"
      }
    ],
    "BillingModeSummary": {
      "BillingMode": "PAY_PER_REQUEST"
    },
    "TableArn": "arn:aws:dynamodb:us-east-1:123456789012:table/my-frontend-app-data"
  }
}
```

Wait for the table to become active:

```bash
aws dynamodb wait table-exists \
  --table-name my-frontend-app-data \
  --region us-east-1
```

Verify:

```bash
aws dynamodb describe-table \
  --table-name my-frontend-app-data \
  --region us-east-1 \
  --output json \
  --query "Table.TableStatus"
```

Expected output: `"ACTIVE"`

## Add DynamoDB Permissions to the Lambda Role

### `lambda-dynamodb-policy.json`

This policy is available as [`lambda-dynamodb.json`](https://github.com/stevekinney/scratch-lab/blob/main/policies/iam-policies/lambda-dynamodb.json) in the Scratch Lab repository.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDynamoDBAccess",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/my-frontend-app-data"
    }
  ]
}
```

### Create and attach the policy

```bash
aws iam create-policy \
  --policy-name MyFrontendAppLambdaDynamoDB \
  --policy-document file://lambda-dynamodb-policy.json \
  --region us-east-1 \
  --output json
```

```bash
aws iam attach-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-arn arn:aws:iam::123456789012:policy/MyFrontendAppLambdaDynamoDB \
  --region us-east-1 \
  --output json
```

### Verify

```bash
aws iam list-attached-role-policies \
  --role-name my-frontend-app-lambda-role \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "AttachedPolicies": [
    {
      "PolicyName": "AWSLambdaBasicExecutionRole",
      "PolicyArn": "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    },
    {
      "PolicyName": "MyFrontendAppLambdaDynamoDB",
      "PolicyArn": "arn:aws:iam::123456789012:policy/MyFrontendAppLambdaDynamoDB"
    }
  ]
}
```

## Install SDK and Update the Handler

```bash
cd lambda
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### `lambda/src/handler.ts`

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
// [!note The client is created outside the handler so it persists across warm invocations.]
const TABLE_NAME = process.env.TABLE_NAME ?? 'my-frontend-app-data';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return respond(400, { error: 'Missing userId parameter' });
  }

  try {
    switch (method) {
      case 'GET': {
        const itemId = event.queryStringParameters?.itemId;

        if (itemId) {
          const result = await client.send(
            new GetCommand({
              TableName: TABLE_NAME,
              Key: { userId, itemId },
            }),
          );

          if (!result.Item) {
            return respond(404, { error: 'Item not found' });
          }

          return respond(200, result.Item);
        }

        const result = await client.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId },
          }),
        );

        return respond(200, { items: result.Items ?? [] });
      }

      case 'POST': {
        const body = JSON.parse(event.body ?? '{}');

        if (!body.title) {
          return respond(400, { error: 'Missing title in request body' });
        }

        const itemId = crypto.randomUUID();

        const item = {
          userId,
          itemId,
          title: body.title,
          status: body.status ?? 'pending',
          createdAt: new Date().toISOString(),
        };

        await client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
          }),
        );

        return respond(201, item);
      }

      case 'DELETE': {
        const itemId = event.queryStringParameters?.itemId;

        if (!itemId) {
          return respond(400, { error: 'Missing itemId parameter' });
        }

        await client.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { userId, itemId },
          }),
        );

        return respond(200, { deleted: true });
      }

      default:
        return respond(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return respond(500, { error: 'Internal server error' });
  }
};

function respond(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
```

### Build

```bash
cd lambda
npm run build
```

Expected: `dist/handler.js` is created with no TypeScript errors.

## Set Environment Variable and Deploy

### Set the environment variable

```bash
aws lambda update-function-configuration \
  --function-name my-frontend-app-api \
  --environment 'Variables={TABLE_NAME=my-frontend-app-data}' \
  --region us-east-1 \
  --output json
```

### Package and deploy

```bash
cd lambda/dist
zip -r ../function.zip .
cd ..

aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

### Verify the environment variable

```bash
aws lambda get-function-configuration \
  --function-name my-frontend-app-api \
  --region us-east-1 \
  --output json \
  --query "Environment"
```

Expected output:

```json
{
  "Variables": {
    "TABLE_NAME": "my-frontend-app-data"
  }
}
```

## Test Creating an Item

Save as `test-create.json`:

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

Invoke:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-create.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected response (formatted):

```json
{
  "statusCode": 201,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"userId\":\"user-123\",\"itemId\":\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\",\"title\":\"Learn DynamoDB\",\"status\":\"pending\",\"createdAt\":\"2026-03-18T12:00:00.000Z\"}"
}
```

The `itemId` (a UUID) and `createdAt` values will differ based on when you run the command.

In the console, the same invocation using the **Test** tab shows the execution result with the 201 status code and the item's data.

![The Lambda Test tab showing the execution result as Succeeded with the response body showing a newly created DynamoDB item.](assets/lambda-dynamodb-invoke-success.png)

### Create a second item

Save as `test-create-2.json`:

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
  "body": "{\"title\": \"Deploy to production\"}"
}
```

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-create-2.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

## Test Listing Items

Save as `test-list.json`:

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

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-list.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected: `statusCode: 200` with a body containing an `items` array with both items.

When you parse the body:

```json
{
  "items": [
    {
      "userId": "user-123",
      "itemId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Learn DynamoDB",
      "status": "pending",
      "createdAt": "2026-03-18T12:00:00.000Z"
    },
    {
      "userId": "user-123",
      "itemId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Deploy to production",
      "status": "pending",
      "createdAt": "2026-03-18T12:00:01.000Z"
    }
  ]
}
```

## Test Deleting an Item

Use the `itemId` from the first created item. Save as `test-delete.json`:

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
    "itemId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

Replace `a1b2c3d4-e5f6-7890-abcd-ef1234567890` with the actual `itemId` from your POST response.

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-delete.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected: `statusCode: 200` with body `{"deleted":true}`.

### Verify the item is gone

Re-run the list test:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-list.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected: the `items` array now contains only one item—the "Deploy to production" item.

## Test Error Cases

### Missing userId

Save as `test-no-user.json`:

```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/"
    }
  },
  "queryStringParameters": {}
}
```

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-no-user.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected: `statusCode: 400` with body `{"error":"Missing userId parameter"}`.

### Unsupported method

Save as `test-put.json`:

```json
{
  "requestContext": {
    "http": {
      "method": "PUT",
      "path": "/"
    }
  },
  "queryStringParameters": {
    "userId": "user-123"
  }
}
```

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-put.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

Expected: `statusCode: 405` with body `{"error":"Method not allowed"}`.

## Stretch Goal: Update Endpoint

To handle PATCH requests for updating the status, add this case to the switch statement:

```typescript
case 'PATCH': {
  const itemId = event.queryStringParameters?.itemId;
  const body = JSON.parse(event.body ?? '{}');

  if (!itemId) {
    return respond(400, { error: 'Missing itemId parameter' });
  }

  if (!body.status) {
    return respond(400, { error: 'Missing status in request body' });
  }

  const result = await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, itemId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': body.status,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  return respond(200, result.Attributes ?? {});
}
```

You'll also need to add `UpdateCommand` to your imports from `@aws-sdk/lib-dynamodb` and update your IAM policy to include `dynamodb:UpdateItem`.

Save an updated policy document as `lambda-dynamodb-policy-v2.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/my-frontend-app-data"
    }
  ]
}
```

Create a new policy version (IAM managed policies support up to 5 versions):

```bash
aws iam create-policy-version \
  --policy-arn arn:aws:iam::123456789012:policy/MyFrontendAppLambdaDynamoDB \
  --policy-document file://lambda-dynamodb-policy-v2.json \
  --set-as-default \
  --region us-east-1 \
  --output json
```

If you used an inline policy (`aws iam put-role-policy`) instead of a managed policy, update it with the same command and new document:

```bash
aws iam put-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-name MyFrontendAppLambdaDynamoDB \
  --policy-document file://lambda-dynamodb-policy-v2.json \
  --region us-east-1 \
  --output json
```

## Cleanup

If you want to delete the table after testing:

```bash
aws dynamodb delete-table \
  --table-name my-frontend-app-data \
  --region us-east-1 \
  --output json
```

> [!WARNING]
> Deleting a DynamoDB table is permanent and deletes all data in the table. Only run this if you're done with the exercise and don't need the data.
