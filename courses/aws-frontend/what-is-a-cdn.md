---
title: 'What is a CDN?'
description: >-
  Understand what a CDN does, why it matters for frontend performance, and how CloudFront fits into the AWS ecosystem.
date: 2026-03-18
modified: 2026-03-31
tags:
  - aws
  - cloudfront
  - cdn
  - performance
---

When you deploy to Vercel, your site loads fast in New York and fast in Tokyo. When you deploy to a single S3 bucket in `us-east-1`, your site loads fast in Virginia and noticeably slower everywhere else. The difference is a **CDN** — a Content Delivery Network.

You've been using CDNs your entire career, even if you've never configured one. Every time you deployed to Vercel, Netlify, or Cloudflare Pages, those platforms put a CDN between your files and your users. **CloudFront** is AWS's CDN, and it's what turns your S3 bucket from "files in one region" into "a globally distributed frontend."

## Why This Matters

CDNs are where frontend performance stops being purely an application concern and becomes a geography concern. Once users are far from your origin, the network dominates. CloudFront is the service that makes your site feel local even when the bucket is not.

## Builds On

This lesson builds on the S3 foundation from the previous module. You already have the mental model of "static files in a bucket." Now you're adding the layer that caches those files at the edge, terminates HTTPS for users, and becomes the public face of the deployment.

## The Problem: Physics

S3 stores your files in a single AWS region. If your bucket is in `us-east-1` (Northern Virginia), a user in Sydney is roughly 15,000 kilometers away. Light travels through fiber at about two-thirds the speed of light in a vacuum, and every request has to make the round trip: browser to server and back. That's physics, and you can't negotiate with physics.

A static site might need 20–30 requests to fully load: HTML, CSS, JavaScript bundles, fonts, images. Each request pays the latency tax. A user in Virginia sees the page in 200 milliseconds. A user in Sydney waits 800 milliseconds or more. Users notice the difference, and so does Google's Core Web Vitals score.

## How a CDN Fixes This

A CDN is a network of servers — called **edge locations** — distributed around the world. Instead of every request going back to your origin server (in this case, your S3 bucket), the CDN caches your content at edge locations close to your users.

Here's what happens when a user in Tokyo requests your site through CloudFront:

1. The browser resolves your domain and connects to the nearest CloudFront edge location (probably in Tokyo).
2. CloudFront checks its local cache for the requested file.
3. **Cache hit**: the file is already cached at this edge location. CloudFront returns it immediately. The request never touches S3.
4. **Cache miss**: the file isn't cached yet. CloudFront fetches it from S3 (the **origin**), returns it to the user, and caches it at the Tokyo edge location for future requests.

After the first request, every subsequent user in the Tokyo region gets the file from the local edge location — a round trip of a few milliseconds instead of a few hundred.

> [!TIP]
> This is the exact same model that Vercel and Netlify use. When Vercel serves your site globally, it's using a CDN. CloudFront is that CDN — you're just configuring it yourself instead of letting a platform abstract it away.

## CloudFront in AWS

**CloudFront** is AWS's CDN service. It has over 600 edge locations across 100+ cities in 50+ countries. When you create a CloudFront **distribution**, you're telling AWS: "Here's my content's origin, here's how I want it cached, and here's the domain I want to serve it from."

A distribution ties together several concepts you've already seen (or will see soon):

- **Origin**: Where CloudFront fetches content from. For us, that's an S3 bucket (configured in [Creating and Configuring a Bucket](creating-and-configuring-a-bucket.md)).
- **Cache behaviors**: Rules that control how CloudFront caches content — TTLs, which headers to forward, which paths to cache differently.
- **SSL certificate**: An ACM certificate that gives you HTTPS on your custom domain (covered in [Certificate Renewal and the us-east-1 Requirement](certificate-renewal-and-us-east-1.md)).
- **Custom domain**: A domain name pointing to the distribution (covered in Module 5).

Together, these produce a globally distributed, HTTPS-secured frontend served from edge locations — the same thing you get from Vercel with zero configuration, except now you control every knob.

## What CloudFront Gives You That S3 Doesn't

S3 static website hosting (configured in [Static Website Hosting on S3](static-website-hosting-on-s3.md)) gets you a working website. CloudFront turns it into a production-grade deployment:

