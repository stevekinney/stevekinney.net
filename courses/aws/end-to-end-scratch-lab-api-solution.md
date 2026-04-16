---
title: 'Solution: End-to-End Scratch Lab API'
description: >-
  Complete working backend wiring API Gateway, Lambda, DynamoDB, and Secrets Manager into one request path for the Scratch Lab notepad app.
date: 2026-04-15
modified: 2026-04-16
tags:
  - aws
  - capstone
  - lambda
  - api-gateway
  - dynamodb
  - secrets-manager
  - exercise
  - solution
---

This is the complete solution for the [End-to-End Scratch Lab API exercise](end-to-end-scratch-lab-api-exercise.md). Every command is shown with its expected output.

## Why This Works

Every piece has one job. The DynamoDB table stores data. The Lambda handler routes requests and talks to the table. API Gateway accepts HTTP and forwards it to the Lambda. The execution role grants exactly the permissions the Lambda needs, and nothing more. The secret stores the third-party API key outside of both the code and the environment. That separation is what makes each service replaceable without tearing the rest apart.

## 1. Create the DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name scratch-lab-notes \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=noteId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=noteId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 \
  --output json

aws dynamodb wait table-exists \
  --table-name scratch-lab-notes \
  --region us-east-1
```

## 2. Store the Search API Key

Using Parameter Store as a `SecureString`:

```bash
aws ssm put-parameter \
  --name /scratch-lab/production/search-api-key \
  --value "sk_test_example_replace_me" \
  --type SecureString \
  --region us-east-1 \
  --output json
```

## 3. Execution Role Policy

Save as `scratch-lab-api-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/scratch-lab-notes"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/scratch-lab/production/search-api-key"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:123456789012:*"
    }
  ]
}
```

Attach it to the Lambda's execution role:

```bash
aws iam put-role-policy \
  --role-name scratch-lab-api-role \
  --policy-name scratch-lab-api-policy \
  --policy-document file://scratch-lab-api-policy.json
```

## 4. The Lambda Handler

`lambda/src/handler.ts`:

```typescript
import type { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const TABLE_NAME = 'scratch-lab-notes';
const SEARCH_API_KEY_PARAM = '/scratch-lab/production/search-api-key';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});

let searchApiKey: string | undefined;

const loadSearchApiKey = async (): Promise<string> => {
  if (searchApiKey) return searchApiKey;
  const response = await ssm.send(
    new GetParameterCommand({ Name: SEARCH_API_KEY_PARAM, WithDecryption: true }),
  );
  const value = response.Parameter?.Value;
  if (!value) throw new Error('search api key is empty');
  console.log('loaded search api key');
  searchApiKey = value;
  return value;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://example.com',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-notepad-user-id',
};

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders },
  body: JSON.stringify(body),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadSearchApiKey();

  const userId = event.headers['x-notepad-user-id'];
  if (!userId) return json(401, { error: 'missing x-notepad-user-id header' });

  const method = event.requestContext.http.method;
  const routeKey = event.routeKey;
  const noteId = event.pathParameters?.noteId;

  try {
    if (method === 'GET' && routeKey === 'GET /notes') {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'userId = :u',
          ExpressionAttributeValues: { ':u': userId },
        }),
      );
      return json(200, result.Items ?? []);
    }

    if (method === 'POST' && routeKey === 'POST /notes') {
      const body = event.body ? JSON.parse(event.body) : {};
      const now = new Date().toISOString();
      const note = {
        userId,
        noteId: body.id,
        title: body.title ?? '',
        body: body.body ?? '',
        createdAt: body.createdAt ?? now,
        updatedAt: body.updatedAt ?? now,
      };
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: note }));
      return json(201, {
        id: note.noteId,
        title: note.title,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
    }

    if (method === 'GET' && routeKey === 'GET /notes/{noteId}' && noteId) {
      const result = await ddb.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { userId, noteId } }),
      );
      if (!result.Item) return json(404, { error: 'note not found' });
      const item = result.Item;
      return json(200, {
        id: item.noteId,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }

    if (method === 'PUT' && routeKey === 'PUT /notes/{noteId}' && noteId) {
      const body = event.body ? JSON.parse(event.body) : {};
      const now = new Date().toISOString();
      const note = {
        userId,
        noteId,
        title: body.title ?? '',
        body: body.body ?? '',
        createdAt: body.createdAt ?? now,
        updatedAt: now,
      };
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: note }));
      return json(200, {
        id: note.noteId,
        title: note.title,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
    }

    if (method === 'DELETE' && routeKey === 'DELETE /notes/{noteId}' && noteId) {
      await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { userId, noteId } }));
      return json(204, {});
    }

    return json(404, { error: 'route not found' });
  } catch (error) {
    console.error('handler error', { error, awsRequestId: event.requestContext.requestId });
    return json(500, { error: 'internal server error' });
  }
};
```

Build, package, and deploy using the same `npm run build` + `zip` + `aws lambda update-function-code` pattern from [Deploying and Testing a Lambda Function](deploying-and-testing-a-lambda-function.md).

## 5. API Gateway Routes

Given an existing HTTP API with ID `abc123def4`:

```bash
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id abc123def4 \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:123456789012:function:scratch-lab-api \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query IntegrationId --output text)

