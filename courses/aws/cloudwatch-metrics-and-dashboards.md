---
title: CloudWatch Metrics and Dashboards
description: >-
  Identify the key metrics for Lambda, API Gateway, and DynamoDB, and create a
  CloudWatch dashboard that gives you a single view of your application's
  health.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - cloudwatch
  - metrics
  - dashboards
---

Logs tell you what happened. **Metrics** tell you how things are going. Every AWS service you've deployed in this course—Lambda, API Gateway, DynamoDB—publishes numeric measurements to CloudWatch at regular intervals. Invocation counts, error rates, latency percentiles, throttled requests. This data has been accumulating since you first deployed your Lambda function. You just haven't looked at it yet.

If you want AWS's version of the metrics model while you read, the [CloudWatch overview](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html) is the canonical reference.

In this lesson, you'll learn which metrics matter for each service, how to query them from the CLI, and how to build a CloudWatch dashboard that shows your application's health at a glance.

## How Metrics Work

A **metric** is a time-ordered series of data points. Each data point has a timestamp, a value, and a unit. Lambda publishes a `Duration` data point every time your function runs—the value is the execution time in milliseconds. Over a day, you might have thousands of `Duration` data points, and CloudWatch can aggregate them into averages, maximums, percentiles, or sums over any time window you choose.

Metrics are organized by **namespace** (which service published them), **metric name** (what's being measured), and **dimensions** (which specific resource within that service). For example:

- Namespace: `AWS/Lambda`
- Metric name: `Duration`
- Dimension: `FunctionName = my-frontend-app-api`

This combination uniquely identifies "how long does my specific Lambda function take to execute?"

## Key Metrics by Service

You don't need to monitor every metric AWS publishes. Here are the ones that matter for a frontend application backend.

### Lambda (`AWS/Lambda`)

| Metric                 | What It Tells You                                | Statistic to Watch                                 |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `Invocations`          | How many times your function ran                 | `Sum`—total call volume                            |
| `Errors`               | How many invocations returned an error           | `Sum`—total failures                               |
| `Duration`             | How long each invocation took (ms)               | `Average` and `p95`—typical and worst-case latency |
| `Throttles`            | Invocations rejected due to concurrency limits   | `Sum`—should be zero                               |
| `ConcurrentExecutions` | How many environments are running simultaneously | `Maximum`—peak concurrency                         |

The error rate is `Errors / Invocations`. If `Invocations` is 1,000 and `Errors` is 50, your error rate is 5%. This is the single most important metric for any API backend. If I could only watch one number, this would be it.

### API Gateway (`AWS/ApiGateway`)

| Metric               | What It Tells You                                     | Statistic to Watch                                                                            |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Count`              | Total API requests                                    | `Sum`—traffic volume                                                                          |
| `4XXError`           | Client errors (bad requests, not found, unauthorized) | `Sum` and `Average`—a high rate means your API contract is unclear or clients are misbehaving |
| `5XXError`           | Server errors (your Lambda failed or timed out)       | `Sum`—should be near zero                                                                     |
| `Latency`            | Total time from request receipt to response (ms)      | `Average` and `p95`                                                                           |
| `IntegrationLatency` | Time spent in the Lambda function specifically (ms)   | `Average`—compare with `Latency` to see API Gateway overhead                                  |

The gap between `Latency` and `IntegrationLatency` is API Gateway overhead. If `IntegrationLatency` is 50 ms but `Latency` is 200 ms, API Gateway is adding 150 ms—which might indicate a cold start or authorization overhead.

> [!TIP]
> API Gateway metrics use the dimension `ApiId` (your API's unique identifier) rather than the API name. You can find your API ID with `aws apigatewayv2 get-apis --region us-east-1 --output json`.

### DynamoDB (`AWS/DynamoDB`)

| Metric                       | What It Tells You                            | Statistic to Watch                                                                     |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ConsumedReadCapacityUnits`  | Read throughput consumed                     | `Sum`—how much read capacity you're using                                              |
| `ConsumedWriteCapacityUnits` | Write throughput consumed                    | `Sum`—how much write capacity you're using                                             |
| `ThrottledRequests`          | Requests rejected due to throughput limits   | `Sum`—should be zero on on-demand tables                                               |
| `SuccessfulRequestLatency`   | Time DynamoDB took to process a request (ms) | `Average`—DynamoDB is fast; if this spikes, something's wrong with your access pattern |
| `SystemErrors`               | Internal DynamoDB errors                     | `Sum`—rare, but worth monitoring                                                       |

If you're using on-demand capacity mode (which you set up in [What is DynamoDB?](what-is-dynamodb.md)), `ThrottledRequests` should stay at zero unless you're hitting account-level limits.

## Querying Metrics from the CLI

You can pull metric data directly from the command line with `aws cloudwatch get-metric-statistics`. This is useful for quick checks without opening the console.

Get Lambda error count for the last hour:

```bash
# macOS
START=$(date -v-1H -u +%Y-%m-%dT%H:%M:%SZ)
# Linux
START=$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ)

aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=my-frontend-app-api \
  --start-time $START \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 \
  --output json
```

This returns data points aggregated into 5-minute buckets (300 seconds):

```json
{
  "Label": "Errors",
  "Datapoints": [
    {
      "Timestamp": "2026-03-18T14:00:00+00:00",
      "Sum": 0.0,
      "Unit": "Count"
    },
    {
      "Timestamp": "2026-03-18T14:05:00+00:00",
      "Sum": 2.0,
      "Unit": "Count"
    }
  ]
}
```

Get average Lambda duration for the last hour:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-frontend-app-api \
  --start-time $START \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average Maximum \
  --region us-east-1 \
  --output json
```

> [!TIP]
> You can request multiple statistics in a single call by listing them after `--statistics`. `Average Maximum` gives you both the typical and worst-case duration in the same response.

## Creating a CloudWatch Dashboard

A **dashboard** is a customizable page of widgets that display metrics. Instead of running CLI commands every time you want to check your application's health, you build a dashboard once and glance at it whenever you need to.

### Create the Dashboard

CloudWatch dashboards are defined as JSON. Each widget specifies which metrics to graph and how to display them. Here's a dashboard with three widgets: Lambda errors, Lambda duration, and API Gateway latency.

```bash
aws cloudwatch put-dashboard \
  --dashboard-name my-frontend-app-dashboard \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "title": "Lambda Errors",
          "metrics": [
            ["AWS/Lambda", "Errors", "FunctionName", "my-frontend-app-api", {"stat": "Sum", "period": 300}]
          ],
          "view": "timeSeries",
          "stacked": false,
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 12,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "title": "Lambda Duration (ms)",
          "metrics": [
            ["AWS/Lambda", "Duration", "FunctionName", "my-frontend-app-api", {"stat": "Average", "period": 300}],
            ["AWS/Lambda", "Duration", "FunctionName", "my-frontend-app-api", {"stat": "p95", "period": 300}]
          ],
          "view": "timeSeries",
          "stacked": false,
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 0,
        "y": 6,
        "width": 12,
        "height": 6,
        "properties": {
          "title": "API Gateway Latency (ms)",
          "metrics": [
            ["AWS/ApiGateway", "Latency", "ApiId", "your-api-id", {"stat": "Average", "period": 300}],
            ["AWS/ApiGateway", "Latency", "ApiId", "your-api-id", {"stat": "p95", "period": 300}]
          ],
          "view": "timeSeries",
          "stacked": false,
          "region": "us-east-1"
        }
      },
      {
        "type": "metric",
        "x": 12,
        "y": 6,
        "width": 12,
        "height": 6,
        "properties": {
          "title": "DynamoDB Throttled Requests",
          "metrics": [
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", "my-frontend-app-data", {"stat": "Sum", "period": 300}]
          ],
          "view": "timeSeries",
          "stacked": false,
          "region": "us-east-1"
        }
      }
    ]
  }' \
  --region us-east-1 \
  --output json
