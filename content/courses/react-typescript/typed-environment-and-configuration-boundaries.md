---
title: Typed Environment and Config Boundaries
description: >-
  Safely type environment variables—import.meta.env vs process.env,
  server/client exposure, and runtime validation.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-14T23:11:40.856Z'
published: true
tags:
  - react
  - typescript
  - env
  - configuration
  - security
  - validation
---

Environment variables are powerful—and dangerous—without types. Lock down configuration with typed loaders and clear server/client boundaries.

## Vite and `import.meta.env`

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FEATURE_FLAG?: 'on' | 'off';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Node and `process.env` with Zod

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_SECRET: z.string().min(1),
  PUBLIC_ORIGIN: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
```

## Server vs Client Exposure

- Prefix public vars (e.g., `VITE_`, `NEXT_PUBLIC_`).
- Never leak secrets through inlined config or hydration payloads.
- Validate at process start; fail fast in CI.

## Next.js Patterns

```ts
// next.config.ts (expose non-sensitive env at build time)
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};
export default nextConfig;
```

```ts
// src/env.ts (runtime validation on server)
import { z } from 'zod';

const ServerEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXTAUTH_SECRET: z.string().min(1),
});

export const serverEnv = ServerEnv.parse(process.env);
```

## Typed Config Loader

```ts
import { z } from 'zod';

const ConfigSchema = z.object({
  apiBase: z.string().url(),
  featureX: z.boolean(),
});

export function loadConfig() {
  return ConfigSchema.parse({
    apiBase: import.meta.env.VITE_API_URL,
    featureX: import.meta.env.VITE_FEATURE_FLAG === 'on',
  });
}
```

## Testing and CI

- Provide `.env.test` with minimal required vars.
- Add a CI step that runs the config loader; failing fast surfaces misconfigurations.

## See Also

- [Edge, SSR, and Runtime Types](edge-ssr-and-runtime-types.md)
- [Edge, SSR, and Hydration Payload Types](edge-ssr-hydration.md)
- [Security and Escaping Types](security-and-escaping-types.md)
- [Build Pipeline: TSC, SWC](build-pipeline-tsc-swc.md)
