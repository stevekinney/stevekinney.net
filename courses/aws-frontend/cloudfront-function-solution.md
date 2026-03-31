---
title: 'Solution: Add a CloudFront Function to Your Distribution'
description: >-
  Complete solution for the CloudFront Function exercise, with all function
  code, CLI commands, and expected output.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - cloudfront-functions
  - exercise
  - solution
---

Here's the complete solution for every step, including the function code, all CLI commands, and the expected output at each stage.

## Why This Works

- Viewer-request functions can change routing before CloudFront decides what to fetch, which is why redirects belong there.
- Viewer-response functions can mutate headers on the way out, which makes them the right place for security headers.
- Publishing to `LIVE` and associating the function with the distribution is the operational step that turns working code into real edge behavior.

## The Security Headers Function

```javascript
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubDomains; preload',
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  // [!note Setting properties on the existing headers object preserves any headers already present.]

  return response;
}
```

### Create the function

```bash
aws cloudfront create-function \
  --name security-headers \
  --function-config '{"Comment":"Add security headers to all responses","Runtime":"cloudfront-js-2.0"}' \
  --function-code 'function handler(event) { var response = event.response; var headers = response.headers; headers["strict-transport-security"] = { value: "max-age=63072000; includeSubDomains; preload" }; headers["x-content-type-options"] = { value: "nosniff" }; headers["x-frame-options"] = { value: "DENY" }; headers["referrer-policy"] = { value: "strict-origin-when-cross-origin" }; return response; }' \
  --region us-east-1 \
  --output json
```

Expected output (abbreviated):

```json
{
  "Location": "https://cloudfront.amazonaws.com/2020-05-31/function/security-headers",
  "ETag": "ETVPDKIKX0DER",
  "FunctionSummary": {
    "Name": "security-headers",
    "Status": "UNPUBLISHED",
    "FunctionConfig": {
      "Comment": "Add security headers to all responses",
      "Runtime": "cloudfront-js-2.0"
    },
    "FunctionMetadata": {
      "FunctionARN": "arn:aws:cloudfront::123456789012:function/security-headers",
      "Stage": "DEVELOPMENT"
    }
  }
}
```

Save the `ETag` value — you need it for testing and publishing.

### Test the function

```bash
aws cloudfront test-function \
  --name security-headers \
  --if-match ETVPDKIKX0DER \
  --event-object '{"version":"1.0","context":{"eventType":"viewer-response"},"viewer":{"ip":"0.0.0.0"},"request":{"method":"GET","uri":"/","querystring":{},"headers":{},"cookies":{}},"response":{"statusCode":200,"statusDescription":"OK","headers":{"content-type":{"value":"text/html"}},"cookies":{}}}' \
  --stage DEVELOPMENT \
  --region us-east-1 \
  --output json
```

Expected: The function result includes all four security headers **and** the original `content-type` header:

```json
{
  "TestResult": {
    "FunctionSummary": {
      "Name": "security-headers",
      "Status": "UNPUBLISHED"
    },
    "ComputeUtilization": "12",
    "FunctionOutput": "{\"response\":{\"statusCode\":200,\"statusDescription\":\"OK\",\"headers\":{\"content-type\":{\"value\":\"text/html\"},\"strict-transport-security\":{\"value\":\"max-age=63072000; includeSubDomains; preload\"},\"x-content-type-options\":{\"value\":\"nosniff\"},\"x-frame-options\":{\"value\":\"DENY\"},\"referrer-policy\":{\"value\":\"strict-origin-when-cross-origin\"}},\"cookies\":{}}}"
  }
}
```

The `ComputeUtilization` value should be low (well under 100). If it approaches 100, the function is too slow.

## The Legacy Redirect Function

```javascript
function handler(event) {
  var request = event.request;

  if (request.uri === '/old-path') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: '/new-path' },
      },
    };
  }

  return request;
}
```

### Create the function

```bash
aws cloudfront create-function \
  --name legacy-redirect \
  --function-config '{"Comment":"Redirect /old-path to /new-path","Runtime":"cloudfront-js-2.0"}' \
  --function-code 'function handler(event) { var request = event.request; if (request.uri === "/old-path") { return { statusCode: 301, statusDescription: "Moved Permanently", headers: { location: { value: "/new-path" } } }; } return request; }' \
  --region us-east-1 \
  --output json
```

Save the `ETag`.

### Test: request to /old-path

```bash
aws cloudfront test-function \
  --name legacy-redirect \
  --if-match ETVPDKIKX0DER \
  --event-object '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"0.0.0.0"},"request":{"method":"GET","uri":"/old-path","querystring":{},"headers":{"host":{"value":"example.com"}},"cookies":{}}}' \
  --stage DEVELOPMENT \
  --region us-east-1 \
  --output json
```

