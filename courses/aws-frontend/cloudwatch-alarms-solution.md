---
title: 'Solution: Set Up Alarms for Your Lambda Functions'
description: >-
  Complete solution for the CloudWatch alarms exercise, with all commands and
  expected output.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - cloudwatch
  - exercise
  - solution
---

Here's the complete solution for every step, including all CLI commands and the expected output at each stage.

## Create the SNS Topic

```bash
aws sns create-topic \
  --name my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "TopicArn": "arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"
}
```

### Verify

```bash
aws sns list-topics \
  --region us-east-1 \
  --output json
```

The output includes your topic in the `Topics` array:

```json
{
  "Topics": [
    {
      "TopicArn": "arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"
    }
  ]
}
```

## Subscribe Your Email

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "SubscriptionArn": "pending confirmation"
}
```

Check your email and click the confirmation link. Then verify:

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

Expected output after confirmation:

```json
{
  "Subscriptions": [
    {
      "SubscriptionArn": "arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts:a1b2c3d4-5678-90ab-cdef-example11111",
      "Owner": "123456789012",
      "Protocol": "email",
      "Endpoint": "your-email@example.com",
      "TopicArn": "arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"
    }
  ]
}
```

The `SubscriptionArn` is a real ARN now, not `pending confirmation`.

> [!WARNING]
> If the `SubscriptionArn` still shows `pending confirmation`, you haven't clicked the confirmation link in the email. Check your spam folder. SNS won't deliver alarm notifications until the subscription is confirmed.

## Create the Error Count Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name my-frontend-app-api-error-count \
  --alarm-description "Alarm when Lambda error count exceeds 3 in 5 minutes" \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=my-frontend-app-api \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

This command produces no output on success. Verify with:

```bash
aws cloudwatch describe-alarms \
  --alarm-names my-frontend-app-api-error-count \
  --region us-east-1 \
  --output json
```

Expected output (relevant fields):

```json
{
  "MetricAlarms": [
    {
      "AlarmName": "my-frontend-app-api-error-count",
      "AlarmDescription": "Alarm when Lambda error count exceeds 3 in 5 minutes",
      "StateValue": "INSUFFICIENT_DATA",
      "MetricName": "Errors",
      "Namespace": "AWS/Lambda",
      "Statistic": "Sum",
      "Dimensions": [
        {
          "Name": "FunctionName",
          "Value": "my-frontend-app-api"
        }
      ],
      "Period": 300,
      "EvaluationPeriods": 2,
      "Threshold": 3.0,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"],
      "OKActions": ["arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"]
    }
  ]
}
```

The `StateValue` of `INSUFFICIENT_DATA` is expected for a new alarm — CloudWatch hasn't evaluated it yet.

## Create the Duration Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name my-frontend-app-api-high-duration \
  --alarm-description "Alarm when average Lambda duration exceeds 2 seconds" \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-frontend-app-api \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

Verify:

```bash
aws cloudwatch describe-alarms \
  --alarm-names my-frontend-app-api-high-duration \
  --region us-east-1 \
  --output json
```

Expected output (relevant fields):

```json
{
  "MetricAlarms": [
    {
      "AlarmName": "my-frontend-app-api-high-duration",
      "AlarmDescription": "Alarm when average Lambda duration exceeds 2 seconds",
      "StateValue": "INSUFFICIENT_DATA",
      "MetricName": "Duration",
      "Namespace": "AWS/Lambda",
      "Statistic": "Average",
      "Dimensions": [
        {
          "Name": "FunctionName",
          "Value": "my-frontend-app-api"
        }
      ],
      "Period": 300,
      "EvaluationPeriods": 2,
      "Threshold": 2000.0,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts"]
    }
  ]
}
```

This alarm only has `AlarmActions` (no `OKActions`). Adding OK actions is one of the stretch goals.

## Test the Error Alarm

Force the alarm into the `ALARM` state:

```bash
aws cloudwatch set-alarm-state \
  --alarm-name my-frontend-app-api-error-count \
  --state-value ALARM \
  --state-reason "Testing alarm notification pipeline" \
  --region us-east-1 \
  --output json
```

This command produces no output on success. Check your email — you should receive a notification from `AWS Notifications` with details about the alarm:

- **Alarm Name**: `my-frontend-app-api-error-count`
- **New State**: `ALARM`
- **Reason**: `Testing alarm notification pipeline`
- **State Change Time**: The timestamp when you ran the command

The alarm will return to its actual state (`INSUFFICIENT_DATA` or `OK`) on the next evaluation period (within 5 minutes).

> [!TIP]
> If you don't receive the email, check three things: (1) your SNS subscription is confirmed, (2) the email isn't in your spam folder, and (3) the `--alarm-actions` ARN matches your SNS topic ARN exactly.

## Trigger a Real Alarm (Optional)

### Deploy a Failing Handler

Create a file called `failing-handler.ts`:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  throw new Error('Intentional error to trigger CloudWatch alarm');
};
```

Build, package, and deploy:

