---
title: Accessing Secrets from Lambda
description: >-
  Retrieve secrets and parameters from a Lambda function at runtime using the
  AWS SDK, with proper IAM permissions and caching strategies.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - lambda
  - secrets
  - sdk
---

You know how to store secrets in Parameter Store and Secrets Manager. Now you need to read them from a Lambda function. The pattern is straightforward: make an SDK call during initialization, cache the result in a module-level variable, and reuse it across invocations. This is the same init-time pattern you used for environment variables in [Lambda Environment Variables](lambda-environment-variables.md) — the difference is that the value comes from an API call instead of `process.env`.

## Reading from Parameter Store

Install the SSM client package in your Lambda project:

```bash
npm install @aws-sdk/client-ssm
```

Here is a Lambda function that reads an API key from Parameter Store at init time:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});

let apiKey: string | undefined;

const loadConfig = async () => {
  if (apiKey) return;

  const response = await ssm.send(
    new GetParameterCommand({
      Name: '/my-frontend-app/production/api-key',
      WithDecryption: true,
    }),
  );
  // [!note WithDecryption: true is required for SecureString parameters. Without it, you get encrypted ciphertext.]

  apiKey = response.Parameter?.Value;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadConfig();

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load API key' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Configuration loaded', keyPrefix: apiKey.slice(0, 4) }),
  };
};
```

The `loadConfig` function runs on the first invocation. On subsequent warm invocations, `apiKey` is already set and the SDK call is skipped. This means you make one API call per cold start, not one per request.

## Reading from Secrets Manager

Install the Secrets Manager client package:

```bash
npm install @aws-sdk/client-secrets-manager
```

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({});

let stripeConfig: { apiKey: string; webhookSecret: string } | undefined;

const loadSecrets = async () => {
  if (stripeConfig) return;

  const response = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: '/my-frontend-app/production/stripe-key',
    }),
  );

  if (!response.SecretString) {
    throw new Error('Secret value is empty');
  }

  stripeConfig = JSON.parse(response.SecretString);
  // [!note Secrets Manager returns the decrypted value automatically. No WithDecryption flag needed.]
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadSecrets();

  if (!stripeConfig) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load Stripe configuration' }),
    };
  }

  // Use stripeConfig.apiKey and stripeConfig.webhookSecret in your business logic
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Stripe configuration loaded' }),
  };
};
```

## IAM Permissions

Your Lambda function's execution role needs permission to read the specific parameters or secrets it uses. Recall from [Lambda Execution Roles and Permissions](lambda-execution-roles-and-permissions.md) that the execution role controls what AWS services the function can access.

