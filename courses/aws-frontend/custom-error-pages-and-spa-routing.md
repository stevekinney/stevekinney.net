---
title: 'Custom Error Pages and SPA Routing'
description: >-
  Set up custom error responses that redirect 403 and 404 errors to index.html, enabling client-side routing for single-page applications.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - cloudfront
  - spa
  - routing
---

If you've deployed a single-page application to Vercel or Netlify, you know the drill: you add a `rewrites` rule or a `_redirects` file so that every path serves `index.html`, and your client-side router (React Router, Vue Router, whatever) handles the URL. Without that rule, refreshing the page on `/dashboard/settings` returns a 404 because no file exists at that path — the server doesn't know that your JavaScript handles routing.

On AWS, the same problem exists, and the fix is CloudFront's **custom error responses**.

## The Problem

Here's what happens when a user navigates to `/dashboard/settings` on your CloudFront distribution:

1. CloudFront receives the request for `/dashboard/settings`.
2. CloudFront checks its edge cache — no cached object for that path.
3. CloudFront forwards the request to S3.
4. S3 looks for an object with the key `dashboard/settings`. No such object exists.
5. S3 returns a **403 Forbidden** error (because with Origin Access Control, S3 returns 403 instead of 404 for missing objects — helpful, right?).
6. CloudFront passes the 403 back to the browser.
7. The user sees an XML error page instead of your app.

This works fine for the initial page load at `/` (because `index.html` exists), and it works fine for hashed assets like `/assets/main.a1b2c3.js` (because those files exist in S3). But any route that only exists in your client-side router — `/dashboard`, `/settings`, `/users/123` — breaks on a direct visit or a page refresh.

> [!TIP]
> Why 403 and not 404? When you use Origin Access Control (configured in [Origin Access Control for S3](origin-access-control-for-s3.md)), S3 returns 403 Forbidden for missing objects instead of 404 Not Found. This is a security measure — S3 doesn't want to reveal whether an object exists or not to unauthorized callers. CloudFront is authorized to read from the bucket, but the object genuinely doesn't exist, so S3 returns 403. You need to handle both 403 and 404 to cover all cases.

## The Fix: Custom Error Responses

CloudFront lets you intercept specific HTTP error codes and return a different response. For SPA routing, you tell CloudFront: "When you get a 403 or 404 from the origin, return `/index.html` with a 200 status code instead."

This is the AWS equivalent of:

- **Netlify**: `/* /index.html 200` in `_redirects`
- **Vercel**: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` in `vercel.json`
- **nginx**: `try_files $uri /index.html;`

## Configuring Custom Error Responses

You add custom error responses by updating your distribution config. Fetch the current config, add the `CustomErrorResponses` block, and submit the update.

Fetch the config:

```bash
aws cloudfront get-distribution-config \
  --id E1A2B3C4D5E6F7 \
  --region us-east-1 \
  --output json > distribution-config-current.json
```

Add this `CustomErrorResponses` block to the `DistributionConfig`:

```json
{
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 10
      }
    ]
  }
}
```

Submit the update:

```bash
aws cloudfront update-distribution \
  --id E1A2B3C4D5E6F7 \
  --if-match E2QWRUHEXAMPLE \
  --distribution-config file://distribution-config-updated.json \
  --region us-east-1 \
  --output json
```

Replace `E2QWRUHEXAMPLE` with the `ETag` from the `get-distribution-config` response.

## Breaking Down the Config

### ErrorCode

The HTTP status code from the origin that triggers this custom response. You need entries for both `403` and `404`:

- **403**: S3 returns this for missing objects when using OAC. It also returns 403 if the bucket policy doesn't allow the request.
- **404**: S3 can return this in some configurations (particularly when S3 website hosting is enabled on the bucket). Including it ensures coverage regardless of your S3 setup.

### ResponsePagePath

The path to the file CloudFront should serve instead of the error. This must start with `/` and reference a file that exists in your S3 bucket. For a SPA, that's `/index.html`.

### ResponseCode

The HTTP status code CloudFront returns to the browser along with the custom response page. This is the critical field. You've got two choices:

- **`"200"`**: The browser receives `index.html` with a 200 OK status. Your client-side router processes the URL and renders the appropriate page. Search engines see a valid page.
- **`"404"`**: The browser receives `index.html` with a 404 status. Your client-side router still works for the user, but search engines interpret the page as "not found" and may de-index it.

For a SPA, use `"200"`. Every route is a valid page — the routing just happens in JavaScript rather than on the server.

### ErrorCachingMinTTL

How long (in seconds) CloudFront caches the error response at edge locations. The default is 300 seconds (5 minutes) if you omit this field. Setting it to `10` means CloudFront will re-check the origin after 10 seconds.

Why does this matter? Suppose you deploy new content and a path that previously returned a 403 now maps to a real file. With the default 5-minute TTL, users would still see the custom error response (served as `index.html`) for up to 5 minutes instead of the actual file. A lower value means faster recovery.

> [!WARNING]
> Don't set `ErrorCachingMinTTL` to `0`. CloudFront requires error responses to be cached for at least some duration. A value of `10` is a reasonable balance — short enough that errors don't persist long, but long enough that CloudFront isn't hammering your origin on every request for a missing file.

## Testing SPA Routing

After the distribution finishes deploying (check with `aws cloudfront wait distribution-deployed --id E1A2B3C4D5E6F7`), test a SPA route:

```bash
curl -I https://d1234abcdef.cloudfront.net/dashboard/settings
```

You should see:

```
HTTP/2 200
content-type: text/html
x-cache: Miss from cloudfront
```

The `200` status confirms the custom error response is working. The `x-cache: Miss from cloudfront` header tells you this wasn't cached yet. A subsequent request to the same path will show `Hit from cloudfront`.

Try it in a browser: navigate to `https://d1234abcdef.cloudfront.net/dashboard/settings` directly. If your SPA router is set up correctly, you should see the app render the dashboard settings page.

## The 200 vs. 404 Debate

Using `"ResponseCode": "200"` for all client-side routes means CloudFront returns 200 OK for genuinely missing pages too. If someone navigates to `/asdfghjkl`, they get `index.html` with a 200 status code. Your client-side router should render a "not found" page for unknown routes, but the HTTP status code is still 200.

This is the same behavior as Vercel's rewrite rules and Netlify's `_redirects`. It's a trade-off: you lose HTTP-level 404 semantics in exchange for working client-side routing. For most single-page applications, this is the correct trade-off. Your frontend router knows which routes are valid and which aren't — the CDN doesn't.

If you need proper 404 status codes for SEO purposes (e.g., a marketing site with some SPA sections), you'd handle this with a CloudFront Function or Lambda@Edge that inspects the URL and returns 404 for genuinely invalid paths. That's covered in Module 9.

## Multi-Page Sites vs. SPAs

If you're deploying a traditional multi-page static site (not a SPA), you probably don't want this configuration. A 404 for a missing page should be an actual 404, not a redirect to `index.html`. In that case, you would configure a custom error response that returns a dedicated error page:

```json
{
  "ErrorCode": 404,
  "ResponsePagePath": "/error.html",
  "ResponseCode": "404",
  "ErrorCachingMinTTL": 60
}
```

This returns your custom error page with a 404 status code — the standard behavior for a static website.

Your SPA routes work. But your site is still served on a `*.cloudfront.net` domain, and there's no custom SSL certificate. In the next lesson, you'll attach the ACM certificate you provisioned in Module 3 to your CloudFront distribution, enabling HTTPS on your custom domain.
