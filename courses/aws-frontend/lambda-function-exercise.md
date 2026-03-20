---
title: 'Exercise: Build and Deploy a Lambda Function'
description: >-
  Write a TypeScript handler that returns a JSON greeting, create an execution
  role, deploy the function, invoke it, and read the logs.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - lambda
  - exercise
---

You are going to build and deploy a Lambda function from scratch — no console wizards, no frameworks, no abstractions. By the end of this exercise, you will have a TypeScript function running in AWS that you can invoke from the command line and whose logs you can read in CloudWatch.

This is the same workflow you will use for every Lambda function you deploy throughout the rest of the course. Get comfortable with it now.

## Why It Matters

On Vercel, deploying a serverless function means pushing code to Git and waiting for the platform to figure out the rest. On AWS, you own every step: writing the handler, creating the execution role, packaging the code, deploying it, and verifying it works. That sounds like more work — and it is — but it means you understand exactly what is running, with what permissions, and where to look when something breaks.

## Your Task

Build and deploy a Lambda function named `my-frontend-app-api` that:

- Accepts a GET request with an optional `name` query parameter
- Returns a JSON response with a greeting and a timestamp
- Runs with a properly scoped execution role (logging permissions only)
- Can be invoked from the CLI with a test event

Use the account ID `123456789012`, region `us-east-1`, and the `nodejs20.x` runtime.

## Step 1: Set Up the Project

Create the project structure:

```bash
mkdir -p lambda/src
cd lambda
npm init -y
npm install -D typescript @types/aws-lambda @types/node
```

Create `tsconfig.json` in the `lambda/` directory with a `commonjs` module target, `ES2022` target, strict mode enabled, and output going to `dist/`.

### Checkpoint

You have a `lambda/` directory with `package.json`, `tsconfig.json`, `node_modules/`, and an empty `src/` directory.

## Step 2: Write the Handler

Create `src/handler.ts` with a handler that:

1. Uses the `APIGatewayProxyHandlerV2` type from `@types/aws-lambda`
2. Reads the `name` query parameter from the event, defaulting to `"World"`
3. Returns a 200 response with `Content-Type: application/json`
4. The response body should be a JSON object with `greeting` (a string like `"Hello, World!"`) and `timestamp` (an ISO 8601 date string)

Add a build script to `package.json` that runs `tsc`, then build the project.

### Checkpoint

Running `npm run build` produces `dist/handler.js` with no TypeScript errors.

## Step 3: Create the Execution Role

Create a trust policy file (`trust-policy.json`) that allows the Lambda service (`lambda.amazonaws.com`) to assume the role.

Use the CLI to:

1. Create a role named `my-frontend-app-lambda-role` with that trust policy
2. Attach the `AWSLambdaBasicExecutionRole` managed policy to the role

Remember:

- The trust policy needs `sts:AssumeRole` as the action and `lambda.amazonaws.com` as the principal
- The managed policy ARN is `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
- You covered the relationship between roles, trust policies, and permission policies in [The IAM Mental Model](iam-mental-model.md) and [Writing Your First IAM Policy](writing-your-first-iam-policy.md)

### Checkpoint

`aws iam get-role --role-name my-frontend-app-lambda-role` returns the role with the correct trust policy. `aws iam list-attached-role-policies --role-name my-frontend-app-lambda-role` shows `AWSLambdaBasicExecutionRole`.

## Step 4: Package and Deploy

Create the deployment zip from the compiled output:

1. Navigate into the `dist/` directory
2. Zip the contents (not the directory itself)
3. Use `aws lambda create-function` with the function name, runtime, role ARN, handler path, and zip file

The handler path should be `handler.handler` — the first `handler` is the filename (without `.js`), the second is the exported function name.

### Checkpoint

`aws lambda get-function --function-name my-frontend-app-api --region us-east-1` returns the function configuration showing `nodejs20.x` as the runtime and your execution role's ARN.

## Step 5: Invoke the Function

Create a test event file (`test-event.json`) that simulates a GET request with the query parameter `name=Lambda`:

```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/greeting"
    }
  },
  "queryStringParameters": {
    "name": "Lambda"
  }
}
```

Invoke the function using the CLI and read the response file.

### Checkpoint

The response file contains a JSON object with `statusCode: 200` and a body that, when parsed, includes `greeting: "Hello, Lambda!"` and a valid `timestamp`.

## Step 6: Invoke Without a Name Parameter

Create a second test event with no `queryStringParameters` (or omit the field entirely) and invoke the function again.

### Checkpoint

The response includes `greeting: "Hello, World!"` — your default value works correctly.

## Step 7: Read the Logs

After invoking the function, check that logs are flowing to CloudWatch. Verify that the log group `/aws/lambda/my-frontend-app-api` exists:

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/my-frontend-app-api \
  --region us-east-1 \
  --output json
```

### Checkpoint

The log group exists and contains at least one log stream with events from your invocations.

## Checkpoints Summary

- [ ] `lambda/` project builds with `npm run build` and produces `dist/handler.js`
- [ ] `my-frontend-app-lambda-role` IAM role exists with the correct trust policy
- [ ] `AWSLambdaBasicExecutionRole` is attached to the role
- [ ] `my-frontend-app-api` function is deployed with `nodejs20.x` runtime
- [ ] Invoking with `name=Lambda` returns `"Hello, Lambda!"`
- [ ] Invoking without a name returns `"Hello, World!"`
- [ ] CloudWatch log group `/aws/lambda/my-frontend-app-api` exists and has log events

## Stretch Goals

- **Add an environment variable.** Set a `GREETING_PREFIX` environment variable (e.g., `"Howdy"`) and use it in your handler instead of hardcoding `"Hello"`. Verify the change by invoking the function and checking the response.

- **Check cold start duration.** Invoke the function with `--log-type Tail` and decode the base64 log output. Look for the `Init Duration` field. Invoke again and confirm the second invocation has no `Init Duration` — it was a warm start.

- **Measure deployment package size.** Check the size of `function.zip`. Try adding a dependency (like `lodash`) to see how the zip size changes. Then remove it — you do not need it, and keeping the bundle small matters for cold start performance.

When you are ready, check your work against the [Solution: Build and Deploy a Lambda Function](lambda-function-solution.md).
