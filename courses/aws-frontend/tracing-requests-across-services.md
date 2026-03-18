---
title: Tracing Requests Across Services
description: >-
  Trace a single request from API Gateway through Lambda to DynamoDB using
  correlation IDs, structured logs, and CloudWatch Logs Insights queries.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - cloudwatch
  - tracing
  - observability
---

An alarm tells you something is broken. Logs tell you what happened. But when a user reports "I clicked the button and nothing happened," you need to trace that single request from the moment it hit API Gateway, through your Lambda function, into DynamoDB, and back. That means connecting log entries across services into a single story.

This is the difference between monitoring and **observability**. Monitoring tells you "errors went up." Observability lets you ask "why did this specific request fail?" and follow the breadcrumbs to the answer.

## The Problem: Disconnected Logs

Right now, your application produces logs in multiple places:

- **API Gateway** logs the incoming HTTP request (method, path, status code, latency)
- **Lambda** logs whatever you write with `console.log` — and with structured logging from [CloudWatch Log Groups and Structured Logging](cloudwatch-log-groups-and-structured-logging.md), each entry includes fields like `level`, `message`, and `duration`
- **DynamoDB** publishes metrics (latency, consumed capacity) but does not produce per-request logs

The challenge: these logs live in separate log groups with no connection between them. API Gateway processed a request, Lambda ran a function, DynamoDB stored an item — but there is nothing linking those three events together. If the Lambda function failed, you cannot tell which API Gateway request triggered it or which DynamoDB operation it was attempting.

## Correlation IDs: The Connecting Thread

A **correlation ID** is a unique identifier that follows a request through every service it touches. API Gateway generates one for every incoming request — the `requestId` in the event object that Lambda receives. By including this ID in every log entry your Lambda function writes, you create a thread that ties everything together.

You saw this in the structured logging example from the previous lesson. Here is a more complete version that logs at every stage of the request lifecycle:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME ?? 'my-frontend-app-data';

interface LogEntry {
  level: string;
  message: string;
  requestId: string;
  [key: string]: unknown;
}

