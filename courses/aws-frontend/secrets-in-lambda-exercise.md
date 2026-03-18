---
title: 'Exercise: Store and Retrieve a Secret in Lambda'
description: >-
  Store an API key in Parameter Store as a SecureString, create a Lambda
  function that reads it at init time, and call it through API Gateway.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - secrets
  - exercise
---

You are going to store a secret in Parameter Store, write a Lambda function that reads it at startup, grant the function's execution role the right permissions, and verify the whole chain works through API Gateway.

This is the same workflow you would use in production to keep API keys out of your environment variables and source code.

## Why It Matters

On Vercel, secrets are environment variables — you set them in the dashboard and trust the platform. On AWS, you choose where secrets live and who can access them. That choice has consequences: a secret in a Lambda environment variable is visible to anyone who can describe the function. A secret in Parameter Store is encrypted with KMS, scoped by IAM, and audited in CloudTrail. This exercise makes that difference real.

## Your Task

1. Store a third-party API key in Parameter Store as a SecureString
2. Write a Lambda function that reads the secret at init time and uses it in responses
3. Grant the function's execution role permission to read the parameter and decrypt it
4. Invoke the function and verify it can access the secret
5. Call the function through API Gateway from a browser or `curl`

Use the account ID `123456789012`, region `us-east-1`, and the `nodejs20.x` runtime.

## Step 1: Store the Secret in Parameter Store

Create a SecureString parameter at the path `/my-frontend-app/production/third-party-api-key`. Use any value you want for the secret — something like `sk_test_exercise_abc123` is fine.

Use `aws ssm put-parameter` with:

- `--name` set to the full path
- `--value` set to your test API key
- `--type` set to `SecureString`
- `--region us-east-1`

After creating it, verify the parameter exists by retrieving it with `aws ssm get-parameter`. Make sure to include the flag that decrypts the value — without it, you will see ciphertext instead of your key.

### Checkpoint

`aws ssm get-parameter --name "/my-frontend-app/production/third-party-api-key" --with-decryption --region us-east-1 --output json` returns your parameter with the decrypted value.

## Step 2: Write the Lambda Handler

Create a Lambda project (or reuse the one from the [Lambda Function Exercise](lambda-function-exercise.md)) with the following dependencies:

```bash
npm install @aws-sdk/client-ssm
npm install -D typescript @types/aws-lambda @types/node
```

Write a handler in `src/handler.ts` that:

1. Imports `SSMClient` and `GetParameterCommand` from `@aws-sdk/client-ssm`
2. Creates the SSM client at module level
3. Declares a module-level variable for the cached API key
4. Defines an async `loadConfig` function that fetches the parameter (with decryption) and caches it — but skips the fetch if the value is already cached
5. Calls `loadConfig()` at the top of the handler
6. Returns a JSON response with a `message` and the first 7 characters of the API key (to prove the function can read it without exposing the full value)

Use the `APIGatewayProxyHandlerV2` type for the handler.

Build the project and verify it compiles without errors.

### Checkpoint

Running `npm run build` produces `dist/handler.js` with no TypeScript errors.

## Step 3: Update the Execution Role

Your Lambda execution role (`my-frontend-app-lambda-role`) needs two new permissions:

1. **`ssm:GetParameter`** on the specific parameter ARN. Remember: the ARN for a parameter named `/my-frontend-app/production/third-party-api-key` is `arn:aws:ssm:us-east-1:123456789012:parameter/my-frontend-app/production/third-party-api-key`. Note the path in the ARN does not double the leading slash.

2. **`kms:Decrypt`** on the AWS-managed SSM KMS key, so the function can decrypt the SecureString value.

Write a policy JSON file and attach it to the execution role using `aws iam put-role-policy` (inline policy) or `aws iam create-policy` followed by `aws iam attach-role-policy` (managed policy).

Verify the policy is attached by listing the role's policies.

### Checkpoint

The execution role has a policy that grants `ssm:GetParameter` on the specific parameter ARN and `kms:Decrypt` on the KMS key.

## Step 4: Deploy and Invoke

Package and deploy the Lambda function:

1. Build the TypeScript project
2. Zip the contents of the `dist/` directory (plus `node_modules/` — you need the `@aws-sdk/client-ssm` package in the deployment)
3. Create or update the Lambda function

> [!TIP]
> If you already have a function named `my-frontend-app-api` from a previous exercise, use `aws lambda update-function-code` instead of `create-function`. You can also create a new function with a different name like `my-frontend-app-secrets-demo`.

Invoke the function with a test event:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --payload '{"requestContext":{"http":{"method":"GET","path":"/secret"}},"queryStringParameters":{}}' \
  --cli-binary-format raw-in-base64-out \
  --region us-east-1 \
  --output json \
  response.json
```

Read the response file and verify the function returned the first 7 characters of your API key.

### Checkpoint

The response file contains a 200 status code and a body with a message confirming the secret was loaded. The key prefix matches the first 7 characters of the value you stored.

## Step 5: Test Through API Gateway

If you have an API Gateway HTTP API from [Connecting API Gateway to Lambda](connecting-api-gateway-to-lambda.md), add a route that points to this function — or invoke the existing endpoint if the function is already wired up.

If you do not have an API Gateway set up, you can test with the CLI invocation from Step 4. The API Gateway integration is a stretch goal.

### Checkpoint

A `curl` request to your API Gateway endpoint returns the JSON response with the secret loaded successfully.

## Step 6: Verify the Secret Is Not in Environment Variables

Run `get-function-configuration` and confirm the API key is **not** in the environment variables:

```bash
aws lambda get-function-configuration \
  --function-name my-frontend-app-api \
  --query 'Environment.Variables' \
  --region us-east-1 \
  --output json
```

The output should show your non-sensitive configuration (like `TABLE_NAME`) but not the API key. The API key lives in Parameter Store, accessible only through the SDK with proper IAM permissions.

### Checkpoint

The function's environment variables do not contain the API key. The key exists only in Parameter Store.

## Checkpoints Summary

- [ ] SecureString parameter exists at `/my-frontend-app/production/third-party-api-key`
- [ ] `aws ssm get-parameter` with `--with-decryption` returns the correct value
- [ ] Lambda handler compiles and reads the parameter using `SSMClient`
- [ ] Execution role has `ssm:GetParameter` and `kms:Decrypt` permissions
- [ ] Function invocation returns the first 7 characters of the API key
- [ ] The API key does **not** appear in the function's environment variables

## Stretch Goals

- **Fetch multiple parameters with `GetParametersByPath`.** Store a second parameter at `/my-frontend-app/production/api-endpoint` as a plain `String`. Modify the handler to use `GetParametersByPathCommand` to load all parameters under `/my-frontend-app/production/` in a single call. Verify both values appear in the response.

- **Add a cache TTL.** Modify the `loadConfig` function to re-fetch the parameter after 5 minutes instead of caching indefinitely. Test by updating the parameter value in Parameter Store and invoking the function after the TTL expires.

- **Try the Lambda extension.** Add the AWS Parameters and Secrets Lambda Extension layer to your function. Modify the handler to fetch the parameter via `http://localhost:2773` instead of the SDK. Compare the cold start duration with and without the extension.

When you are ready, check your work against the [Solution: Store and Retrieve a Secret in Lambda](secrets-in-lambda-solution.md).
