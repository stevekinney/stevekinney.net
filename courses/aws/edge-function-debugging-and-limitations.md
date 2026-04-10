---
title: Edge Function Debugging and Limitations
description: >-
  Debug edge functions using CloudWatch Logs, and navigate the runtime
  constraints and deployment limitations that affect Lambda@Edge and CloudFront
  Functions.
date: 2026-03-18
modified: 2026-04-07
tags:
  - aws
  - edge-functions
  - debugging
  - limitations
---

Edge functions are powerful, but they fail in ways that are genuinely confusing the first time you encounter them. Your logs aren't where you expect. Your function works locally but fails at the edge. Your deployment succeeds but the function doesn't seem to run. This lesson covers where to look when things go wrong and what constraints to keep in mind before you write a single line of code.

If you want AWS's version of the runtime behavior while you read, the [CloudFront Functions guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html) is the official reference.

## Where the Logs Go

This is the number one source of confusion—I can't tell you how many times I've stared at an empty CloudWatch log group in `us-east-1` before remembering the logs are in a different region. Lambda@Edge and CloudFront Functions both write to CloudWatch Logs, but they write to **different regions** and with different behaviors.

### Lambda@Edge Logs

Lambda@Edge functions write logs to the **AWS region closest to the edge location that executed the function**. If a user in Tokyo triggers your function, the logs appear in the `ap-northeast-1` CloudWatch log group. If a user in London triggers it, the logs appear in `eu-west-2`.

The log group follows the standard Lambda naming pattern:

```
/aws/lambda/us-east-1.my-frontend-app-edge-rewrite
```

Notice the `us-east-1.` prefix—this indicates that the function was deployed in `us-east-1` and replicated to the current region.

To find your Lambda@Edge logs, you need to know (or guess) which region processed the request. If you're testing from your own location, check the CloudFront region nearest to you:

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/us-east-1.my-frontend-app-edge-rewrite \
  --region ap-northeast-1 \
  --output json
```

> [!WARNING]
> If you're debugging a Lambda@Edge function and see no logs in `us-east-1`, that's expected. The function was **deployed** in `us-east-1` but **executed** in whatever region was closest to the user. Check CloudWatch in the region nearest to wherever the request originated.

### CloudFront Functions Logs

CloudFront Functions handle logging differently. Execution logs from `console.log()` statements aren't automatically written to CloudWatch. Instead, CloudFront Functions provide:

1. **Test output.** When you test a function using `aws cloudfront test-function`, the output includes any `console.log()` statements and the function result.
2. **CloudWatch metrics.** CloudFront publishes function metrics (invocations, errors, compute utilization, throttles) to CloudWatch in `us-east-1`. These are metrics, not logs—you can see that your function errored, but not the error message.

To add real-time logging to a CloudFront Function, you can enable CloudWatch Logs by creating a logging configuration. The logs appear in `us-east-1` under a log group named:

```
/aws/cloudfront/function/url-rewrite
```

> [!TIP]
> For quick debugging of CloudFront Functions, use the `test-function` CLI command with different event payloads rather than deploying and waiting for real traffic. It's faster and gives you the full `console.log()` output.

## Common Error Patterns

### "The function returned an invalid response"

This error appears in CloudFront's standard error response (a 502 or 503) when your edge function returns a malformed response object. Common causes:

**Lambda@Edge:** Returning `status: 200` instead of `status: '200'`. The status must be a string, not a number.

**CloudFront Functions:** Returning a response object with missing required fields. At minimum, you need `statusCode` and `statusDescription`:

```javascript
// Wrong—missing statusDescription
return { statusCode: 200 };