for ROUTE in "GET /notes" "POST /notes" "GET /notes/{noteId}" "PUT /notes/{noteId}" "DELETE /notes/{noteId}"; do
  aws apigatewayv2 create-route \
    --api-id abc123def4 \
    --route-key "$ROUTE" \
    --target "integrations/$INTEGRATION_ID" \
    --region us-east-1 \
    --output json
done

aws lambda add-permission \
  --function-name scratch-lab-api \
  --statement-id scratch-lab-api-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123def4/*/*" \
  --region us-east-1
```

Enable CORS on the API:

```bash
aws apigatewayv2 update-api \
  --api-id abc123def4 \
  --cors-configuration "AllowOrigins=https://example.com,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=content-type,x-notepad-user-id" \
  --region us-east-1
```

## 6. Smoke Test

```bash
# Create
curl -sS -X POST https://api.example.com/notes \
  -H "content-type: application/json" \
  -H "x-notepad-user-id: user-123" \
  -d '{"id":"note-1","title":"First note","body":"Hello world","createdAt":"2026-04-16T12:00:00Z","updatedAt":"2026-04-16T12:00:00Z"}'

# Read all
curl -sS https://api.example.com/notes \
  -H "x-notepad-user-id: user-123"

# Update
curl -sS -X PUT https://api.example.com/notes/note-1 \
  -H "content-type: application/json" \
  -H "x-notepad-user-id: user-123" \
  -d '{"title":"Updated note","body":"New content","createdAt":"2026-04-16T12:00:00Z"}'

# Delete
curl -sS -X DELETE https://api.example.com/notes/note-1 \
  -H "x-notepad-user-id: user-123"
```

All four should return 2xx with the expected JSON.

## 7. Connect the Frontend

Clone Scratch Lab and point it at your API:

```bash
git clone https://github.com/stevekinney/scratch-lab.git
cd scratch-lab
npm install
VITE_API_URL=https://api.example.com npm run dev
```

Create a note in the browser. You should see the item appear in the DynamoDB console. Edit the note and verify `updatedAt` changes on the next GET.

## Summary of Resources Created

| Resource                | Identifier                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| DynamoDB table          | `scratch-lab-notes`                                                                                 |
| Parameter Store secret  | `/scratch-lab/production/search-api-key`                                                            |
| Lambda function         | `scratch-lab-api`                                                                                   |
| Execution role          | `scratch-lab-api-role` with `scratch-lab-api-policy` attached                                       |
| API Gateway integration | `AWS_PROXY` → `scratch-lab-api`                                                                     |
| API Gateway routes      | `GET /notes`, `POST /notes`, `GET /notes/{noteId}`, `PUT /notes/{noteId}`, `DELETE /notes/{noteId}` |

When you tear this down, follow the order in [Cleanup and Teardown](cleanup-and-teardown.md): routes before the integration, integration before the function, function before the role, table last.