```bash
cd lambda
npx tsc src/failing-handler.ts --outDir dist --esModuleInterop --skipLibCheck
cd dist && zip -r ../function.zip . && cd ..

aws lambda update-function-code \
  --function-name my-frontend-app-api \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --output json
```

### Invoke Repeatedly to Generate Errors

```bash
for i in {1..5}; do
  aws lambda invoke \
    --function-name my-frontend-app-api \
    --cli-binary-format raw-in-base64-out \
    --payload '{}' \
    --region us-east-1 \
    --output json \
    /tmp/response-$i.json
  echo "Invocation $i complete"
done
```

Each invocation will return a `FunctionError` field:

```json
{
  "StatusCode": 200,
  "FunctionError": "Unhandled",
  "ExecutedVersion": "$LATEST"
}
```

The `FunctionError: "Unhandled"` indicates the function threw an unhandled exception. Lambda still returns `StatusCode: 200` at the invocation level — the 200 means Lambda successfully _invoked_ the function, not that the function succeeded.

### Wait for the Alarm

The alarm is configured with a 5-minute period and 2 evaluation periods, so you need to wait up to 10 minutes for the alarm to transition from `INSUFFICIENT_DATA` to `ALARM`. You can watch the state:

```bash
aws cloudwatch describe-alarms \
  --alarm-names my-frontend-app-api-error-count \
  --region us-east-1 \
  --output json \
  --query 'MetricAlarms[0].{State:StateValue,Reason:StateReason}'
```

Once the alarm fires, you receive an email notification.

### Redeploy the Working Handler

Don't leave the broken function deployed. Redeploy your original working handler:

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

After a few successful invocations (or a period with no errors), the alarm transitions back to `OK` and you receive another notification.

## List All Alarms

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix my-frontend-app \
  --region us-east-1 \
  --output json
```

Expected output shows both alarms:

```json
{
  "MetricAlarms": [
    {
      "AlarmName": "my-frontend-app-api-error-count",
      "MetricName": "Errors",
      "Statistic": "Sum",
      "Threshold": 3.0,
      "ComparisonOperator": "GreaterThanThreshold",
      "Period": 300,
      "EvaluationPeriods": 2
    },
    {
      "AlarmName": "my-frontend-app-api-high-duration",
      "MetricName": "Duration",
      "Statistic": "Average",
      "Threshold": 2000.0,
      "ComparisonOperator": "GreaterThanThreshold",
      "Period": 300,
      "EvaluationPeriods": 2
    }
  ]
}
```

## Stretch Goal: API Gateway 5XX Alarm

Find your API Gateway API ID:

```bash
aws apigatewayv2 get-apis \
  --region us-east-1 \
  --output json \
  --query 'Items[?Name==`my-frontend-app-api`].ApiId'
```

Create the alarm:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name my-frontend-app-api-5xx \
  --alarm-description "Alarm when API Gateway returns any 5XX error" \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiId,Value=your-api-id \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

This alarm uses a single evaluation period and a threshold of zero — any 5XX error triggers it immediately.

## Stretch Goal: Add OK Actions to Duration Alarm

Rerun `put-metric-alarm` with the same parameters plus `--ok-actions`:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name my-frontend-app-api-high-duration \
  --alarm-description "Alarm when average Lambda duration exceeds 2 seconds" \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-frontend-app-api \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts \
  --region us-east-1 \
  --output json
```

`put-metric-alarm` updates an existing alarm if one with the same name already exists — you don't need to delete it first.

## Stretch Goal: Alarm History

```bash
aws cloudwatch describe-alarm-history \
  --alarm-name my-frontend-app-api-error-count \
  --region us-east-1 \
  --output json
```

Expected output (if you tested the alarm):

```json
{
  "AlarmHistoryItems": [
    {
      "AlarmName": "my-frontend-app-api-error-count",
      "Timestamp": "2026-03-18T15:05:00.000Z",
      "HistoryItemType": "StateUpdate",
      "HistorySummary": "Alarm updated from ALARM to INSUFFICIENT_DATA",
      "HistoryData": "{\"version\":\"1.0\",\"oldState\":{\"stateValue\":\"ALARM\"},\"newState\":{\"stateValue\":\"INSUFFICIENT_DATA\",\"stateReason\":\"Unchecked: Initial alarm creation\"}}"
    },
    {
      "AlarmName": "my-frontend-app-api-error-count",
      "Timestamp": "2026-03-18T15:00:00.000Z",
      "HistoryItemType": "StateUpdate",
      "HistorySummary": "Alarm updated from INSUFFICIENT_DATA to ALARM",
      "HistoryData": "{\"version\":\"1.0\",\"oldState\":{\"stateValue\":\"INSUFFICIENT_DATA\"},\"newState\":{\"stateValue\":\"ALARM\",\"stateReason\":\"Testing alarm notification pipeline\"}}"
    }
  ]
}
```

This shows the complete timeline of state transitions — useful for understanding how frequently your alarm fires and whether it's too sensitive or too quiet.
