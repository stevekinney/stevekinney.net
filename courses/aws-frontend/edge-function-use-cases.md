---
title: Edge Function Use Cases
description: >-
  Identify practical use cases for edge functions—URL rewrites, redirects,
  header injection, geolocation-based routing, and lightweight authentication
  checks.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - edge-functions
  - use-cases
---

Edge functions solve a specific category of problems: things you need to do on every request (or every response) before the client or origin sees the traffic. On platforms like Vercel or Netlify, this logic lives in configuration files, middleware, or edge functions with similar names. On AWS, it lives in CloudFront Functions or Lambda@Edge, depending on the complexity. In my experience, the URL rewrite and redirect cases come up constantly—the rest are situational but worth knowing.

This lesson covers the most common use cases for frontend engineers. Each one includes a short code snippet you can adapt. For the full comparison of when to use CloudFront Functions versus Lambda@Edge, refer back to [Lambda@Edge vs CloudFront Functions](edge-compute-comparison.md).

## URL Rewrites

URL rewrites change the request path without the client knowing. The browser still shows the original URL, but CloudFront (or the origin) serves content from a different path.

The most common rewrite for frontend engineers: translating clean URLs to actual S3 object keys.

### CloudFront Function

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Rewrite /docs/getting-started to /docs/getting-started/index.html
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
```

This is a **viewer request** function. It runs before the cache check, so CloudFront caches the content under the rewritten URI.

## Redirects

Redirects tell the browser to go to a different URL. Unlike rewrites, the client sees the new URL in the address bar.

### CloudFront Function

```javascript
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;

  // Redirect www to apex domain
  if (host === 'www.example.com') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://example.com' + request.uri },
      },
    };
  }

  return request;
}
```

You can also build a redirect map for migrated pages:

```javascript
var redirects = {
  '/old-blog': '/blog',
  '/about-us': '/about',
  '/docs/v1': '/docs',
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

> [!TIP]
> Keep the redirect map small. Your entire function must fit in 10 KB for CloudFront Functions. If you have hundreds of redirects, consider using a Lambda@Edge function with an origin request trigger, or store the redirect map externally and look it up at the origin.

## Security Headers

You can add security headers using a CloudFront response headers policy—you set one up in [CloudFront Headers, CORS, and Security](cloudfront-headers-cors-and-security.md). But if you need conditional header logic or headers that depend on the request, an edge function gives you more control.

### CloudFront Function (Viewer Response)

```javascript
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubDomains; preload',
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['content-security-policy'] = {
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  };
  // [!note Adjust the `Content-Security-Policy` directive to match your application's requirements.]

  return response;
}
```

This is a **viewer response** function. It runs after CloudFront has the response (from cache or origin) and before it sends it to the client.

## Geolocation-Based Routing

CloudFront adds geolocation headers to requests before they reach your edge function. You can use these headers to route users to region-specific content or to customize the response based on location.

### Lambda@Edge (Origin Request)

```typescript
import type { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const country = request.headers['cloudfront-viewer-country']?.[0]?.value;

  if (country === 'DE' || country === 'AT' || country === 'CH') {
    request.uri = '/de' + request.uri;
  } else if (country === 'FR') {
    request.uri = '/fr' + request.uri;
  }
  // [!note Default: serve the English version at the original URI.]

  return request;
};
```

> [!WARNING]
> The `cloudfront-viewer-country` header is only available if you've configured your cache behavior to forward it. In your distribution's cache policy or origin request policy, you must whitelist the `CloudFront-Viewer-Country` header. Without this, the header won't appear in your function's event.

This is a Lambda@Edge function because geolocation routing typically needs to run at the **origin request** level—you want the routing decision to be cacheable per country, not re-evaluated on every viewer request.

## Authentication Checks at the Edge

For private content—member-only pages, admin dashboards, staging environments—you can validate authentication before the request ever reaches your origin.

### CloudFront Function (Basic Auth for Staging)

```javascript
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var expected = 'Basic ' + 'c3RhZ2luZzpwYXNzd29yZA==';

  if (!headers.authorization || headers.authorization.value !== expected) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': { value: 'Basic realm="Staging"' },
      },
    };
  }

  return request;
}
```

This is a minimal example for protecting a staging environment with HTTP Basic Auth (username: `staging`, password: `password`). It's not a production authentication solution—the credentials are hardcoded and base64-encoded in the function.

### Lambda@Edge (JWT Validation)

For real authentication, you need Lambda@Edge because you probably need to validate a JWT, which requires either a crypto library or a network call to a JWKS endpoint.

```typescript
import type { CloudFrontRequestHandler } from 'aws-lambda';
import { verify } from 'jsonwebtoken';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
...your public key here...
-----END PUBLIC KEY-----`;

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const cookies = request.headers.cookie;

  const token = parseCookie(cookies, 'auth_token');

  if (!token) {
    return {
      status: '401',
      statusDescription: 'Unauthorized',
      body: 'Missing authentication token',
    };
  }

  try {
    verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
    return request;
  } catch {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Invalid authentication token',
    };
  }
};

function parseCookie(
  cookieHeaders: Array<{ key?: string; value: string }> | undefined,
  name: string,
): string | undefined {
  if (!cookieHeaders) return undefined;
  for (const header of cookieHeaders) {
    const match = header.value.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return undefined;
}
```

This function validates a JWT from a cookie on every viewer request. It uses the `jsonwebtoken` npm package—which is why it must be Lambda@Edge, not a CloudFront Function.

> [!TIP]
> If you embed the public key directly in the function (instead of fetching it from a JWKS endpoint), you avoid a network call on every request. The tradeoff is that you need to redeploy the function when the key rotates.

## Language Detection

Detecting the user's preferred language from the `Accept-Language` header and serving localized content is another common pattern.

### CloudFront Function

```javascript
function handler(event) {
  var request = event.request;
  var acceptLanguage = request.headers['accept-language'];

  if (acceptLanguage) {
    var lang = acceptLanguage.value.substring(0, 2).toLowerCase();
    var supported = ['en', 'es', 'fr', 'de', 'ja'];

    if (supported.indexOf(lang) !== -1) {
      request.headers['x-detected-language'] = { value: lang };
    } else {
      request.headers['x-detected-language'] = { value: 'en' };
    }
  } else {
    request.headers['x-detected-language'] = { value: 'en' };
  }

  return request;
}
```

This sets a custom header that your origin or another edge function can use to serve the right content. It runs as a **viewer request** function so the language detection happens before the cache check.

## Choosing the Right Trigger

Every use case above maps to a specific event type. Here's a quick reference:

| Use Case                  | Event Type      | Recommended                    |
| ------------------------- | --------------- | ------------------------------ |
| URL rewrites (clean URLs) | Viewer request  | CloudFront Function            |
| Redirects                 | Viewer request  | CloudFront Function            |
| Security headers          | Viewer response | CloudFront Function            |
| Geolocation routing       | Origin request  | Lambda@Edge                    |
| Basic auth for staging    | Viewer request  | CloudFront Function            |
| JWT validation            | Viewer request  | Lambda@Edge                    |
| Language detection        | Viewer request  | CloudFront Function            |
| A/B testing               | Viewer request  | Either (depends on complexity) |

The next lesson, [A/B Testing at the Edge](ab-testing-at-the-edge.md), digs into one of the more interesting use cases in detail.
