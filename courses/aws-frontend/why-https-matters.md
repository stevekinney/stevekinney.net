---
title: 'Why HTTPS Matters'
description: >-
  Understand why HTTPS is non-negotiable for modern frontends and how SSL/TLS certificates make secure connections possible.
date: 2026-03-18
modified: 2026-03-26
tags:
  - aws
  - acm
  - https
  - security
---

If you've been deploying to Vercel or Netlify, every site you've shipped has been served over HTTPS. You probably never thought about it. There was no certificate to request, no validation step, no region to worry about. It just worked. On AWS, you need to understand what those platforms were doing for you — because now you're the one responsible for it.

**HTTPS** (HTTP over TLS) encrypts the connection between a user's browser and your server. Without it, every request and response travels in plaintext: HTML, cookies, authentication tokens, form submissions — all readable by anyone sitting between the user and your origin. That alone should be enough motivation, but the modern web has made HTTPS even more consequential than simple encryption.

## The Browser Won't Let You Ship Without It

Browsers have spent the last several years systematically locking features behind **secure contexts** — meaning the page must be served over HTTPS (or `localhost` for local development). If your production site is on plain HTTP, you lose access to APIs that modern frontends depend on:

- **Service Workers**: The foundation of offline-capable apps, background sync, and push notifications. Service Workers only register over HTTPS.
- **Geolocation API**: Any location-aware feature — store locators, delivery tracking, maps — requires a secure context.
- **`navigator.clipboard`**: Programmatic copy-paste is HTTPS-only.
- **`navigator.mediaDevices`** (camera and microphone access): Video calls, photo capture, and audio recording all require HTTPS.
- **Web Bluetooth, Web USB, Web NFC**: Hardware APIs are locked behind secure contexts.
- **HTTP/2 and HTTP/3**: Browsers only negotiate these faster protocols over TLS. Your site on plain HTTP is stuck on HTTP/1.1.

This isn't a theoretical concern. If you deploy a React app to an S3 bucket and serve it over plain HTTP, then try to register a Service Worker, the browser will reject the registration with a `SecurityError`. No warning, no fallback — it just doesn't work.

> [!WARNING]
> Chrome marks plain HTTP sites as "Not Secure" in the address bar. That label shows up right next to your domain name. For any site that handles user data — or wants to appear trustworthy — this is a dealbreaker.

## SEO and User Trust

Google has used HTTPS as a ranking signal since 2014. The impact isn't dramatic on its own, but when combined with the "Not Secure" badge in Chrome, plain HTTP sites take a hit from both directions: slightly lower search rankings and measurably higher bounce rates when users see the warning.

Beyond search engines, HTTPS is a baseline trust signal. Users have been trained (correctly) to look for the lock icon. E-commerce sites, login pages, anything that handles personal data — HTTPS is table stakes. Your marketing site might survive without it, but the moment a user needs to enter an email address, the absence of HTTPS becomes a liability. (I've seen bounce rates spike noticeably on pages with that "Not Secure" label — people just hit the back button.)

## How TLS Works (The Short Version)

You don't need to understand the cryptographic internals to use **AWS Certificate Manager (ACM)**, but a mental model of what happens during a TLS connection helps when things go wrong.

When a browser connects to your site over HTTPS, a **TLS handshake** happens before any HTTP traffic flows:

1. **Client Hello**: The browser sends a message saying "I want to connect securely" and lists the TLS versions and cipher suites it supports.
2. **Server Hello**: Your server (or CloudFront, in our case) responds with the chosen cipher suite and sends its **SSL/TLS certificate**.
3. **Certificate verification**: The browser checks the certificate against a list of trusted **Certificate Authorities (CAs)**. It verifies the certificate was issued for the correct domain, hasn't expired, and was signed by a CA the browser trusts. ACM certificates are signed by Amazon's CA, which is trusted by all major browsers.
4. **Key exchange**: The browser and server negotiate a shared secret using asymmetric cryptography. This shared secret is used to encrypt all subsequent traffic with symmetric encryption (which is much faster).
5. **Encrypted connection**: From this point forward, all HTTP requests and responses are encrypted.

The entire handshake takes milliseconds. The certificate is the critical piece — it's proof that the server is who it claims to be. Without a valid certificate, the browser shows a full-page warning and refuses to load the site.

```bash
# You can inspect a certificate from the command line
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -subject -dates -issuer
```

That command connects to a server, retrieves its certificate, and prints the subject (domain), validity dates, and issuer (the CA that signed it).

## Where AWS Certificate Manager Fits

**AWS Certificate Manager (ACM)** is AWS's free service for provisioning and managing SSL/TLS certificates. When you use ACM with CloudFront (which we'll set up in a later module), you get:

- **Free certificates**: ACM public certificates cost nothing. No annual renewal fees, no per-domain charges.
- **Automatic renewal**: ACM renews certificates before they expire, as long as the certificate is in use and the validation records are in place.
- **Managed private keys**: ACM handles the private key for you. You never download it, never store it, never rotate it manually.

Compare this to the traditional workflow: buy a certificate from a CA, generate a CSR, submit the CSR, wait for validation, download the certificate, install it on your server, set a calendar reminder to renew it in a year, and hope you don't forget. ACM eliminates almost every step.

> [!TIP]
> ACM certificates are free, but they only work with AWS services — CloudFront, Elastic Load Balancing, API Gateway, and a few others. You can't download the certificate and install it on a server you manage outside AWS. If you need that, you'll need a certificate from a traditional CA or Let's Encrypt.

## The Mental Model

Think of it this way: HTTPS is the lock on the front door. The SSL/TLS certificate is the key that proves you own the door. ACM is the **locksmith** that cuts the key for free and replaces it before it wears out. You still need to install the lock (attach the certificate to CloudFront), and you still need to prove you own the door (domain validation) — but the hard part of managing the key itself is handled for you.

Now that you know why all of this matters, let's walk through requesting a certificate in ACM — the first step toward serving your frontend over HTTPS on AWS.
