---
title: 'Solution: End-to-End Summit Supply API'
description: >-
  Complete working backend wiring API Gateway, Lambda, DynamoDB, and Secrets Manager into one request path.
date: 2026-04-15
modified: 2026-04-15
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

This is the complete solution for the [End-to-End Summit Supply API exercise](end-to-end-summit-supply-api-exercise.md). Every command is shown with its expected output.

## Why This Works

Every piece has one job. The DynamoDB table stores data. The Lambda handler routes requests and talks to the table. API Gateway accepts HTTP and forwards it to the Lambda. The execution role grants exactly the permissions the Lambda needs, and nothing more. The secret stores the third-party API key outside of both the code and the environment. That separation is what makes each service replaceable without tearing the rest apart.

## 1. Create the DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name summit-supply-saved-lists \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=listId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=listId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 \
  --output json

aws dynamodb wait table-exists \
  --table-name summit-supply-saved-lists \
  --region us-east-1
```

## 2. Store the Search API Key

Using Parameter Store as a `SecureString`:

```bash
aws ssm put-parameter \
  --name /summit-supply/production/search-api-key \
  --value "sk_test_example_replace_me" \
  --type SecureString \
  --region us-east-1 \
  --output json
```

## 3. Execution Role Policy

Save as `summit-supply-api-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/summit-supply-saved-lists"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/summit-supply/production/search-api-key"
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
  --role-name summit-supply-api-role \
  --policy-name summit-supply-api-policy \
  --policy-document file://summit-supply-api-policy.json
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
import { randomUUID } from 'node:crypto';

const TABLE_NAME = 'summit-supply-saved-lists';
const SEARCH_API_KEY_PARAM = '/summit-supply/production/search-api-key';

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
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-summit-user-id',
};

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders },
  body: JSON.stringify(body),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadSearchApiKey();

  const userId = event.headers['x-summit-user-id'];
  if (!userId) return json(401, { error: 'missing x-summit-user-id header' });

  const method = event.requestContext.http.method;
  const routeKey = event.routeKey;
  const listId = event.pathParameters?.listId;

  try {
    if (method === 'GET' && routeKey === 'GET /lists') {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'userId = :u',
          ExpressionAttributeValues: { ':u': userId },
        }),
      );
      return json(200, { lists: result.Items ?? [] });
    }

    if (method === 'POST' && routeKey === 'POST /lists') {
      const body = event.body ? JSON.parse(event.body) : {};
      const list = {
        userId,
        listId: randomUUID(),
        name: body.name ?? 'Untitled',
        items: body.items ?? [],
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: list }));
      return json(201, list);
    }

    if (method === 'GET' && routeKey === 'GET /lists/{listId}' && listId) {
      const result = await ddb.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { userId, listId } }),
      );
      if (!result.Item) return json(404, { error: 'list not found' });
      return json(200, result.Item);
    }

    if (method === 'DELETE' && routeKey === 'DELETE /lists/{listId}' && listId) {
      await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { userId, listId } }));
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
  --integration-uri arn:aws:lambda:us-east-1:123456789012:function:summit-supply-api \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query IntegrationId --output text)

for ROUTE in "GET /lists" "POST /lists" "GET /lists/{listId}" "DELETE /lists/{listId}"; do
  aws apigatewayv2 create-route \
    --api-id abc123def4 \
    --route-key "$ROUTE" \
    --target "integrations/$INTEGRATION_ID" \
    --region us-east-1 \
    --output json
done

aws lambda add-permission \
  --function-name summit-supply-api \
  --statement-id summit-supply-api-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123def4/*/*" \
  --region us-east-1
```

Enable CORS on the API:

```bash
aws apigatewayv2 update-api \
  --api-id abc123def4 \
  --cors-configuration "AllowOrigins=https://example.com,AllowMethods=GET,POST,DELETE,OPTIONS,AllowHeaders=content-type,x-summit-user-id" \
  --region us-east-1
```

## 6. Smoke Test

```bash
# Create
curl -sS -X POST https://api.example.com/lists \
  -H "content-type: application/json" \
  -H "x-summit-user-id: user-123" \
  -d '{"name":"Summit pack","items":["rope","crampons"]}'

# Read all
curl -sS https://api.example.com/lists \
  -H "x-summit-user-id: user-123"

# Delete (use a listId from the POST response)
curl -sS -X DELETE https://api.example.com/lists/<listId> \
  -H "x-summit-user-id: user-123"
```

All three should return 2xx with the expected JSON.

## Summary of Resources Created

| Resource                | Identifier                                                                   |
| ----------------------- | ---------------------------------------------------------------------------- |
| DynamoDB table          | `summit-supply-saved-lists`                                                  |
| Parameter Store secret  | `/summit-supply/production/search-api-key`                                   |
| Lambda function         | `summit-supply-api`                                                          |
| Execution role          | `summit-supply-api-role` with `summit-supply-api-policy` attached            |
| API Gateway integration | `AWS_PROXY` → `summit-supply-api`                                            |
| API Gateway routes      | `GET /lists`, `POST /lists`, `GET /lists/{listId}`, `DELETE /lists/{listId}` |

When you tear this down, follow the order in [Cleanup and Teardown](cleanup-and-teardown.md): routes before the integration, integration before the function, function before the role, table last.
