---
title: 'Static Website Hosting on S3'
description: >-
  Enable S3 static website hosting, configure an index document and error document, and access your site through the S3 website endpoint.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - s3
  - hosting
  - static-sites
---

You have an S3 bucket with files in it and a bucket policy that allows public reads. But if you navigate to `https://my-frontend-app-assets.s3.us-east-1.amazonaws.com/` right now, you get an XML error page — S3 doesn't know you want it to serve `index.html` when someone hits the root URL. That's because S3's default behavior is object storage, not web hosting. To turn your bucket into an actual website, you need to enable **static website hosting**.

## What Static Website Hosting Adds

Without static website hosting, S3 is a key-value store. You request a specific key, you get a specific object. Request a key that doesn't exist, you get an XML error. Request the root path, you get nothing useful.

Enabling static website hosting gives you three things:

1. **An index document** — S3 serves a default file (typically `index.html`) when someone requests a path that ends with `/`. This is the behavior you expect from any web server.
2. **An error document** — S3 serves a custom error page instead of its default XML error when a requested key doesn't exist.
3. **A website endpoint** — S3 gives you a dedicated URL that serves your bucket as a website, with the index and error document behavior enabled.

This is the difference between "I uploaded files to cloud storage" and "I have a website."

## Enabling Static Website Hosting

You can enable it with a single CLI command:

```bash
aws s3 website s3://my-frontend-app-assets/ \
  --index-document index.html \
  --error-document error.html
```

That's it. Your bucket is now configured to serve `index.html` as the default document and `error.html` for any 404 errors.

If you want more control or need to script this in a pipeline, use the lower-level `s3api` command:

```bash
aws s3api put-bucket-website \
  --bucket my-frontend-app-assets \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "error.html"}
  }' \
  --region us-east-1
```

You can verify the configuration:

```bash
aws s3api get-bucket-website \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

```json
{
  "IndexDocument": {
    "Suffix": "index.html"
  },
  "ErrorDocument": {
    "Key": "error.html"
  }
}
```

## The Website Endpoint URL

Once static website hosting is enabled, S3 gives you a dedicated website endpoint. The format depends on your region:

```
http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com
```

Some regions use a slightly different format with a dot instead of a hyphen:

```
http://my-frontend-app-assets.s3-website.us-east-1.amazonaws.com
```

For `us-east-1`, the format is `s3-website-us-east-1` (with a hyphen before the region name).

> [!WARNING]
> S3 website endpoints only support HTTP, not HTTPS. If you load your site over the S3 website URL, the browser will show it as "Not Secure." This is one of the main reasons you'll add CloudFront in Module 4 — CloudFront gives you HTTPS with an SSL certificate from ACM. For now, HTTP is fine for testing and development.

## How the Index Document Works

With static website hosting enabled, S3 handles root and directory requests the way you expect from a web server:

- **`/`** serves `index.html` from the bucket root
- **`/about/`** serves `about/index.html` (if it exists)
- **`/about`** (without trailing slash) does **not** automatically resolve to `about/index.html` — this catches people off guard

That last point is important. If you have a file at the key `about/index.html` and someone navigates to `/about` (no trailing slash), S3 returns a 404. The trailing slash matters because S3 only looks for the index document suffix when the path ends with `/`. I mean, it makes sense once you remember that S3 isn't really a web server — it's object storage pretending to be one.

For a single-page application where all routing happens client-side, this is mostly irrelevant — you only have one `index.html` at the root, and every path that doesn't match a real file should fall through to the error document (which you configure to also be `index.html`). More on that in a moment.

> [!TIP]
> If you're deploying a multi-page static site (not a single-page app), make sure your build tool generates `index.html` files inside each directory. For example, an "about" page should live at `about/index.html`, not `about.html`. This ensures that both `/about/` and links to the directory work correctly.

## Configuring the Error Document for SPAs

If you're deploying a single-page application (React Router, Vue Router, or similar), you need every unmatched route to serve your `index.html` so the client-side router can handle it. On Vercel or Netlify, you configure this with a `rewrites` rule. On S3, you set the error document to `index.html`:

```bash
aws s3 website s3://my-frontend-app-assets/ \
  --index-document index.html \
  --error-document index.html
```

Now when someone navigates to `/dashboard/settings` and no object exists at that key, S3 serves `index.html` with a 404 status code. Your client-side router picks it up and renders the right page.

There's a catch: S3 still returns a 404 HTTP status code, even though the user sees a valid page. Search engines and some tools interpret that 404 as a broken page. This is another reason CloudFront is important — in Module 4, you'll configure CloudFront's custom error responses to return a 200 status code when serving the SPA fallback.

## Creating an Error Page

If you're not building a SPA, create a proper error page. A simple `error.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Not Found</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: #f5f5f5;
      }
      .error {
        text-align: center;
      }
      h1 {
        font-size: 4rem;
        margin: 0;
        color: #333;
      }
      p {
        color: #666;
        font-size: 1.2rem;
      }
      a {
        color: #0066cc;
      }
    </style>
  </head>
  <body>
    <div class="error">
      <h1>404</h1>
      <p>This page does not exist.</p>
      <p><a href="/">Go back home</a></p>
    </div>
  </body>
</html>
```

Upload it to the bucket:

```bash
aws s3 cp ./error.html s3://my-frontend-app-assets/error.html \
  --content-type "text/html" \
  --region us-east-1
```

## Putting It All Together

Here's the complete sequence to go from zero to a working S3-hosted website. If you've been following along, you've already done most of these steps:

```bash
# 1. Create the bucket
aws s3 mb s3://my-frontend-app-assets \
  --region us-east-1

# 2. Disable Block Public Access
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region us-east-1

# 3. Apply the bucket policy
aws s3api put-bucket-policy \
  --bucket my-frontend-app-assets \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::my-frontend-app-assets/*"
      }
    ]
  }' \
  --region us-east-1

# 4. Enable static website hosting
aws s3 website s3://my-frontend-app-assets/ \
  --index-document index.html \
  --error-document error.html

# 5. Upload your files
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1 \
  --delete
```

Open `http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com` in your browser. You should see your site.

## What S3 Hosting Doesn't Give You

S3 static website hosting is a starting point, not a complete solution. Here's what you're missing:

- **HTTPS** — S3 website endpoints are HTTP only. You need CloudFront and an ACM certificate for HTTPS.
- **Global performance** — S3 serves files from a single region. Users on the other side of the world get higher latency. CloudFront caches files at edge locations worldwide.
- **Custom domain** — The S3 website endpoint isn't a pretty URL. You need Route 53 (or another DNS provider) to use your own domain.
- **Cache control** — S3 serves files with default caching headers. CloudFront gives you fine-grained control over cache behavior and TTLs.

All of these gaps are filled by services covered in later modules. S3 is the foundation — the place your files live. CloudFront, ACM, and Route 53 are the layers that turn it into a production-grade deployment.

Your site is live on S3, but what happens when you accidentally overwrite a file or delete something you shouldn't have? Next, you'll enable **versioning** to protect against accidental data loss, set up lifecycle rules to manage storage costs, and understand how S3 pricing works so there are no surprises on your bill.
