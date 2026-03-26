---
title: 'Solution: Deploy a Static Site to S3'
description: >-
  Complete solution with all commands and expected output for deploying a static site to S3.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - s3
  - exercise
  - solution
---

This is the complete solution for the S3 static site deployment exercise. Every command is shown with its expected output so you can verify each step.

## Create the Static Site Files

Create a `build/` directory with four files:

```bash
mkdir -p build
```

Create `build/index.html`:

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

Create `build/styles.css`:

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

Create `build/app.js`:

```javascript
document.getElementById('timestamp').textContent =
  'Page loaded at: ' + new Date().toLocaleTimeString();
```

Create `build/error.html`:

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

```bash
aws s3 mb s3://my-frontend-app-assets \
  --region us-east-1
```

Expected output:

```
make_bucket: my-frontend-app-assets
```

Verify:

```bash
aws s3 ls --region us-east-1
```

Expected output (your date will differ):

```
2026-03-18 12:00:00 my-frontend-app-assets
```

## Disable Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket my-frontend-app-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region us-east-1
```

This command produces no output on success.

Verify:

```bash
aws s3api get-public-access-block \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "PublicAccessBlockConfiguration": {
    "BlockPublicAcls": false,
    "IgnorePublicAcls": false,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
  }
}
```

## Apply the Bucket Policy

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

This command produces no output on success.

Verify:

```bash
aws s3api get-bucket-policy \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output (the policy is returned as a JSON string inside the `Policy` field):

```json
{
  "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicReadGetObject\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::my-frontend-app-assets/*\"}]}"
}
```

## Upload Files

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1
```

Expected output:

```
upload: build/app.js to s3://my-frontend-app-assets/app.js
upload: build/error.html to s3://my-frontend-app-assets/error.html
upload: build/index.html to s3://my-frontend-app-assets/index.html
upload: build/styles.css to s3://my-frontend-app-assets/styles.css
```

Verify:

```bash
aws s3 ls s3://my-frontend-app-assets/ \
  --region us-east-1
```

Expected output (sizes and dates will differ):

```
2026-03-18 12:00:00         98 app.js
2026-03-18 12:00:00        587 error.html
2026-03-18 12:00:00        488 index.html
2026-03-18 12:00:00        374 styles.css
```

## Enable Static Website Hosting

```bash
aws s3 website s3://my-frontend-app-assets/ \
  --index-document index.html \
  --error-document error.html
```

This command produces no output on success.

Verify:

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

Open this URL in your browser:

```
http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com
```

You should see:

- The heading "Hello from S3" centered on a dark background
- The text "This site is hosted entirely on Amazon S3."
- A timestamp showing when the page loaded

Test the error page by navigating to a nonexistent path:

```
http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com/nonexistent
```

You should see the custom 404 page with "This page does not exist."

You can also verify with `curl`:

```bash
curl -s http://my-frontend-app-assets.s3-website-us-east-1.amazonaws.com | head -5
```

Expected output:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
</html>
```

## Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket my-frontend-app-assets \
  --versioning-configuration Status=Enabled \
  --region us-east-1
```

This command produces no output on success.

Verify:

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

## Deploy an Update and Verify Versioning

Edit `build/index.html` and change the `<h1>` tag:

```html
<h1>Hello from S3 (v2)</h1>
```

Redeploy:

```bash
aws s3 sync ./build s3://my-frontend-app-assets \
  --region us-east-1
```

Expected output (only the changed file uploads):

```
upload: build/index.html to s3://my-frontend-app-assets/index.html
```

Verify that versioning captured both versions:

```bash
aws s3api list-object-versions \
  --bucket my-frontend-app-assets \
  --prefix "index.html" \
  --region us-east-1 \
  --output json
```

Expected output (version IDs will differ):

```json
{
  "Versions": [
    {
      "Key": "index.html",
      "VersionId": "3HL4kqtJvjVBH40Nrjfkd",
      "IsLatest": true,
      "LastModified": "2026-03-18T14:00:00.000Z",
      "Size": 493,
      "StorageClass": "STANDARD"
    },
    {
      "Key": "index.html",
      "VersionId": "2LB2z3tPdN2aRFGhK0mRr",
      "IsLatest": false,
      "LastModified": "2026-03-18T12:00:00.000Z",
      "Size": 488,
      "StorageClass": "STANDARD"
    }
  ]
}
```

The first entry (`IsLatest: true`) is the updated version with "Hello from S3 (v2)". The second entry is the original version.

## Stretch Goal: Add a Lifecycle Rule

Create a file called `lifecycle.json`:

```json
{
  "Rules": [
    {
      "ID": "DeleteOldVersions",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 7
      }
    }
  ]
}
```

Apply it:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-frontend-app-assets \
  --lifecycle-configuration file://lifecycle.json \
  --region us-east-1
```

Verify:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket my-frontend-app-assets \
  --region us-east-1 \
  --output json
```

Expected output:

```json
{
  "Rules": [
    {
      "ID": "DeleteOldVersions",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 7
      }
    }
  ]
}
```

## Stretch Goal: Test a Rollback

Download the previous version using its version ID (use the actual version ID from your `list-object-versions` output):

```bash
aws s3api get-object \
  --bucket my-frontend-app-assets \
  --key "index.html" \
  --version-id "2LB2z3tPdN2aRFGhK0mRr" \
  --region us-east-1 \
  --output json \
  index-old.html
```

Re-upload it as the current version:

```bash
aws s3 cp index-old.html s3://my-frontend-app-assets/index.html \
  --region us-east-1
```

Refresh the browser — you should see the original "Hello from S3" heading (without "(v2)").

## Stretch Goal: Verify Content Types

Check the content type of your CSS file:

```bash
aws s3api head-object \
  --bucket my-frontend-app-assets \
  --key "styles.css" \
  --region us-east-1 \
  --output json
```

Expected output (partial):

```json
{
  "ContentType": "text/css",
  "ContentLength": 374,
  "LastModified": "2026-03-18T12:00:00.000Z"
}
```

The `ContentType` should be `text/css`. Check your JavaScript file the same way — it should be `application/javascript`.

## Summary

You have deployed a static site to S3 with:

- A publicly accessible bucket with a bucket policy
- Static website hosting with index and error documents
- Versioning enabled for rollback protection
- A lifecycle rule to clean up old versions

This is the foundation that every other module in this course builds on top of. In the next module, you'll request an SSL certificate from ACM. In Module 4, you'll put CloudFront in front of this bucket to add HTTPS, global edge caching, and a proper deployment workflow.
