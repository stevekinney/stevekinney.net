---
title: Deploying and Testing a Lambda Function
description: >-
  Package, deploy, and test a Lambda function using the AWS CLI, including
  creating test events and reading invocation results.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - lambda
  - deployment
  - testing
---

You have a compiled TypeScript handler and an execution role with logging permissions. Now you need to get the code into Lambda and verify it works. The workflow is: compile TypeScript, zip the output, create the function (or update it), invoke it, and read the results. All of this happens through the CLI.

## Building the Deployment Package

Lambda expects a zip file containing your compiled JavaScript and any dependencies. Start by compiling your TypeScript and creating the zip:

```bash
cd lambda
npm run build
```

This produces `dist/handler.js` (and associated source maps). Now zip the contents of the `dist/` directory:

```bash
cd dist
zip -r ../function.zip .
cd ..
```

The zip file must contain your handler file at the root level — not nested inside a `dist/` folder. That's why you `cd` into `dist/` before zipping: Lambda looks for the handler at the path you specify (e.g., `handler.handler`), and if your file is at `dist/handler.js` inside the zip, Lambda won't find it.

> [!WARNING]
> If your function uses `node_modules` dependencies (beyond what the Lambda runtime provides), you need to include them in the zip. Copy `node_modules` into the `dist/` directory before zipping. For this lesson, the handler has no runtime dependencies — `@types/aws-lambda` is a dev dependency that's only used during compilation.

## Creating the Function

Use `aws lambda create-function` to deploy your function for the first time:

```bash
aws lambda create-function \
  --function-name my-frontend-app-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/my-frontend-app-lambda-role \
  --handler handler.handler \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

Let's unpack these flags:

- **`--function-name`**: The name of your function. This is how you reference it everywhere in AWS.
- **`--runtime`**: The language runtime. `nodejs20.x` gives you Node.js 20 with the AWS SDK v3 pre-installed.
- **`--role`**: The ARN of the execution role you created in [Lambda Execution Roles and Permissions](lambda-execution-roles-and-permissions.md).
- **`--handler`**: The path to your handler function in the format `<filename>.<export>`. Since your compiled file is `handler.js` and the exported function is `handler`, this is `handler.handler`. (Yes, `handler.handler` looks redundant. You get used to it.)
- **`--zip-file`**: The deployment package. The `fileb://` prefix tells the CLI to read the file as binary data.

The response confirms that the function was created:

```json
{
  "FunctionName": "my-frontend-app-api",
  "FunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:my-frontend-app-api",
  "Runtime": "nodejs20.x",
  "Role": "arn:aws:iam::123456789012:role/my-frontend-app-lambda-role",
  "Handler": "handler.handler",
  "CodeSize": 1234,
  "Timeout": 3,
  "MemorySize": 128,
  "State": "Active"
}
```

Notice the defaults: 3-second timeout and 128 MB of memory. These are fine for a simple API handler. You can change them later with `aws lambda update-function-configuration`.

## Invoking the Function

Now test it. The `aws lambda invoke` command calls your function directly, without going through API Gateway:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload '{"requestContext": {"http": {"method": "GET", "path": "/"}}, "queryStringParameters": {"name": "AWS"}}' \
  --region us-east-1 \
  --output json \
  response.json
```

This command does two things: it invokes the function and writes the function's return value to `response.json`. The terminal output shows metadata about the invocation:

```json
{
  "StatusCode": 200,
  "ExecutedVersion": "$LATEST"
}
```

The actual response from your handler is in `response.json`:

```bash
cat response.json
```

```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"greeting\":\"Hello, AWS!\",\"timestamp\":\"2026-03-18T12:00:00.000Z\"}"
}
```

Your function received the event, read the `name` query parameter, and returned a greeting. It works.

> [!TIP]
> The `--cli-binary-format raw-in-base64-out` flag is required when passing `--payload` with AWS CLI v2. Without it, the CLI tries to base64-encode your payload, which isn't what you want for JSON test events.

## Using Test Event Files

Typing JSON payloads on the command line gets unwieldy fast. Save your test event to a file instead:

```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/greeting"
    }
  },
  "queryStringParameters": {
    "name": "Frontend Engineer"
  },
  "headers": {
    "content-type": "application/json"
  }
}
```

Save this as `test-event.json` and invoke with:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-event.json \
  --region us-east-1 \
  --output json \
  response.json
```

Using `file://` (not `fileb://` — payloads are text, not binary) loads the event from a file. Keep a collection of test events in your project for different scenarios: missing parameters, POST requests, malformed JSON bodies.

## Updating the Function Code

You won't create a new function every time you change your code. After the initial `create-function`, use `update-function-code` to deploy changes:

```bash
cd lambda
npm run build
cd dist && zip -r ../function.zip . && cd ..

aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

This replaces the function's code while preserving all configuration (runtime, memory, timeout, environment variables, execution role). The update is atomic — Lambda serves the old code until the new code is ready, then switches over.

## Reading the Logs

Your function's `console.log` output goes to CloudWatch Logs. After invoking your function, you can pull the most recent logs with the CLI:

```bash
aws logs get-log-events \
  --log-group-name /aws/lambda/my-frontend-app-api \
  --log-stream-name "$(aws logs describe-log-streams \
    --log-group-name /aws/lambda/my-frontend-app-api \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --query 'logStreams[0].logStreamName' \
    --output text \
    --region us-east-1)" \
  --region us-east-1 \
  --output json
```

That nested command finds the most recent log stream and then fetches its events. The output includes your `console.log` messages, the start and end of each invocation, and the billed duration.

We'll cover CloudWatch in depth in Module 12. For now, this command is your debugging tool.

> [!TIP]
> You can also include `--log-type Tail` on your `aws lambda invoke` command. This returns the last 4 KB of log output as a base64-encoded string in the response, which you can decode with `base64 --decode`. It's quicker than querying CloudWatch for simple debugging.

## The Full Deployment Script

Here's the complete build-and-deploy workflow as a single script. You'll run some version of this every time you update your function:

```bash
# Build
cd lambda
npm run build

# Package
cd dist
zip -r ../function.zip .
cd ..

# Deploy (use create-function the first time, update-function-code after that)
aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json

# Test
aws lambda invoke \
  --function-name my-frontend-app-api \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-event.json \
  --region us-east-1 \
  --output json \
  response.json

cat response.json
```

This is the manual version. Later in the course, you'll automate this in a GitHub Actions workflow, just like you automated S3 deployments in Module 6.

## Common Mistakes

**Wrong handler path.** If you get "Runtime.HandlerNotFound" when invoking, your `--handler` value doesn't match the file and export name inside the zip. Double-check that `handler.js` is at the root of the zip (not in a subdirectory) and that the exported function is named `handler`.

**Zip contains the directory instead of the contents.** If you run `zip -r function.zip dist/`, the zip contains a `dist/` folder, and Lambda looks for `dist/handler.handler` instead of `handler.handler`. Always `cd` into the directory and zip the contents.

**Role not propagated.** If `create-function` fails with "The role defined for the function cannot be assumed by Lambda," wait 10-15 seconds and try again. IAM role propagation is eventually consistent.

Your function is deployed and you can invoke it directly. But direct invocation isn't how a frontend calls an API — you need an HTTP endpoint. Before we get to API Gateway in Module 8, there are two more Lambda topics to cover: environment variables (for configuration that shouldn't be hardcoded) and cold starts (the performance characteristic that matters most for API latency).
