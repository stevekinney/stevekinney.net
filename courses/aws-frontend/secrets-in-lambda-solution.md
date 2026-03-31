---
title: 'Solution: Store and Retrieve a Secret in Lambda'
description: >-
  Complete solution for storing an API key in Parameter Store and reading it
  from a Lambda function at runtime.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - secrets
  - exercise
  - solution
---

This is the complete solution for the [Exercise: Store and Retrieve a Secret in Lambda](secrets-in-lambda-exercise.md). If you got stuck, don't worry — there are a few gotchas in here that trip everyone up the first time.

## Why This Works

- Parameter Store becomes the source of truth for the secret, which removes the value from source control and from Lambda configuration.
- The function loads the secret at initialization time, so you pay the lookup cost once per warm environment instead of on every invocation.
- The final configuration check matters because a secret is not truly moved until it disappears from environment variables and deployment settings.

## Store the Secret

```bash
aws ssm put-parameter \
  --name "/my-frontend-app/production/third-party-api-key" \
  --value "sk_test_exercise_abc123" \
  --type "SecureString" \
  --region us-east-1 \
  --output json
```

Verify it:

```bash
aws ssm get-parameter \
  --name "/my-frontend-app/production/third-party-api-key" \
  --with-decryption \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "Parameter": {
    "Name": "/my-frontend-app/production/third-party-api-key",
    "Type": "SecureString",
    "Value": "sk_test_exercise_abc123",
    "Version": 1,
    "LastModifiedDate": "2026-03-18T10:00:00.000Z",
    "ARN": "arn:aws:ssm:us-east-1:123456789012:parameter/my-frontend-app/production/third-party-api-key"
  }
}
```

## Write the Handler

Project setup:

```bash
mkdir -p lambda/src
cd lambda
npm init -y
npm install @aws-sdk/client-ssm
npm install -D typescript @types/aws-lambda @types/node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Add the build script to `package.json`:

```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

Create `src/handler.ts`:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
// [!note Create the client at module level so it is reused across invocations.]

let apiKey: string | undefined;

const loadConfig = async () => {
  if (apiKey) return;
  // [!note Skip the API call if the value is already cached from a previous invocation.]

  const response = await ssm.send(
    new GetParameterCommand({
      Name: '/my-frontend-app/production/third-party-api-key',
      WithDecryption: true,
    }),
  );

  apiKey = response.Parameter?.Value;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadConfig();

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load API key from Parameter Store' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Secret loaded successfully from Parameter Store',
      keyPrefix: apiKey.slice(0, 7),
    }),
  };
};
```

Build:

```bash
npm run build
```

## Update the Execution Role

Create `parameter-store-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/my-frontend-app/production/third-party-api-key"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/aws/ssm"
    }
  ]
}
```

Attach it to the execution role:

```bash
aws iam put-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-name parameter-store-access \
  --policy-document file://parameter-store-policy.json \
  --output json
```

Verify the policy is attached:

```bash
aws iam list-role-policies \
  --role-name my-frontend-app-lambda-role \
  --output json
```

Expected output:

```json
{
  "PolicyNames": ["parameter-store-access"]
}
```

You can also verify the policy contents:

```bash
aws iam get-role-policy \
  --role-name my-frontend-app-lambda-role \
  --policy-name parameter-store-access \
  --output json
```

## Deploy and Invoke

Package the function. You need to include `node_modules` because the Lambda runtime doesn't include `@aws-sdk/client-ssm` by default:

```bash
cd lambda
npm run build
cd dist
cp -r ../node_modules .
zip -r ../function.zip .
cd ..
```

Deploy — if updating an existing function:

```bash
aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

Or create a new function:

```bash
aws lambda create-function \
  --function-name my-frontend-app-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/my-frontend-app-lambda-role \
  --handler handler.handler \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --region us-east-1 \
  --output json
```

> [!TIP]
> The default timeout is 3 seconds. The first invocation (cold start) includes the SDK call to Parameter Store, which can take a second or two. Setting the timeout to 10 seconds gives plenty of headroom.

Invoke the function:

```bash
aws lambda invoke \
  --function-name my-frontend-app-api \
  --payload '{"requestContext":{"http":{"method":"GET","path":"/secret"}},"queryStringParameters":{}}' \
  --cli-binary-format raw-in-base64-out \
  --region us-east-1 \
  --output json \
  response.json
```

Read the response:

```bash
cat response.json
```

Expected output:

```json
{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "body": "{\"message\":\"Secret loaded successfully from Parameter Store\",\"keyPrefix\":\"sk_test\"}"
}
```

The `keyPrefix` value is `sk_test` — the first 7 characters of `sk_test_exercise_abc123`.

## Verify the Secret Isn't in Environment Variables

```bash
aws lambda get-function-configuration \
  --function-name my-frontend-app-api \
  --query 'Environment' \
  --region us-east-1 \
  --output json
```

If you have environment variables from a previous exercise (like `TABLE_NAME`), they appear here. The API key doesn't. It exists only in Parameter Store.

## Troubleshooting

**"AccessDeniedException" when invoking the function.** The execution role is missing `ssm:GetParameter` or `kms:Decrypt` permissions. Double-check the policy document and verify it's attached to the correct role. Also verify the parameter ARN in the policy matches the parameter name exactly — remember that the ARN path doesn't double the leading slash.

**"ParameterNotFound" error.** The parameter name in your code doesn't match the name you used in `put-parameter`. Parameter names are case-sensitive and must include the full path with leading slash.

**Function times out.** The default timeout is 3 seconds, which may not be enough for a cold start that includes an SDK call. Bump the timeout to 10 seconds with:

```bash
aws lambda update-function-configuration \
  --function-name my-frontend-app-api \
  --timeout 10 \
  --region us-east-1 \
  --output json
```

**"Cannot find module '@aws-sdk/client-ssm'"** The `node_modules` directory wasn't included in the deployment zip. Make sure you copy `node_modules` into the `dist/` directory before zipping, or zip from the project root and include both `dist/` files and `node_modules/`.

## Stretch Goal Solution: GetParametersByPath

Store a second parameter:

```bash
aws ssm put-parameter \
  --name "/my-frontend-app/production/api-endpoint" \
  --value "https://api.example.com/v1" \
  --type "String" \
  --region us-east-1 \
  --output json
```

Update the IAM policy to allow `ssm:GetParametersByPath` and broaden the resource to the path prefix:

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

Updated handler using `GetParametersByPathCommand`:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});

let config: Record<string, string> | undefined;

const loadConfig = async () => {
  if (config) return;

  const response = await ssm.send(
    new GetParametersByPathCommand({
      Path: '/my-frontend-app/production',
      WithDecryption: true,
      Recursive: true,
    }),
  );

  config = {};
  for (const param of response.Parameters ?? []) {
    if (param.Name && param.Value) {
      const key = param.Name.replace('/my-frontend-app/production/', '');
      config[key] = param.Value;
    }
  }
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  await loadConfig();

  if (!config) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load configuration' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'All configuration loaded from Parameter Store',
      parameters: Object.keys(config),
      apiEndpoint: config['api-endpoint'],
      keyPrefix: config['third-party-api-key']?.slice(0, 7),
    }),
  };
};
```

The response now includes both parameters, loaded in a single API call.
