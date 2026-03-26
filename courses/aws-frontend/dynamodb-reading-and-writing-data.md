---
title: Reading and Writing Data in DynamoDB
description: >-
  Perform basic CRUD operations on DynamoDB items using the AWS SDK v3 with
  PutItem, GetItem, UpdateItem, and DeleteItem from TypeScript.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - dynamodb
  - sdk
  - typescript
---

You have a DynamoDB table. Now you need to put data in it and get data out. DynamoDB exposes four core operations for working with individual items: **PutItem** (create or replace), **GetItem** (read by key), **UpdateItem** (partial update), and **DeleteItem** (remove). These map directly to the CRUD operations you've built a hundred times in frontend applications.

The AWS SDK v3 provides two ways to call these operations. The low-level `DynamoDBClient` requires you to describe your data using DynamoDB's type descriptor format — wrapping every string in `{ S: "value" }` and every number in `{ N: "123" }`. The high-level `DynamoDBDocumentClient` handles that marshalling for you, so you work with plain JavaScript objects. Use the document client. Always.

## Setting Up the Document Client

Install the SDK packages in your Lambda project:

```bash
cd lambda
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Create the client at the top level of your handler file. Code outside the handler function runs during the init phase and is reused across warm invocations — you don't want to create a new client on every request.

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
// [!note Creating the client outside the handler means it persists across warm invocations.]
```

The empty `{}` passed to `DynamoDBClient` means "use the default configuration" — the region from the Lambda execution environment and the credentials from the execution role. You don't need to hardcode a region or pass access keys.

## PutItem: Create or Replace an Item

`PutCommand` writes an item to the table. If an item with the same primary key already exists, it's replaced entirely.

```typescript
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME ?? 'my-frontend-app-data';

async function createItem(userId: string, itemId: string, title: string) {
  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        itemId,
        title,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    }),
  );
}
```

Notice that you pass a plain JavaScript object as `Item`. The document client handles converting this to DynamoDB's internal format. You don't need `{ S: "user-123" }` — you just write `"user-123"`.

> [!WARNING]
> `PutCommand` replaces the entire item if an item with the same key exists. If you only want to update specific attributes without touching others, use `UpdateCommand` instead. This is a common source of data loss — you fetch an item, modify one field, PutItem the whole thing, and accidentally overwrite changes another request made between your read and your write.

## GetItem: Read by Key

`GetCommand` retrieves a single item by its complete primary key. For a composite key table, you must provide both the partition key and the sort key.

```typescript
import { GetCommand } from '@aws-sdk/lib-dynamodb';

async function getItem(userId: string, itemId: string) {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        itemId,
      },
    }),
  );

  return result.Item;
  // [!note result.Item is undefined if no item matches the key — not an error, just undefined.]
}
```

`GetItem` is fast and cheap — it reads a single item by its primary key with predictable latency regardless of table size. This is DynamoDB's sweet spot, and honestly, it's the operation I use most.

If the item doesn't exist, `result.Item` is `undefined`. DynamoDB doesn't throw an error for a missing item — you need to check for `undefined` yourself.

## UpdateItem: Partial Updates

`UpdateCommand` modifies specific attributes on an existing item without replacing the entire thing. It uses **update expressions** — a mini-language for describing the changes you want to make.

```typescript
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

async function updateItemStatus(userId: string, itemId: string, status: string) {
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        itemId,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );

  return result.Attributes;
  // [!note ReturnValues: 'ALL_NEW' returns the full item after the update.]
}
```

This is more verbose than PutItem, but let's walk through it:

- **`UpdateExpression`**: Describes what to change. `SET` assigns values. You can also use `REMOVE` to delete attributes, `ADD` to increment numbers, and `DELETE` to remove elements from sets.
- **`ExpressionAttributeNames`**: Maps placeholder names (prefixed with `#`) to actual attribute names. You need this for `status` because it's a reserved word in DynamoDB.
- **`ExpressionAttributeValues`**: Maps placeholder values (prefixed with `:`) to the values you want to set.
- **`ReturnValues`**: Controls what comes back. `ALL_NEW` returns the entire item after the update. Other options include `NONE` (the default), `ALL_OLD`, `UPDATED_OLD`, and `UPDATED_NEW`.

> [!TIP]
> DynamoDB has over 500 reserved words — including common ones like `status`, `name`, `data`, `type`, and `count`. If you get a `ValidationException` about reserved words, wrap the attribute name in `ExpressionAttributeNames`. A safe habit: always use `#` placeholders for attribute names in expressions.

## DeleteItem: Remove an Item

`DeleteCommand` removes an item by its primary key.

```typescript
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

async function deleteItem(userId: string, itemId: string) {
  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        userId,
        itemId,
      },
    }),
  );
}
```

If the item doesn't exist, `DeleteCommand` succeeds silently. No error, no exception. This is usually what you want — deleting something that's already gone isn't a problem.

## Putting It All Together in a Handler

Here's a complete handler that uses all four operations, routed by HTTP method:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME ?? 'my-frontend-app-data';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const userId = event.queryStringParameters?.userId;
  const itemId = event.queryStringParameters?.itemId;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId parameter' }),
    };
  }

  try {
    switch (method) {
      case 'GET': {
        if (!itemId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Missing itemId parameter' }),
          };
        }

        const result = await client.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId, itemId },
          }),
        );

        if (!result.Item) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Item not found' }),
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.Item),
        };
      }

      case 'POST': {
        const body = JSON.parse(event.body ?? '{}');
        const newItemId = `item-${Date.now()}`;

        await client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              userId,
              itemId: newItemId,
              title: body.title ?? 'Untitled',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          }),
        );

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, itemId: newItemId }),
        };
      }

      case 'DELETE': {
        if (!itemId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Missing itemId parameter' }),
          };
        }

        await client.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { userId, itemId },
          }),
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleted: true }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('DynamoDB error:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

This handler pattern — parse the method, validate parameters, call DynamoDB, return a response — is the same pattern you'll use for every Lambda-backed API endpoint.

## Common Mistakes

**Forgetting the sort key in GetItem or DeleteItem.** If your table has a composite key, you must provide both the partition key and the sort key. Providing only the partition key returns a `ValidationException`, not a list of matching items. To get multiple items by partition key, use Query (covered in the next lesson).

**Not handling `undefined` from GetItem.** DynamoDB doesn't throw when an item is missing — it returns `undefined`. If your frontend receives a 200 response with no data and you didn't check for this, you'll spend an hour debugging what looks like a serialization bug.

**Installing the SDK as a production dependency.** Lambda's Node.js runtime includes the AWS SDK v3 already. You can install `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` as dev dependencies for type checking during development, but they don't need to be in your deployment package. That said, bundling your own copy ensures version consistency — the tradeoff is a slightly larger deployment zip.

Now that you can read and write individual items, the next step is retrieving multiple items at once using Query and Scan — and why you should almost always prefer Query.