function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext?.requestId ?? crypto.randomUUID();
  // [!note The requestId from API Gateway becomes the correlation ID for this entire request.]
  const method = event.requestContext?.http?.method ?? 'UNKNOWN';
  const path = event.rawPath ?? '/';

  log({
    level: 'INFO',
    message: 'Request started',
    requestId,
    method,
    path,
    queryParams: event.queryStringParameters ?? {},
  });

  try {
    const itemId = event.queryStringParameters?.id;

    if (method === 'GET' && itemId) {
      const dynamoStart = Date.now();

      const result = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: itemId },
        }),
      );

      const dynamoDuration = Date.now() - dynamoStart;

      log({
        level: 'INFO',
        message: 'DynamoDB read completed',
        requestId,
        operation: 'GetItem',
        tableName: TABLE_NAME,
        itemId,
        found: !!result.Item,
        dynamoDuration,
      });

      return {
        statusCode: result.Item ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.Item ?? { error: 'Not found' }),
      };
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}');
      const newItem = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
      const dynamoStart = Date.now();

      await client.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: newItem,
        }),
      );

      const dynamoDuration = Date.now() - dynamoStart;

      log({
        level: 'INFO',
        message: 'DynamoDB write completed',
        requestId,
        operation: 'PutItem',
        tableName: TABLE_NAME,
        itemId: newItem.id,
        dynamoDuration,
      });

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
  } catch (error) {
    log({
      level: 'ERROR',
      message: 'Request failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

Every log entry includes the same `requestId`. A single request produces multiple log entries — "Request started," "DynamoDB read completed," and potentially "Request failed" — all linked by the correlation ID.

## Querying by Correlation ID

When you need to trace a specific request, you run a Logs Insights query that filters by `requestId`:

```
fields @timestamp, level, message, requestId, operation, dynamoDuration, error
| filter requestId = "abc-123-def-456"
| sort @timestamp asc
```

This returns every log entry for that request in chronological order. You can see:

1. When the request started
2. What method and path were used
3. Whether the DynamoDB operation succeeded
4. How long DynamoDB took
5. If and why the request failed

### Running the Query from the CLI

```bash
aws logs start-query \
  --log-group-name /aws/lambda/my-frontend-app-api \
  --start-time $(date -v-1H +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, level, message, requestId, operation, dynamoDuration, error | filter requestId = "abc-123-def-456" | sort @timestamp asc' \
  --region us-east-1 \
  --output json
```

Then fetch the results:

```bash
aws logs get-query-results \
  --query-id "your-query-id-here" \
  --region us-east-1 \
  --output json
```

## Common Tracing Queries

Beyond looking up a single request, Insights queries help you spot patterns.

### Find the Slowest DynamoDB Operations

```
fields @timestamp, requestId, operation, dynamoDuration, itemId
| filter dynamoDuration > 0
| sort dynamoDuration desc
| limit 20
```

This shows you which requests had the slowest database interactions. If you see `GetItem` operations taking 200+ ms consistently, you might have a hot partition key (revisit [DynamoDB Tables and Keys](dynamodb-tables-and-keys.md) for key design).

### Find All Failed Requests in the Last Hour

```
fields @timestamp, requestId, message, error
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

### Correlate Errors with Specific Operations

```
fields @timestamp, requestId, operation, error
| filter level = "ERROR" and operation = "PutItem"
| sort @timestamp desc
```

This shows you only the write failures — maybe your Lambda function has insufficient permissions to write to DynamoDB (check the execution role you set up in [Lambda Execution Roles and Permissions](lambda-execution-roles-and-permissions.md)).

### Calculate DynamoDB Latency Percentiles

```
filter message = "DynamoDB read completed"
| stats avg(dynamoDuration) as avgLatency,
        pct(dynamoDuration, 95) as p95Latency,
        pct(dynamoDuration, 99) as p99Latency
  by bin(5m)
```

This gives you a time-series view of your database read latency, broken into 5-minute buckets. If p99 is climbing over time, something is changing — maybe growing table size, maybe a shift in access patterns.

## Piecing Together the Full Request Path

Here is what a traced request looks like when you put it all together. A user calls your API, and you reconstruct the full path from logs:

**Step 1: API Gateway receives the request.** You can see this in the API Gateway access logs (if enabled) or infer it from the Lambda log's first entry. The `requestId` from API Gateway becomes your correlation ID.

**Step 2: Lambda starts executing.** Your first structured log entry fires: "Request started" with the `requestId`, method, path, and query parameters.

**Step 3: Lambda calls DynamoDB.** Your log entry captures the operation type, table name, and how long the call took.

**Step 4: Lambda returns a response.** If the request succeeded, the final log entry says "Request completed" with the status code and total duration. If it failed, the error entry captures the error message and stack trace.

A Logs Insights query that reconstructs this timeline:

```
fields @timestamp, level, message, operation, dynamoDuration, error
| filter requestId = "abc-123-def-456"
| sort @timestamp asc
```

The result might look like:

| @timestamp   | level | message                 | operation | dynamoDuration | error |
| ------------ | ----- | ----------------------- | --------- | -------------- | ----- |
| 14:30:00.100 | INFO  | Request started         |           |                |       |
| 14:30:00.145 | INFO  | DynamoDB read completed | GetItem   | 42             |       |
| 14:30:00.150 | INFO  | Request completed       |           |                |       |

Three log entries, 50 milliseconds total, 42 of which were spent in DynamoDB. If this request had failed, the "Request completed" entry would be replaced by a "Request failed" entry with an error message and stack trace.

## Beyond Manual Tracing

What you have built here — correlation IDs plus structured logging plus Insights queries — is the foundation of request tracing. AWS offers more sophisticated tracing through **X-Ray**, which automatically instruments SDK calls and produces visual service maps. X-Ray is beyond the scope of this course, but the structured logging patterns you have learned here work with or without it. Correlation IDs and structured logs are the minimum viable observability for any production application.

> [!TIP]
> If your frontend returns a request ID to the user (in a response header or error message), support incidents become dramatically easier. The user says "I got error abc-123," you run the Insights query, and you have the full trace in seconds.

## What is Next

You now have the complete monitoring stack: structured logs you can query, metrics dashboards you can glance at, alarms that tell you when things break, and correlation IDs that let you trace individual requests across services. In the exercise that follows, you will put the alarm skills to practice — creating error and duration alarms for your Lambda function, wiring them to SNS, and triggering them intentionally to verify the pipeline works end to end.