| Capability         | S3 Website Hosting                   | S3 + CloudFront                                |
| ------------------ | ------------------------------------ | ---------------------------------------------- |
| HTTPS              | No (HTTP only)                       | Yes (with ACM certificate)                     |
| Global latency     | High (single region)                 | Low (edge locations worldwide)                 |
| Custom domain      | Limited (CNAME only, no HTTPS)       | Full support (with Route 53 alias records)     |
| Cache control      | Basic (`Cache-Control` headers only) | Fine-grained (behaviors, TTLs, invalidations)  |
| Security headers   | None                                 | Response headers policies (HSTS, CSP, etc.)    |
| Access restriction | Public bucket required               | Bucket stays private via Origin Access Control |
| DDoS protection    | Basic                                | AWS Shield Standard (included free)            |

That last row matters more than you might think. I'll be honest: I didn't appreciate AWS Shield Standard until I saw a traffic spike hit an unprotected S3 endpoint. CloudFront comes with Shield Standard at no extra cost, which provides automatic protection against common DDoS attacks. S3 website endpoints are directly exposed.

## The CloudFront Request Flow

Understanding the request flow helps you debug issues later. Here's what happens for every request to your CloudFront distribution:

1. **DNS resolution**: The user's browser resolves your domain (e.g., `example.com`) to a CloudFront edge location IP address.
2. **TLS handshake**: The browser establishes an HTTPS connection with the edge location using your ACM certificate.
3. **Cache lookup**: CloudFront checks its cache for the requested path.
4. **Cache hit**: Return the cached response. Done.
5. **Cache miss**: Forward the request to the origin (your S3 bucket).
6. **Origin response**: S3 returns the file. CloudFront caches it at the edge location according to the cache behavior's TTL settings.
7. **Response**: CloudFront returns the file to the browser.

Steps 4–6 are invisible to the user. The browser only talks to the edge location. Whether the content comes from cache or from the origin, the user sees the same response — just with different latency.

## Price Classes

CloudFront charges per request and per data transfer, with prices varying by edge location region. AWS groups edge locations into three **price classes**:

- **`PriceClass_100`**: North America, Europe, and Israel. Cheapest option.
- **`PriceClass_200`**: Everything in `PriceClass_100` plus Asia, Africa, and the Middle East.
- **`PriceClass_All`**: All edge locations worldwide, including South America, Australia, and New Zealand.

If your users are primarily in North America and Europe, `PriceClass_100` saves money without meaningfully impacting performance for your audience. If you have a global user base, `PriceClass_All` is the right choice. For most frontend projects, `PriceClass_100` is a reasonable starting point — you can always change it later.

> [!TIP]
> Choosing a lower price class doesn't make your site inaccessible from excluded regions. Users in those regions still reach your site — CloudFront just routes them to the nearest edge location in your price class, which might be farther away. They get slightly higher latency, not a broken site.

## When You Don't Need CloudFront

Not every project needs a CDN. If you're building an internal tool used by a team of ten people in the same office, S3 static website hosting is fine. If your site has three visitors a day and they're all you, skip CloudFront and save the complexity.

But the moment your site is public-facing, needs HTTPS (it does), or has users outside your S3 bucket's region, CloudFront isn't optional — it's the standard architecture. Every serious AWS deployment puts CloudFront in front of S3.

## Verification

- You can describe the difference between a cache hit and a cache miss in CloudFront's request flow.
- You can explain why a user in Sydney feels more latency from an S3 bucket in `us-east-1` even when your frontend code is identical.
- You can choose an initial price class based on user geography instead of guessing.

## Common Failure Modes

- **Thinking CloudFront is only about speed:** It also becomes your HTTPS endpoint, your caching layer, and your first security boundary in front of S3.
- **Assuming the browser talks directly to S3 once CloudFront exists:** The browser talks to the edge location. CloudFront decides whether it needs the origin.
- **Choosing a price class without thinking about audience:** That is a cost decision with latency consequences, not a random default.

Now that you know what CloudFront does and why it matters, let's actually create one. In the next lesson, you'll create a CloudFront distribution with your S3 bucket as the origin, configure it via the CLI, and see your site served from edge locations worldwide.
