---
title: 'Exercise: End-to-End Scratch Lab API'
description: >-
  Wire API Gateway, Lambda, DynamoDB, and Parameter Store into one working backend for the Scratch Lab notepad app.
date: 2026-04-15
modified: 2026-04-16
tags:
  - aws
  - capstone
  - lambda
  - api-gateway
  - dynamodb
  - parameter-store
  - exercise
---

You've built all the pieces. Now build the backend they add up to.

This is the Part 2 capstone—the mirror of [Exercise: End-to-End Static Site Deployment](static-site-deployment-exercise.md) that closed out Part 1. By the end, the [Scratch Lab](https://github.com/stevekinney/scratch-lab) notepad app should be able to `fetch()` a real API on your own domain, that hits a real Lambda, that reads and writes a real DynamoDB table, using credentials fetched from Parameter Store (or Secrets Manager). Every layer you've learned about, stacked.

## Why It Matters

Each service on its own is a toy. Wired together they're a backend. The reason the course teaches Lambda, API Gateway, DynamoDB, and Secrets Manager separately is that the moving pieces are easier to reason about in isolation—but shipping software means putting them together and living with the rough edges at the seams. That's the skill this capstone builds.

![Diagram of the full backend request chain: browser calls Route 53, then API Gateway, then Lambda, which reads from DynamoDB and Parameter Store while writing to CloudWatch.](assets/backend-request-chain.svg)

## Your Task

Build a notes backend for [Scratch Lab](https://github.com/stevekinney/scratch-lab) that:

- Exposes five routes through API Gateway HTTP API:
  - `GET  /notes` → return every note for the authenticated user.
  - `POST /notes` → create a new note and return it.
  - `GET  /notes/{noteId}` → return a single note.
  - `PUT  /notes/{noteId}` → update a note and return it.
  - `DELETE /notes/{noteId}` → delete a note.
- Runs one Lambda function (`scratch-lab-api`) behind API Gateway, which handles all five routes by inspecting `event.requestContext.http`.
- Persists notes in a DynamoDB table (`scratch-lab-notes`) with a `userId` partition key and `noteId` sort key.
- Reads a third-party `SEARCH_API_KEY` from Parameter Store or Secrets Manager at Lambda cold-start and caches it in module scope.
- Returns CORS-correct responses so the Scratch Lab frontend (served from your CloudFront distribution in Part 1) can call the API from the browser.

Scratch Lab already has an API storage layer built in. Clone the repo, set the `VITE_API_URL` environment variable to your API Gateway endpoint, and the app will call your backend automatically. The frontend sends an `x-notepad-user-id` header on every request to identify the user.

## Prerequisites

You've completed Part 1 (static site on CloudFront) and all of the Part 2 lessons up to this point. You should already have:

- An S3 + CloudFront deployment from [Exercise: End-to-End Static Site Deployment](static-site-deployment-exercise.md).
- A working Lambda project from [Exercise: Build and Deploy a Lambda Function](lambda-function-exercise.md).
- An HTTP API from [Exercise: Build an API with API Gateway and Lambda](api-gateway-lambda-exercise.md).
- A DynamoDB table pattern from [Exercise: Build a Data API with DynamoDB](dynamodb-lambda-exercise.md).
- A secret stored and readable from [Exercise: Store and Retrieve a Secret in Lambda](secrets-in-lambda-exercise.md).

Nothing in this exercise introduces a service you haven't already used. The point is wiring, not discovery.

## Step-by-Step

### 1. Create the DynamoDB Table

Create `scratch-lab-notes` with:

- Partition key: `userId` (String)
- Sort key: `noteId` (String)
- Billing mode: on-demand

Revisit [Tables, Partition Keys, and Sort Keys](dynamodb-tables-and-keys.md) if the `aws dynamodb create-table` flag shape is foggy.

### 2. Store the Search API Key

Pick one of the two services you learned:

- **Parameter Store** as a `SecureString` at `/scratch-lab/production/search-api-key`, or
- **Secrets Manager** at `/scratch-lab/production/search-api-key`.

Use whichever you're more comfortable with. The lesson in [Parameter Store vs. Secrets Manager](parameter-store-vs-secrets-manager.md) is the decision tree.

### 3. Update the Lambda Execution Role

Your execution role needs:

- `dynamodb:GetItem`, `PutItem`, `DeleteItem`, `Query` on `scratch-lab-notes`.
- `ssm:GetParameter` (+ `kms:Decrypt` if you used `SecureString` with a customer-managed key) or `secretsmanager:GetSecretValue`, depending on which store you picked.
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (usually already present from the Lambda execution role basics).

Scope every resource ARN to the specific table, parameter, or secret. No `*`.

### 4. Write the Lambda Handler

Your handler must:

- Route based on `event.requestContext.http.method` and `event.requestContext.http.path`. A small `switch` over `${method} ${routeKey}` is plenty—you don't need a router framework.
- Parse the user's ID from the `x-notepad-user-id` header. Scratch Lab generates this automatically and sends it on every request.
- Use the DynamoDB Document Client (`@aws-sdk/lib-dynamodb`) so you don't have to marshal types by hand.
- Load the search API key once per cold start and cache it in a module-level variable. Do not re-fetch it on every invocation.
- Return CORS headers on every response (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).

One detail worth getting right: `GET /notes` must return a flat `Note[]` array, not an object wrapper like `{ notes: [...] }`. The Scratch Lab frontend calls `response.json()` and expects the array directly.

### 5. Wire API Gateway Routes

Create five routes on your existing HTTP API, each with `scratch-lab-api` as the Lambda integration target:

```text
GET    /notes
POST   /notes
GET    /notes/{noteId}
PUT    /notes/{noteId}
DELETE /notes/{noteId}
```

Enable CORS on the API with your CloudFront domain as the allowed origin. Make sure the allowed methods include `PUT` and the allowed headers include `x-notepad-user-id`. Deploy to your stage.

### 6. Add a Custom Domain (Optional but Realistic)

Point `api.example.com` at the API Gateway stage using the pattern from [Stages, Deployments, and Custom Domains](api-gateway-stages-and-custom-domains.md). This lets your frontend call `fetch('https://api.example.com/notes')` instead of an `*.execute-api.amazonaws.com` URL.

### 7. Call It From the Frontend

Clone [Scratch Lab](https://github.com/stevekinney/scratch-lab) and set the `VITE_API_URL` environment variable to your API Gateway endpoint:

```bash
VITE_API_URL=https://api.example.com npm run dev
```

The app switches from localStorage to the API backend automatically when `VITE_API_URL` is set. Create a note, edit it, and verify the round trip works end-to-end: browser → Route 53 → API Gateway → Lambda → DynamoDB → response → browser.

## Checkpoints

- [ ] `POST /notes` with a JSON body persists a new item you can see in the DynamoDB console.
- [ ] `GET /notes` returns every note for the `x-notepad-user-id` header value as a flat JSON array.
- [ ] `GET /notes/{noteId}` returns a single note or a 404.
- [ ] `PUT /notes/{noteId}` updates the note's `title`, `body`, and `updatedAt`, and a follow-up GET returns the new values.
- [ ] `DELETE /notes/{noteId}` removes the item and a follow-up GET returns 404.
- [ ] The Lambda logs a single "loaded search api key" message on cold start and none on warm invocations. (Prove the caching works.)
- [ ] The browser can call the API from your CloudFront origin without a CORS preflight error.
- [ ] Every IAM resource ARN on the execution role points at a specific table / parameter / secret, not `*`.

## Failure Diagnosis

- **`AccessDeniedException: User is not authorized to perform: dynamodb:...`** — the execution role is missing the DynamoDB permission or the resource ARN doesn't match the actual table ARN. Run `aws dynamodb describe-table --table-name scratch-lab-notes --query 'Table.TableArn'` and compare.
- **CORS error in the browser, Lambda never logs a hit** — the preflight `OPTIONS` request is failing at API Gateway, not at your Lambda. Fix CORS at the API level (route `OPTIONS` or enable CORS on the API), not in the handler.
- **Cold start takes 3+ seconds** — you're fetching the secret and connecting to DynamoDB inside the handler instead of at module scope. Move both into module-level `const`s.
- **`ValidationException` on DynamoDB writes** — you're passing native JS types to the low-level DynamoDB client instead of the Document Client. Switch to `@aws-sdk/lib-dynamodb`.

## Stretch Goals

- **Real auth.** Swap the `x-notepad-user-id` header for a JWT authorizer on API Gateway, using a token source you pre-mint. The [Authentication with API Gateway](api-gateway-authentication.md) lesson covers the shape.
- **Observability.** Add structured logs from [Log Groups, Log Streams, and Structured Logging](cloudwatch-log-groups-and-structured-logging.md) with the `awsRequestId` on every log line, then an alarm from [Alarms and Notifications with SNS](cloudwatch-alarms-and-sns.md) on 5xx rate.
- **Server-side search.** Scratch Lab's frontend already sends a `?search=` query parameter on `GET /notes`. Implement it in the Lambda handler by using a DynamoDB `Scan` with a `FilterExpression` that checks `contains(title, :q) OR contains(body, :q)`. This is fine at small scale—if it bothers you, that's exactly when you'd reach for OpenSearch.

When everything works, you have a real production-shaped backend on AWS—every service from Part 2 wired into one request path. That's the whole point of the course.
