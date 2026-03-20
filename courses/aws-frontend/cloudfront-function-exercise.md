---
title: 'Exercise: Add a CloudFront Function to Your Distribution'
description: >-
  Write a CloudFront Function that adds security headers and redirects a legacy
  URL path, then deploy it to your distribution.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - cloudfront-functions
  - exercise
---

You are going to write and deploy two CloudFront Functions: one that adds security headers to every response and one that redirects a legacy URL to a new path. By the end of this exercise, your CloudFront distribution will enforce security headers on all responses and automatically redirect `/old-path` to `/new-path` — without touching your origin or your application code.

## Why It Matters

On Vercel or Netlify, you configure security headers in a `vercel.json` or `_headers` file. On AWS, you can use a CloudFront response headers policy (which you set up in [CloudFront Headers, CORS, and Security](cloudfront-headers-cors-and-security.md)), but that approach is static configuration. A CloudFront Function gives you **programmable** control over headers — you can add headers conditionally, vary them by path, or include dynamic values. And for redirects, a CloudFront Function replaces what would otherwise be a redirect rule baked into your application code.

This exercise reinforces the CloudFront Functions workflow: write the function, test it, publish it, associate it with a behavior. Once you have this workflow down, you can adapt it for any of the use cases in [Edge Function Use Cases](edge-function-use-cases.md).

## Your Task

Build and deploy two CloudFront Functions:

1. **`security-headers`** — A viewer response function that adds security headers to every response from your distribution.
2. **`legacy-redirect`** — A viewer request function that redirects requests for `/old-path` to `/new-path` with a 301 status code.

Use the distribution `E1A2B3C4D5E6F7`, account `123456789012`, and region `us-east-1`.

## Step 1: Write the Security Headers Function

Write a CloudFront Function that adds these headers to every response:

- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Referrer-Policy`: `strict-origin-when-cross-origin`

The function should:

- Be named `security-headers`
- Use the `cloudfront-js-2.0` runtime
- Trigger on `viewer-response` events
- Preserve any existing response headers (do not overwrite the entire headers object)

### Checkpoint

You have a JavaScript function that takes an event, adds four headers to `event.response.headers`, and returns the response.

## Step 2: Create and Test the Security Headers Function

Use the AWS CLI to create the function with `aws cloudfront create-function`. Save the `ETag` from the response.

Test the function with a sample viewer response event. The test event should include a basic response object with `statusCode: 200` and at least one existing header (like `content-type`).

Verify that:

- The function executes without errors
- The four security headers appear in the output response
- The original `content-type` header is preserved

### Checkpoint

`aws cloudfront test-function` returns a successful result with all four security headers in the response and the original headers intact.

## Step 3: Write the Legacy Redirect Function

Write a CloudFront Function that:

- Checks if the request URI is `/old-path`
- If it matches, returns a 301 redirect response with the `Location` header set to `/new-path`
- If it does not match, passes the request through unchanged

The function should:

- Be named `legacy-redirect`
- Use the `cloudfront-js-2.0` runtime
- Trigger on `viewer-request` events

### Checkpoint

You have a JavaScript function that returns a 301 response for `/old-path` and returns the unmodified request for all other paths.

## Step 4: Create and Test the Legacy Redirect Function

Create the function using the CLI and test it with two different events:

1. A request to `/old-path` — should return a 301 response with `Location: /new-path`
2. A request to `/about` — should return the request unchanged (pass-through)

### Checkpoint

Both test cases produce the expected output: a redirect for `/old-path` and a pass-through for `/about`.

## Step 5: Publish Both Functions

Publish both functions from `DEVELOPMENT` to `LIVE` using `aws cloudfront publish-function`. Remember that each publish requires the current `ETag`.

### Checkpoint

Both functions are in the `LIVE` stage. You can verify with `aws cloudfront describe-function --name security-headers --stage LIVE --region us-east-1 --output json`.

## Step 6: Associate Both Functions with Your Distribution

Retrieve your distribution configuration and update the default cache behavior to include both function associations:

- `legacy-redirect` on the `viewer-request` event
- `security-headers` on the `viewer-response` event

Remember: a single behavior can have **one** function per event type. You are attaching two different functions to two different events on the same behavior.

After updating, wait for the distribution status to change from `InProgress` to `Deployed`.

### Checkpoint

`aws cloudfront get-distribution-config --id E1A2B3C4D5E6F7 --region us-east-1 --output json` shows both function associations in the default cache behavior.

## Step 7: Verify in Production

Test the security headers by making a request to your distribution and inspecting the response headers:

```bash
curl -I https://d111111abcdef8.cloudfront.net/
```

Test the redirect:

```bash
curl -I https://d111111abcdef8.cloudfront.net/old-path
```

### Checkpoint

- The security headers response includes `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`
- The `/old-path` request returns a `301 Moved Permanently` with `Location: /new-path`

## Checkpoints Summary

- [ ] `security-headers` function adds four headers to viewer responses
- [ ] `legacy-redirect` function returns a 301 for `/old-path` and passes through other requests
- [ ] Both functions pass `test-function` with expected output
- [ ] Both functions are published to `LIVE`
- [ ] Both functions are associated with the default behavior on distribution `E1A2B3C4D5E6F7`
- [ ] `curl -I` confirms security headers in the response
- [ ] `curl -I /old-path` confirms the 301 redirect

## Stretch Goals

- **Add a `Content-Security-Policy` header.** Extend the security headers function with a CSP directive. Start with `default-src 'self'` and adjust based on what your site actually loads.

- **Redirect multiple paths.** Extend the redirect function to handle a map of old-to-new paths instead of a single hardcoded path. Keep the function under 10 KB.

- **Combine both functions into one.** You cannot have two CloudFront Functions on the same event type for one behavior. But can you handle both security headers (viewer response) and redirects (viewer request) with a single function if they are on different events? Hint: you cannot — they require different event types. But this is worth thinking about to understand the constraint.

When you are ready, check your work against the [Solution: Add a CloudFront Function to Your Distribution](cloudfront-function-solution.md).
