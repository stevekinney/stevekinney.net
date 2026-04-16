---
title: Deploying Scratch Lab to CloudFront
description: >-
  Replace the playground site with the Scratch Lab React application on your
  existing S3 and CloudFront infrastructure, and discover the routing behavior
  that edge functions improve.
date: 2026-04-16
modified: 2026-04-16
tags:
  - aws
  - scratch-lab
  - deployment
  - cloudfront
---

Up to this point, you've been deploying a four-file playground site: an `index.html`, a stylesheet, a script, and an error page. That was intentional. When you're learning S3 bucket policies and CloudFront cache behaviors, the last thing you need is a React build step muddying the feedback loop. But the playground site has done its job. You understand the pipeline. Now it's time to put a real application on it.

[Scratch Lab](https://github.com/stevekinney/scratch-lab) is a notepad application built with React, TypeScript, and Vite. It has client-side routing (`/`, `/notes/:id`), a real component tree, and enough complexity to expose the problems that edge functions exist to solve. You're going to build it, deploy the output to your existing S3 bucket, and see what happens.

> [!NOTE] This is the app for the rest of the course
> From here on, Scratch Lab is what you're building on. The Lambda and API Gateway sections add a backend. DynamoDB adds persistence. Secrets Manager stores credentials. By the end of the course, this notepad is a full-stack application deployed entirely on AWS.

## Clone and Build

If you haven't already, clone the Scratch Lab repository:

```bash
git clone https://github.com/stevekinney/scratch-lab.git
cd scratch-lab
npm install
```

Build the application:

```bash
npm run build
```

This produces a `dist/` directory with Vite's standard output:

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-BzcUcrld.js
    └── index-DiDi9kH6.css
```

Notice what's _not_ here: there's no `notes/` directory, no `notes/abc123/index.html`. Every route in the application—`/`, `/notes/abc123`, `/not-found`—is handled by client-side JavaScript. The single `index.html` loads the JS bundle, and a custom router reads `window.location.pathname` to decide what to render.

This is the same architecture as any Vite, Create React App, or Next.js static export build. And it's the architecture that's about to behave in ways you might not expect on your CloudFront distribution.

## Deploy to Your S3 Bucket

Replace the playground files with the Scratch Lab build output:

```bash
aws s3 sync ./dist s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete \
  --output json
```

The `--delete` flag removes the old playground files (`app.js`, `styles.css`, `error.html`). Your S3 bucket now contains only the Scratch Lab build.

Invalidate the CloudFront cache so edge locations pick up the new files:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*" \
  --region us-east-1 \
  --output json
```

Wait a minute or two, then visit your CloudFront domain in a browser. You should see the Scratch Lab notepad interface instead of the playground page.

## What Happens with Client-Side Routes

The app loads fine at the root URL. Click around—create a note, navigate to it. The URL bar updates to something like `/notes/abc123`. Everything works because the client-side router handles navigation with `history.pushState`, and the browser never makes a new request to CloudFront.

Now **refresh the page** while you're on `/notes/abc123`.

This is where it gets interesting. You configured custom error responses in the [CloudFront distribution exercise](cloudfront-distribution-exercise.md)—403 and 404 errors from S3 get intercepted and serve `/index.html` with a 200 status code. So the page actually loads. The SPA router picks up the path, finds the note, and renders it. From the user's perspective, it works.

But check the HTTP response:

```bash
curl -I https://YOUR_CLOUDFRONT_DOMAIN/notes/abc123
```

Status code: **200 OK**. That's correct for this URL—it's a valid route.

Now try a path that doesn't exist in your app:

```bash
curl -I https://YOUR_CLOUDFRONT_DOMAIN/totally-fake-path
```

Status code: still **200 OK**. The SPA renders its "not found" component, but the HTTP status says everything is fine. Try `/settings`, `/admin`, `/notes/` (with a trailing slash)—all 200.

This matters for two reasons:

1. **Search engines.** Google indexes pages based on HTTP status codes. A 200 on `/totally-fake-path` tells crawlers it's a real page worth indexing. You end up with junk in your search results.
2. **Monitoring.** If every path returns 200, you can't distinguish real traffic from broken links, bots hitting random paths, or misconfigured redirects from other sites.

The custom error responses got you 90% of the way—the app works for users. But the HTTP semantics are wrong, and that's exactly the kind of problem that edge functions solve.

## What You'll Fix Next

In the next few lessons, you'll learn the difference between CloudFront Functions and Lambda@Edge, then:

1. **Write a CloudFront Function** that rewrites URLs before they reach S3—so CloudFront requests `/index.html` directly instead of waiting for S3 to return a 403 and then intercepting it.
2. **Write a Lambda@Edge function** that checks the original URL against your app's known routes and returns a proper 404 status code for paths that don't match.

The result: your SPA routes work correctly, static assets are served directly, and unknown paths return 404 with the right HTTP semantics.
