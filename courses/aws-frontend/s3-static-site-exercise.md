---
title: 'Exercise: Deploy a Static Site to S3'
description: >-
  Create a bucket, upload a static site, enable website hosting, and access it in the browser.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - s3
  - exercise
  - deployment
---

You've learned the individual pieces: creating a bucket, uploading files, writing a bucket policy, enabling static website hosting, and configuring versioning. Now put them all together. In this exercise, you'll deploy a complete static site to S3 and access it in a browser.

## Why It Matters

Every frontend deployment is fundamentally the same: take build output, put it somewhere accessible, and point a URL at it. Vercel and Netlify hide this process behind a `git push`. Doing it manually on S3 teaches you what actually happens under the hood — and gives you the foundation for the automated pipeline you'll build later in this course.

## Set Up Your Static Site

Create a minimal static site on your local machine. You don't need a framework — plain HTML, CSS, and JavaScript are enough.

Create a directory called `build/` with these three files:

**`build/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My S3 Static Site</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="container">
      <h1>Hello from S3</h1>
      <p>This site is hosted entirely on Amazon S3.</p>
      <p id="timestamp"></p>
    </div>
    <script src="app.js"></script>
  </body>
</html>
```

**`build/styles.css`**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0a0a;
  color: #ededed;
}

.container {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2rem;
  color: #999;
  margin-bottom: 0.5rem;
}
```

**`build/app.js`**

```javascript
document.getElementById('timestamp').textContent =
  'Page loaded at: ' + new Date().toLocaleTimeString();
```

**`build/error.html`**

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
        background: #0a0a0a;
        color: #ededed;
      }
      .error {
        text-align: center;
      }
      h1 {
        font-size: 4rem;
      }
      a {
        color: #4a9eff;
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

## Create the Bucket

Create an S3 bucket. Remember that bucket names are globally unique — if `my-frontend-app-assets` is taken, add a unique suffix.

```bash
aws s3 mb s3://my-frontend-app-assets \
  --region us-east-1
```

### Checkpoint

Run `aws s3 ls --region us-east-1` and confirm your bucket appears in the list.

## Disable Block Public Access

Since you're hosting a public website, disable Block Public Access:

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region us-east-1
```

### Checkpoint

Run the following and confirm all four settings are `false`:

```bash
aws s3api get-public-access-block \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

## Apply a Bucket Policy

Apply a bucket policy that allows public read access:

```bash
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
```

### Checkpoint

Run `aws s3api get-bucket-policy --bucket my-frontend-app-assets --region us-east-1 --output json` and confirm the policy is in place.

## Upload Your Files

Sync your local `build/` directory to the bucket:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1
```

### Checkpoint

Run `aws s3 ls s3://my-frontend-app-assets/ --region us-east-1` and confirm you see all four files: `index.html`, `styles.css`, `app.js`, and `error.html`.

Expected output:

```
2026-03-18 12:00:00        456 app.js
2026-03-18 12:00:00        612 error.html
2026-03-18 12:00:00        534 index.html
2026-03-18 12:00:00        423 styles.css
```

## Enable Static Website Hosting

Configure the bucket for static website hosting:

```bash
aws s3 website s3://my-frontend-app-assets/ \
  --index-document index.html \
  --error-document error.html
```

### Checkpoint

Run the following and confirm the index and error documents are set:

```bash
aws s3api get-bucket-website \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output:

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

## View Your Site

Open this URL in your browser (substitute your actual bucket name):

```
http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com
```

You should see the "Hello from S3" page with a timestamp showing the current time. The CSS should be applied (dark background, centered text) and the JavaScript should be running (timestamp updates on each page load).

### Checkpoint

- The page loads and displays "Hello from S3"
- The CSS is applied (dark background, light text)
- The timestamp appears at the bottom
- Navigating to a nonexistent path (like `/nonexistent`) shows your custom 404 page

## Enable Versioning

Enable versioning so you're protected against accidental overwrites:

```bash
aws s3api put-bucket-versioning \
  --bucket my-frontend-app-assets \
  --versioning-configuration Status=Enabled \
  --region us-east-1
```

### Checkpoint

```bash
aws s3api get-bucket-versioning \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "Status": "Enabled"
}
```

## Deploy an Update

Make a change to `build/index.html` — update the `<h1>` to say "Hello from S3 (v2)". Then redeploy:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1
```

Refresh your browser. You should see the updated heading. Now list the versions of `index.html`:

```bash
aws s3api list-object-versions \
  --bucket my-frontend-app-assets \
  --prefix "index.html" \
  --region us-east-1 \
  --output json
```

### Checkpoint

You should see two versions of `index.html` — the original and the updated one. The `IsLatest` field on the newer version should be `true`.

## Stretch Goals

- **Add a lifecycle rule** that deletes noncurrent versions after 7 days. Verify it with `get-bucket-lifecycle-configuration`.
- **Test a rollback.** Download the previous version of `index.html` using its version ID, then re-upload it with `aws s3 cp`. Confirm the site reverts to the original content.
- **Add a subdirectory.** Create a `build/about/index.html` page and verify that navigating to `/about/` (with trailing slash) serves the page.
- **Check content types.** Run `aws s3api head-object --bucket my-frontend-app-assets --key "styles.css" --region us-east-1 --output json` and verify the content type is `text/css`.
