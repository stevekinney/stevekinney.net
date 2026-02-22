---
title: Building and Development Scripts
description: >-
  Set up essential build and development scripts for React TypeScript projects,
  including dev servers, builds, testing, and linting.
date: 2025-09-20T18:00:00.000Z
modified: '2025-09-20T10:40:36-06:00'
---

## Building and Development Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx,json,css,md}"
  }
}
```

Create a simple `vite.config.ts`:

```tsx
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
```