// Correct
return { statusCode: 200, statusDescription: 'OK' };
```

### "Execution timed out"

- **CloudFront Functions:** Your function exceeded the compute utilization limit. This is measured as a percentage (0–100) of the maximum allowed time, not as wall-clock seconds. If you see this, your function is doing too much work—simplify the logic or move it to Lambda@Edge.
- **Lambda@Edge:** Your viewer event function exceeded 5 seconds or your origin event function exceeded 30 seconds. If your function makes network calls, check for timeouts on those calls.

### "Function exceeded the allowed size"

- **CloudFront Functions:** Your code exceeds 10 KB. Remove comments, shorten variable names, or split the logic across a viewer request and viewer response function.
- **Lambda@Edge:** Your zipped deployment package exceeds 1 MB (viewer events) or 50 MB (origin events). Remove unused dependencies, use tree-shaking, or consider whether the dependency is truly necessary.

### The function works in test but not in production

This usually means one of two things:

1. **You published to DEVELOPMENT but not LIVE.** CloudFront Functions have a two-stage deployment. The `test-function` command tests the DEVELOPMENT stage. You must run `publish-function` to promote to LIVE.
2. **The function isn't associated with the right behavior.** Verify the association using `get-distribution-config` and check that the function ARN appears in the correct behavior's `FunctionAssociations` or `LambdaFunctionAssociations`.

### "The Lambda function associated with the CloudFront distribution is invalid or doesn't have the required permissions"

This means one or more of:

- The Lambda function doesn't exist in `us-east-1`
- You referenced `$LATEST` instead of a numbered version
- The execution role doesn't include `edgelambda.amazonaws.com` in its trust policy
- The IAM role doesn't have the `AWSLambdaBasicExecutionRole` policy attached

Review the role setup in [Writing a Lambda@Edge Function](writing-a-lambda-at-edge-function.md).

## Response Size Limits

Edge functions have strict limits on the response they can generate:

| Trigger                             | Maximum Response Size (including headers)                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewer request (generated response) | 40 KB                                                                                                                                                                                                   |
| Viewer response                     | Can modify the response (status code, headers, body, cookies) but cannot generate a completely new response from scratch the way a viewer request function can short-circuit before reaching the origin |
| Origin request (generated response) | 1 MB                                                                                                                                                                                                    |
| Origin response                     | Cannot generate a response; can only modify the existing one                                                                                                                                            |

If your edge function generates a response that exceeds the limit, CloudFront returns a 502 error to the viewer.

> [!WARNING]
> These limits apply when your function **generates** a response (short-circuits without going to the origin). If you're modifying a response that came from the origin, the response size is governed by CloudFront's standard limits, not the edge function limits.

## Network Access Restrictions

**CloudFront Functions can't make network calls.** No HTTP requests, no DNS lookups, no socket connections. This is a hard constraint of the runtime. If your function needs to call an external service—validate a JWT against a JWKS endpoint, look up a feature flag, query a database—you must use Lambda@Edge.

**Lambda@Edge** can make network calls, but keep in mind:

- Network calls add latency. A viewer request function that makes an HTTP call to your API will block the user's request until that call completes.
- The 5-second timeout for viewer events includes network time. If your external service is slow, your function times out and the user gets a 502.
- Consider caching external data in the function's global scope (outside the handler) to reuse across invocations on the same execution environment.

## The Replication Delay

Lambda@Edge functions are replicated to regional edge caches worldwide. This replication takes time:

- **Initial deployment:** Several minutes after associating the function with a distribution.
- **Updates:** Each new version requires a new association and another round of replication. Budget 5–10 minutes for a full global rollout.
- **Deletion:** After removing a Lambda@Edge association, replicas are cleaned up asynchronously. You may not be able to delete the Lambda function for hours. The API returns `ReplicatedFunctionStillCreating` or `ResourceConflictException` until cleanup completes.

CloudFront Functions don't have this problem. They propagate in seconds because they run on the CloudFront edge locations themselves, not on separate Lambda infrastructure.

## Constraints Summary

Here's every constraint in one table for quick reference:

| Constraint            | CloudFront Functions       | Lambda@Edge (Viewer) | Lambda@Edge (Origin) |
| --------------------- | -------------------------- | -------------------- | -------------------- |
| Runtime               | JS (ES5.1 + select ES6–12) | Node.js / Python     | Node.js / Python     |
| Max execution time    | Sub-millisecond            | 5 seconds            | 30 seconds           |
| Memory                | 2 MB                       | 128 MB               | Up to 10,240 MB      |
| Package size          | 10 KB                      | 1 MB                 | 50 MB                |
| Network access        | No                         | Yes                  | Yes                  |
| File system           | No                         | `/tmp` (512 MB)      | `/tmp` (512 MB)      |
| Environment variables | No                         | No                   | No                   |
| Request body access   | No                         | No                   | Yes                  |
| Logs location         | `us-east-1`                | Nearest region       | Nearest region       |
| Deployment speed      | Seconds                    | Minutes              | Minutes              |

## Debugging Workflow

When an edge function isn't working, follow this sequence:

1. **Test locally first.** Use `aws cloudfront test-function` for CloudFront Functions. For Lambda@Edge, invoke the function directly with a test event that matches the CloudFront event structure.
2. **Check the association.** Run `aws cloudfront get-distribution-config --id E1A2B3C4D5E6F7 --region us-east-1 --output json` and verify the function ARN appears in the right behavior and event type.
3. **Check the right CloudWatch region.** For Lambda@Edge, check the region nearest to where you're making test requests.
4. **Check CloudFront metrics.** In the CloudWatch console (in `us-east-1`), look at the CloudFront function metrics: invocation count, error rate, and compute utilization.
5. **Check the distribution status.** If the distribution is still deploying, your changes are not live yet. Run `aws cloudfront get-distribution --id E1A2B3C4D5E6F7 --region us-east-1 --output json` and check the `Status` field. It should be `Deployed`, not `InProgress`.