Expected: A 301 response with `location: /new-path`:

```json
{
  "TestResult": {
    "FunctionSummary": {
      "Name": "legacy-redirect",
      "Status": "UNPUBLISHED"
    },
    "ComputeUtilization": "8",
    "FunctionOutput": "{\"response\":{\"statusCode\":301,\"statusDescription\":\"Moved Permanently\",\"headers\":{\"location\":{\"value\":\"/new-path\"}}}}"
  }
}
```

### Test: request to /about (pass-through)

```bash
aws cloudfront test-function \
  --name legacy-redirect \
  --if-match ETVPDKIKX0DER \
  --event-object '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"0.0.0.0"},"request":{"method":"GET","uri":"/about","querystring":{},"headers":{"host":{"value":"example.com"}},"cookies":{}}}' \
  --stage DEVELOPMENT \
  --region us-east-1 \
  --output json
```

Expected: The request passes through unchanged — `FunctionOutput` contains the original request object with `uri: "/about"`.

## Publish Both Functions

```bash
aws cloudfront publish-function \
  --name security-headers \
  --if-match ETVPDKIKX0DER \
  --region us-east-1 \
  --output json
```

```bash
aws cloudfront publish-function \
  --name legacy-redirect \
  --if-match ETVPDKIKX0DER \
  --region us-east-1 \
  --output json
```

Replace the `ETag` values with the ones you received from the create step (or the most recent operation on each function). Each publish returns a new `ETag`.

### Verify both are LIVE

```bash
aws cloudfront describe-function \
  --name security-headers \
  --stage LIVE \
  --region us-east-1 \
  --output json
```

```bash
aws cloudfront describe-function \
  --name legacy-redirect \
  --stage LIVE \
  --region us-east-1 \
  --output json
```

Both should show `"Stage": "LIVE"` in the response.

## Associate with the Distribution

### Get the current distribution config

```bash
aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json > dist-config.json
```

### Edit the distribution config

Open `dist-config.json`. Find the `DefaultCacheBehavior` section and add the `FunctionAssociations` block:

```json
{
  "DefaultCacheBehavior": {
    "FunctionAssociations": {
      "Quantity": 2,
      "Items": [
        {
          "FunctionARN": "arn:aws:cloudfront::123456789012:function/legacy-redirect",
          "EventType": "viewer-request"
        },
        {
          "FunctionARN": "arn:aws:cloudfront::123456789012:function/security-headers",
          "EventType": "viewer-response"
        }
      ]
    }
  }
}
```

> [!TIP]
> The `get-distribution-config` response wraps the config in a `DistributionConfig` key and includes an `ETag` header. When you pass the config to `update-distribution`, you need the inner `DistributionConfig` object (not the outer wrapper) and the `ETag` as the `--if-match` value.

### Update the distribution

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match ETAG_FROM_GET \
  --distribution-config file://dist-config.json \
  --region us-east-1 \
  --output json
```

### Wait for deployment

```bash
aws cloudfront wait distribution-deployed \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1
```

This command blocks until the distribution status changes from `InProgress` to `Deployed`. It can take a few minutes.

## Verify in Production

### Check security headers

```bash
curl -I https://d111111abcdef8.cloudfront.net/
```

Expected headers in the response:

```
HTTP/2 200
content-type: text/html
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
```

### Check the redirect

```bash
curl -I https://d111111abcdef8.cloudfront.net/old-path
```

Expected:

```
HTTP/2 301
location: /new-path
```

### Check that other paths pass through

```bash
curl -I https://d111111abcdef8.cloudfront.net/about
```

Expected: A normal 200 response (or 404 if the page doesn't exist) with the security headers present and no redirect.

## Stretch Goal: Content Security Policy

Extend the security headers function to include a CSP header:

```javascript
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubDomains; preload',
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['content-security-policy'] = {
    value:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
  };

  return response;
}
```

After updating the function code with `aws cloudfront update-function`, remember to publish it again — the update only changes the DEVELOPMENT stage.

## Stretch Goal: Multiple Redirects

Replace the single path check with a redirect map:

```javascript
var redirects = {
  '/old-path': '/new-path',
  '/blog/old-post': '/blog/new-post',
  '/docs/v1': '/docs',
  '/legacy': '/',
};

function handler(event) {
  var request = event.request;
  var target = redirects[request.uri];

  if (target) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: target },
      },
    };
  }

  return request;
}
```

This scales to as many redirects as you can fit in 10 KB.
