---
title: Best Practices with tRPC
description: Learn key best practices for developing robust and maintainable tRPC applications.
modified: 2025-03-15T16:39:33-06:00
---

### Keep routers modular

### Validate everything

### Auth

### Security

    - Use HTTPS in production (duh).
    - Rate limit if needed.
    - Store passwords securely (hash them, don’t store in plain text like these examples).
    - Parameterize SQL queries or use an ORM.

### Versioning

### Performance

    - Batching is enabled with `httpBatchLink`.
    - For heavier real-time usage, consider WebSockets.
    - Use indexing and caching if queries get big.

### Testing

### Monorepo