### For Parameter Store

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/my-frontend-app/production/*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/aws/ssm"
    }
  ]
}
```

The first statement grants access to all parameters under the `/my-frontend-app/production/` path. The second statement grants permission to decrypt SecureString parameters using the AWS-managed KMS key. If you used a customer-managed KMS key, replace the resource ARN with your key's ARN.

> [!WARNING]
> The parameter ARN in IAM policies does **not** include a leading slash before the parameter name. The parameter name `/my-frontend-app/production/api-key` has the ARN `arn:aws:ssm:us-east-1:123456789012:parameter/my-frontend-app/production/api-key` — note the single slash between `parameter` and `my-frontend-app`. This trips people up because the parameter name starts with `/` but the ARN path does not double it.

### For Secrets Manager

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/my-frontend-app/production/*"
    }
  ]
}
```

Secrets Manager handles decryption internally when you call `GetSecretValue`, so you do not need a separate `kms:Decrypt` permission — unless you used a customer-managed KMS key. In that case, add a `kms:Decrypt` statement for that key.

### Attaching the Policy

Attach these permissions to your Lambda execution role using an inline policy:

```bash
aws iam put-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-name parameter-store-access \
  --policy-document file://parameter-store-policy.json \
  --output json
```

Or create a managed policy and attach it — the approach you learned in [Writing Your First IAM Policy](writing-your-first-iam-policy.md). Either way, the principle of least privilege applies: grant access to the specific parameters your function needs, not to all parameters in your account.

## Caching Strategies

The init-time fetch pattern shown above works well for secrets that do not change while the function is running. But if you use Secrets Manager's automatic rotation, a secret could change while your Lambda execution environment is still warm. The cached value becomes stale.

Here is a caching pattern with a time-to-live (TTL):

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});

let cachedValue: string | undefined;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getParameter = async (name: string): Promise<string> => {
  const now = Date.now();

  if (cachedValue && now < cacheExpiry) {
    return cachedValue;
  }

  const response = await ssm.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  );

  if (!response.Parameter?.Value) {
    throw new Error(`Parameter ${name} not found`);
  }

  cachedValue = response.Parameter.Value;
  cacheExpiry = now + CACHE_TTL_MS;
  // [!note After 5 minutes, the next invocation re-fetches the parameter. This keeps the cache fresh without calling the API on every request.]

  return cachedValue;
};
```

A 5-minute TTL means your function re-fetches the secret at most once every 5 minutes per execution environment. For most applications, this is a good balance between freshness and API call cost.

## The AWS Parameters and Secrets Lambda Extension

AWS provides a Lambda extension that handles caching for you. Instead of making SDK calls from your code, you add a Lambda layer that runs a local HTTP cache. Your function retrieves parameters by calling `localhost:2773` instead of the SSM or Secrets Manager API.

Add the extension layer to your function:

```bash
aws lambda update-function-configuration \
  --function-name my-frontend-app-api \
  --layers "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:12" \
  --region us-east-1 \
  --output json
```

<!-- VERIFY: Layer ARN version number (12) may have been updated. Check https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html for the latest version in us-east-1. -->

Then retrieve parameters via HTTP:

```typescript
const getParameterFromExtension = async (name: string): Promise<string> => {
  const response = await fetch(
    `http://localhost:2773/systemsmanager/parameters/get?name=${encodeURIComponent(name)}&withDecryption=true`,
    {
      headers: {
        'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN ?? '',
      },
    },
  );

  const data = await response.json();
  return data.Parameter.Value;
};
```

For Secrets Manager:

```typescript
const getSecretFromExtension = async (secretId: string): Promise<string> => {
  const response = await fetch(
    `http://localhost:2773/secretsmanager/get?secretId=${encodeURIComponent(secretId)}`,
    {
      headers: {
        'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN ?? '',
      },
    },
  );

  const data = await response.json();
  return data.SecretString;
};
```

The extension caches values with a configurable TTL (default 300 seconds). You control the TTL with the `SSM_PARAMETER_STORE_TTL` and `SECRETS_MANAGER_TTL` environment variables on the function.

> [!TIP]
> The extension approach trades SDK dependencies for HTTP calls. It is useful when you want caching without writing cache logic, or when you want to keep your deployment package small by not bundling the SSM or Secrets Manager SDK packages. For simple use cases with a few secrets, the direct SDK approach is perfectly fine.

## Putting It All Together

Here is a complete Lambda function that reads a DynamoDB table name from an environment variable (non-sensitive, does not change), an API key from Parameter Store (sensitive, rarely changes), and uses both:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
const tableName = process.env.TABLE_NAME;

let apiKey: string | undefined;

const loadSecrets = async () => {
  if (apiKey) return;

  const response = await ssm.send(
    new GetParameterCommand({
      Name: '/my-frontend-app/production/api-key',
      WithDecryption: true,
    }),
  );

  apiKey = response.Parameter?.Value;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadSecrets();

  if (!tableName || !apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing configuration' }),
    };
  }

  // Use tableName for DynamoDB operations, apiKey for third-party API calls
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'All configuration loaded',
      table: tableName,
    }),
  };
};
```

This pattern — environment variables for non-sensitive config, Parameter Store or Secrets Manager for sensitive values, init-time caching for both — is the standard approach for Lambda functions in production.

## What Is Next

You have two services that solve similar problems. The next lesson provides a direct comparison between Parameter Store and Secrets Manager to help you decide which one to reach for in different scenarios.
