---
title: Writing a CloudFront Function
description: >-
  Write and deploy a CloudFront Function that manipulates viewer requests or
  responses, using the lightweight JavaScript runtime available at CloudFront
  edge locations.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - cloudfront-functions
  - javascript
---

CloudFront Functions give you a way to run lightweight JavaScript at CloudFront's edge locations — all 200+ of them — on every single request. If you've ever written a `_redirects` file on Netlify or a `next.config.js` with redirects and rewrites, you already understand the use case. The difference is that you're writing actual code instead of configuration, which means you can handle dynamic logic that static config files can't.

In this lesson, you'll write a CloudFront Function that rewrites URLs, test it in the console, publish it, and associate it with your CloudFront distribution.

## The Runtime Is Not Node.js

This is the single most important thing to internalize. The CloudFront Functions runtime is a purpose-built JavaScript engine. It's **not** Node.js. There's no `require()`, no `import`, no `Buffer`, no `process.env`, no `setTimeout`, no `fetch`. You get ECMAScript 5.1 with selected features from ES6 through ES12 — things like `let`, `const`, arrow functions, template literals, destructuring, `String.prototype.includes()`, and `Array.prototype.find()`.

What you do **not** get:

- **No network access.** You can't make HTTP requests. Period.
- **No file system access.** There's no `fs` module.
- **No dynamic code evaluation.** No `eval()`, no `new Function()`.
- **No environment variables.** You can't read `process.env`.
- **No modules.** Everything must be in a single file, under 10 KB.

This feels restrictive, but the tradeoff is speed. CloudFront Functions execute in sub-millisecond time and can handle tens of millions of requests per second. The constraints are what make that possible.

> [!TIP]
> If you need any of the features listed above — network calls, npm packages, environment variables — you need Lambda@Edge instead. See [Lambda@Edge vs CloudFront Functions](edge-compute-comparison.md) for the full comparison.

## The Function Signature

Every CloudFront Function has the same structure:

```javascript
function handler(event) {
  var request = event.request;
  // Modify the request or generate a response
  return request;
}
```

That's it. One function named `handler`, one `event` argument, and you return either the modified request (to let CloudFront continue processing) or a response object (to short-circuit and respond immediately).

### The Event Object

The `event` object has this shape for a **viewer request** trigger:

```javascript
{
  version: '1.0',
  context: {
    distributionDomainName: 'd111111abcdef8.cloudfront.net',
    distributionId: 'E1A2B3C4D5E6F7',
    eventType: 'viewer-request',
    requestId: 'abcdef123456'
  },
  viewer: {
    ip: '203.0.113.1'
  },
  request: {
    method: 'GET',
    uri: '/about',
    querystring: {},
    headers: {
      host: { value: 'example.com' },
      accept: { value: 'text/html' }
    },
    cookies: {}
  }
}
```

A few things to notice:

- **`request.uri`** is the path, not the full URL. It starts with `/`.
- **Headers** are objects with a `value` property, not plain strings. To read the `Host` header, you access `event.request.headers.host.value`.
- **Query strings** are objects too. A request to `/search?q=hello` gives you `{ q: { value: 'hello' } }`.
- **Cookies** follow the same pattern: `{ session: { value: 'abc123' } }`.

### Returning a Request vs. a Response

If you return the `request` object (potentially modified), CloudFront continues processing the request — checking the cache, forwarding to the origin if needed, and so on.

If you return a **response** object, CloudFront sends that response directly to the viewer without ever touching the cache or origin:

```javascript
function handler(event) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://example.com/new-path' },
    },
  };
}
```

## Writing a URL Rewrite Function

Here's a practical example: a function that appends `index.html` to directory-style URLs. When someone requests `/about/`, your S3 bucket doesn't know that `/about/` means `/about/index.html`. This function handles it.

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  // [!note Requests like /about become /about/index.html. Requests for /style.css pass through unchanged.]

  return request;
}
```

This is one of the most common CloudFront Functions in production. Without it, navigating directly to `/about` on a static site hosted in S3 would return a 404 or a 403 because there's no object with the key `about` — the actual object is `about/index.html`.

## Creating and Testing the Function

### Create the function

```bash
aws cloudfront create-function \
  --name url-rewrite \
  --function-config '{"Comment":"Rewrite directory URLs to index.html","Runtime":"cloudfront-js-2.0"}' \
  --function-code 'function handler(event) { var request = event.request; var uri = request.uri; if (uri.endsWith("/")) { request.uri += "index.html"; } else if (!uri.includes(".")) { request.uri += "/index.html"; } return request; }' \
  --region us-east-1 \
  --output json
