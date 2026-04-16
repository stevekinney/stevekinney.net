---
title: 'S3 SDK Examples'
description: >-
  Common patterns for working with Amazon S3 using the AWS SDK for JavaScript v3, including uploads, downloads, pre-signed URLs, and multipart transfers.
date: 2026-04-16
modified: 2026-04-16
tags:
  - aws
  - s3
  - sdk
  - javascript
---

Common patterns for working with Amazon S3 using the AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`).

## Installation

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Client Setup

```ts
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'us-east-1',
  // Credentials are resolved from the environment, shared config,
  // or IAM role by default — only set them explicitly when needed.
});
```

## Upload an Object (`PutObject`)

```ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';

const body = await readFile('./hello.txt');

await s3.send(
  new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'hello.txt',
    Body: body,
    ContentType: 'text/plain',
  }),
);
```

## Download an Object (`GetObject`)

```ts
import { GetObjectCommand } from '@aws-sdk/client-s3';

const { Body } = await s3.send(
  new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'hello.txt',
  }),
);

const text = await Body!.transformToString();
console.log(text);
```

## List Objects (`ListObjectsV2`)

```ts
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

let ContinuationToken: string | undefined;
do {
  const page = await s3.send(
    new ListObjectsV2Command({
      Bucket: 'my-bucket',
      Prefix: 'uploads/',
      ContinuationToken,
    }),
  );

  for (const obj of page.Contents ?? []) {
    console.log(obj.Key, obj.Size);
  }

  ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (ContinuationToken);
```

## Delete an Object

```ts
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

await s3.send(
  new DeleteObjectCommand({
    Bucket: 'my-bucket',
    Key: 'hello.txt',
  }),
);
```

## Copy an Object

```ts
import { CopyObjectCommand } from '@aws-sdk/client-s3';

await s3.send(
  new CopyObjectCommand({
    Bucket: 'my-bucket',
    CopySource: 'my-bucket/hello.txt',
    Key: 'archive/hello.txt',
  }),
);
```

## Check Existence (`HeadObject`)

```ts
import { HeadObjectCommand, NotFound } from '@aws-sdk/client-s3';

async function exists(Bucket: string, Key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key }));
    return true;
  } catch (err) {
    if (err instanceof NotFound) return false;
    throw err;
  }
}
```

## Pre-Signed URLs

Pre-signed URLs let a client upload or download an object directly from S3 without your backend proxying the bytes. The URL carries a short-lived, scoped signature — the client doesn't need AWS credentials.

### Pre-Signed URL for Download (`GetObject`)

```ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const url = await getSignedUrl(
  s3,
  new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'reports/q1.pdf',
  }),
  { expiresIn: 60 * 5 }, // 5 minutes
);

// Hand `url` to the browser — plain GET, no auth headers.
```

### Pre-Signed URL for Upload (`PutObject`)

```ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const url = await getSignedUrl(
  s3,
  new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: `uploads/${crypto.randomUUID()}.png`,
    ContentType: 'image/png',
  }),
  { expiresIn: 60 * 15 },
);
```

On the client:

```ts
await fetch(url, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: file,
});
```

The `Content-Type` header on the `PUT` must match what was signed, or S3 rejects the request with `SignatureDoesNotMatch`.

## Multipart Upload (for Large Files)

```ts
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'node:fs';

const upload = new Upload({
  client: s3,
  params: {
    Bucket: 'my-bucket',
    Key: 'videos/large.mp4',
    Body: createReadStream('./large.mp4'),
    ContentType: 'video/mp4',
  },
  queueSize: 4,
  partSize: 5 * 1024 * 1024,
});

upload.on('httpUploadProgress', (p) => {
  console.log(`${p.loaded}/${p.total}`);
});

await upload.done();
```

## Express Example: Upload via Pre-Signed URL

A minimal Express app that hands the client a pre-signed upload URL and later reads the object back.

```ts
import express from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET = 'my-bucket';

// Generate a pre-signed URL the client can PUT to directly.
app.post('/uploads', async (req, res) => {
  const key = `uploads/${crypto.randomUUID()}.png`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: 'image/png',
    }),
    { expiresIn: 60 * 15 },
  );

  res.json({ url, key });
});

// Proxy a download back through the server (useful when the
// bucket isn't public and you don't want to hand out signed GETs).
app.get('/uploads/:key', async (req, res) => {
  const { Body, ContentType } = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: `uploads/${req.params.key}`,
    }),
  );

  res.setHeader('Content-Type', ContentType ?? 'application/octet-stream');
  // Body is a Readable stream in Node — pipe it straight through.
  Body!.transformToWebStream().pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
    }),
  );
});

app.listen(3000);
```

The client hits `POST /uploads` to get a signed URL, uploads the file directly to S3 with a `PUT`, and can later fetch it back through `GET /uploads/:key`. Your server never touches the upload bytes — S3 handles the heavy lifting.

## Common Gotchas

- **CORS**: Browser uploads via pre-signed URL need the bucket's CORS config to allow `PUT` from your origin.
- **Clock skew**: Pre-signed URLs are time-bound. A client with a badly drifted clock can get `RequestTimeTooSkewed`.
- **Signed headers must match**: Any header included when signing (e.g., `ContentType`, `ACL`, `x-amz-meta-*`) must be sent verbatim by the client.
- **Region**: The client region must match the bucket's region, or you'll get `PermanentRedirect` / 301s.
