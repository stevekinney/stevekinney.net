---
name: GitHub Webhook Schemas
githubUrl: https://github.com/stevekinney/github-webhook-schemas
npmPackages:
  - github-webhook-schemas
description: 'TypeScript schemas for GitHub webhook payloads, so webhook handlers can validate reality instead of trusting whatever just hit the endpoint.'
---

[GitHub Webhook Schemas](https://github.com/stevekinney/github-webhook-schemas) is exactly what it sounds like: schemas for [GitHub](https://github.com/) webhook payloads. Webhooks are one of those places where the data is probably shaped the way you expect, until it is not, and then your handler learns philosophy in production.

The point is to put validation at the boundary. Parse the payload, prove it has the fields you intend to use, and only then let the rest of the application pretend it lives in a typed world.