```

The `x` and `y` properties control widget placement on a 24-column grid. The `width` and `height` properties control size. Two widgets side by side at width 12 each fill the full row.

For percentile views, CloudWatch dashboard JSON accepts the short statistic form like `"stat": "p95"`. You don't need to spell it as `p95.00`.

### Verify the Dashboard

```bash
aws cloudwatch list-dashboards \
  --region us-east-1 \
  --output json
```

You can also open the CloudWatch console in your browser, navigate to **Dashboards**, and see `my-frontend-app-dashboard` with all four widgets rendering real data.

> [!WARNING]
> CloudWatch dashboards are free for the first three dashboards (up to 50 metrics each). After that, each dashboard costs $3 per month. For a single application, one dashboard with a handful of widgets is all you need.

## Choosing the Right Statistic

Metrics support multiple statistics, and picking the wrong one gives you a misleading picture.

- **Sum**: Total count. Use for `Invocations`, `Errors`, `Throttles`, `Count`. "How many errors happened in the last hour?"
- **Average**: Arithmetic mean. Use for `Duration`, `Latency`. "What's the typical response time?" Be careful—averages hide outliers.
- **Maximum**: Worst case in the period. Useful for spotting cold starts in `Duration`.
- **p95 / p99**: Percentile statistics. "95% of requests completed within X milliseconds." This is almost always more useful than Average for latency metrics because it shows you what your slowest users experience.
- **SampleCount**: How many data points were aggregated. Useful for verifying that your function is actually receiving traffic.

For latency, always graph both Average and p95. If they're close together, your performance is consistent. If p95 is three times the average, you have outliers (often cold starts) that are worth investigating.

You can see your metrics now and you have a dashboard. But dashboards require you to look at them. In the next lesson, you'll create alarms that watch these metrics for you and send email notifications when something goes wrong—so you find out about problems before your users do.

## Cleanup

When you're done with the dashboard, delete it to keep your CloudWatch workspace tidy:

```bash
aws cloudwatch delete-dashboards \
  --dashboard-names my-frontend-app-dashboard \
  --region us-east-1
```

CloudWatch dashboards are free for the first three, so this isn't a billing concern at course scale—but it's a good habit to clean up what you create.
