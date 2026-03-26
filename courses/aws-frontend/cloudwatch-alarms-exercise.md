---
title: 'Exercise: Set Up Alarms for Your Lambda Functions'
description: >-
  Create CloudWatch alarms for error rate and duration, wire them to SNS email
  notifications, and trigger alarms intentionally to verify the pipeline.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - cloudwatch
  - exercise
---

You're going to build a complete alerting pipeline from scratch — an SNS topic, an email subscription, and two CloudWatch alarms that watch your Lambda function's error rate and duration. Then you'll intentionally trigger the alarms to prove the pipeline works end to end.

This is the same monitoring setup you'd use for any production Lambda function. Get it working here, and you can replicate it for every function you deploy.

## Why It Matters

Dashboards require you to look at them. Logs require you to search them. Neither one wakes you up when something breaks at 2 AM. Alarms are the piece that closes the loop — they watch your metrics continuously and notify you the moment something crosses a threshold. Without alarms, the gap between "something broke" and "someone noticed" is however long it takes a user to file a complaint. I've been on both sides of that gap, and the alarm side is _definitively_ better.

## Your Task

Set up a monitoring pipeline for `my-frontend-app-api` that:

- Sends email notifications through an SNS topic
- Fires an alarm when the Lambda error count exceeds 3 in a 5-minute period
- Fires an alarm when the average Lambda duration exceeds 2 seconds
- Can be tested by intentionally triggering each alarm

Use the account ID `123456789012` and region `us-east-1`.

## Create an SNS Topic

Create an SNS topic named `my-frontend-app-alerts` that will serve as the notification channel for your alarms.

### Checkpoint

`aws sns list-topics --region us-east-1 --output json` shows a topic with the ARN `arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts`.

## Subscribe Your Email

Subscribe your email address to the topic. After running the subscribe command, check your inbox for the confirmation email and click the confirmation link.

### Checkpoint

`aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:us-east-1:123456789012:my-frontend-app-alerts --region us-east-1 --output json` shows your subscription with a real ARN (not `pending confirmation`).

## Create the Error Count Alarm

Create a CloudWatch alarm named `my-frontend-app-api-error-count` that:

- Watches the `Errors` metric in the `AWS/Lambda` namespace
- Uses the `FunctionName` dimension set to `my-frontend-app-api`
- Uses the `Sum` statistic
- Fires when the error count is **greater than 3** in a single 5-minute period (300 seconds)
- Requires **2 consecutive** evaluation periods before triggering
- Sends notifications to your SNS topic on both `ALARM` and `OK` transitions

Think about which `--comparison-operator` you need. "Greater than 3" isn't the same as "greater than or equal to 3."

### Checkpoint

`aws cloudwatch describe-alarms --alarm-names my-frontend-app-api-error-count --region us-east-1 --output json` returns the alarm with:

- `StateValue` of `INSUFFICIENT_DATA` (normal for a new alarm)
- `Threshold` of `3.0`
- `ComparisonOperator` of `GreaterThanThreshold`
- `Period` of `300`
- `EvaluationPeriods` of `2`

## Create the Duration Alarm

Create a CloudWatch alarm named `my-frontend-app-api-high-duration` that:

- Watches the `Duration` metric in the `AWS/Lambda` namespace
- Uses the `FunctionName` dimension set to `my-frontend-app-api`
- Uses the `Average` statistic
- Fires when the average duration is **greater than 2000 milliseconds**
- Uses a period of 300 seconds and 2 evaluation periods
- Sends notifications to your SNS topic when transitioning to `ALARM`

Remember: Lambda `Duration` is measured in milliseconds.

### Checkpoint

`aws cloudwatch describe-alarms --alarm-names my-frontend-app-api-high-duration --region us-east-1 --output json` returns the alarm with:

- `MetricName` of `Duration`
- `Statistic` of `Average`
- `Threshold` of `2000.0`

## Test the Error Alarm

You can test the notification pipeline without waiting for real errors by manually setting the alarm state:

1. Use `aws cloudwatch set-alarm-state` to force `my-frontend-app-api-error-count` into the `ALARM` state with a reason of `"Testing alarm notification pipeline"`
2. Check your email for the SNS notification
3. Wait a few minutes — the alarm will return to its actual state on the next evaluation

### Checkpoint

- You received an email from SNS with the alarm details
- The email includes the alarm name, reason, and the state transition

## Trigger a Real Alarm (Optional)

If you want to see the alarm fire from actual metrics instead of a manual state change, you can intentionally break your Lambda function:

1. Update your Lambda function code to throw an error on every invocation
2. Invoke the function more than 3 times using the CLI
3. Wait for two 5-minute evaluation periods (up to 10 minutes)
4. Check your email for the alarm notification

To create a failing function, deploy a handler that always throws:

```typescript
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  throw new Error('Intentional error to trigger CloudWatch alarm');
};
```

After verifying the alarm fires, **redeploy your working handler**. Don't leave a broken function deployed.

### Checkpoint

- The alarm transitioned from `INSUFFICIENT_DATA` (or `OK`) to `ALARM`
- You received an SNS email notification
- After redeploying the working handler, the alarm returns to `OK` (this may take up to 10 minutes)

## List and Verify All Alarms

List all your alarms with the `my-frontend-app` prefix and confirm both are configured correctly:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix my-frontend-app \
  --region us-east-1 \
  --output json
```

### Checkpoint

Two alarms are listed, both pointing to the same SNS topic, with the correct metrics, thresholds, and evaluation periods.

## Checkpoints Summary

- [ ] SNS topic `my-frontend-app-alerts` exists
- [ ] Email subscription is confirmed (not `pending confirmation`)
- [ ] Error count alarm exists with threshold of 3, Sum statistic, period of 300s, 2 evaluation periods
- [ ] Duration alarm exists with threshold of 2000ms, Average statistic, period of 300s, 2 evaluation periods
- [ ] Manual alarm state test produced an email notification
- [ ] Both alarms show in `describe-alarms` with correct configuration

## Stretch Goals

- **Add a 5XX alarm for API Gateway.** Create a third alarm that watches the `5XXError` metric in the `AWS/ApiGateway` namespace. Use a threshold of 0 and a single evaluation period — any server error should trigger immediately.

- **Add an OK action to the duration alarm.** Update the duration alarm to also notify you when it transitions back to `OK`. Use `aws cloudwatch put-metric-alarm` with the same parameters plus `--ok-actions`.

- **Check alarm history.** Run `aws cloudwatch describe-alarm-history --alarm-name my-frontend-app-api-error-count --region us-east-1 --output json` to see the history of state transitions for your alarm.

When you're ready, check your work against the [Solution: Set Up Alarms for Your Lambda Functions](cloudwatch-alarms-solution.md).