```

The response includes an `ETag` value — save it. You need it for every subsequent operation on this function.

> [!WARNING]
> The `--region` flag doesn't control where the function runs. CloudFront Functions are global. The region flag tells the CLI which API endpoint to use, and CloudFront's API lives in `us-east-1`.

### Test the function

Before publishing, test the function against a sample event:

```bash
aws cloudfront test-function \
  --name url-rewrite \
  --if-match ETVPDKIKX0DER \
  --event-object '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"0.0.0.0"},"request":{"method":"GET","uri":"/about","querystring":{},"headers":{},"cookies":{}}}' \
  --stage DEVELOPMENT \
  --region us-east-1 \
  --output json
```

Replace `ETVPDKIKX0DER` with the `ETag` from the create step. The `--event-object` is a JSON representation of a viewer request event.

The response tells you whether the function succeeded and shows the output. You should see `request.uri` changed to `/about/index.html`.

### Publish the function

Testing happens on the `DEVELOPMENT` stage. To make the function available for association with a distribution, publish it to `LIVE`:

```bash
aws cloudfront publish-function \
  --name url-rewrite \
  --if-match ETVPDKIKX0DER \
  --region us-east-1 \
  --output json
```

This returns a new `ETag` — the live version's ETag. Save this one too.

## Associating with a CloudFront Behavior

A function that isn't associated with a **behavior** doesn't do anything. You need to update your CloudFront distribution to attach this function to a cache behavior — typically the default behavior (`*`).

You configured behaviors in [Cache Behaviors and Invalidations](cache-behaviors-and-invalidations.md). Now you're adding a function association to one of those behaviors.

```bash
aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json > dist-config.json
```

Edit `dist-config.json` and add a `FunctionAssociations` block inside the `DefaultCacheBehavior`:

```json
{
  "FunctionAssociations": {
    "Quantity": 1,
    "Items": [
      {
        "FunctionARN": "arn:aws:cloudfront::123456789012:function/url-rewrite",
        "EventType": "viewer-request"
      }
    ]
  }
}
```

Then update the distribution:

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match ETAG_FROM_GET \
  --distribution-config file://dist-config.json \
  --region us-east-1 \
  --output json
```

> [!TIP]
> To find the function ARN, run `aws cloudfront list-functions --region us-east-1 --output json`. Each function in the response includes its `FunctionARN`.

## Updating an Existing Function

To change the function code, use `update-function`:

```bash
aws cloudfront update-function \
  --name url-rewrite \
  --if-match CURRENT_ETAG \
  --function-config '{"Comment":"Updated URL rewrite","Runtime":"cloudfront-js-2.0"}' \
  --function-code 'function handler(event) { /* updated code */ return event.request; }' \
  --region us-east-1 \
  --output json
```

After updating, you must **publish** again to push the changes to `LIVE`. The update only changes the `DEVELOPMENT` stage. This two-stage model lets you test changes before they affect production traffic.

## Common Patterns

### Adding a trailing slash

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (!uri.endsWith('/') && !uri.includes('.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: uri + '/' },
      },
    };
  }

  return request;
}
```

### Lowercasing the URI

```javascript
function handler(event) {
  var request = event.request;
  request.uri = request.uri.toLowerCase();
  return request;
}
```

These patterns are building blocks. In [Edge Function Use Cases](edge-function-use-cases.md), you'll see more practical examples including security headers, geolocation routing, and language detection.

## Gotchas

- **10 KB code size limit.** Your entire function, including comments, must fit in 10 KB. Minify aggressively if you're approaching the limit.
- **No `async`/`await`.** The runtime doesn't support Promises. Everything is synchronous.
- **Header names must be lowercase.** When you set or read headers, use lowercase names: `content-type`, not `Content-Type`.
- **The `ETag` dance.** Every create, update, and publish operation returns a new ETag, and the next operation requires the current ETag. I've lost track of these more times than I'd like to admit — if you do too, re-fetch with `describe-function`.
