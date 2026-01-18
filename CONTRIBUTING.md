# Contributing

## Setup

- Install Bun 1.1.0 and Node 20.11.0.
- Run `bun install`.
- If you work with large assets, run `git lfs install`.

## Development

- `bun dev` (default at `http://localhost:4444`)
- `bun dev --open` to launch a browser tab

## Fast checks (local)

- `bun run lint`
- `bun run check`
- `bun run test:unit`
- `bun run content:validate`

## Full checks (CI parity)

- `bun run lint`
- `bun run check`
- `bun run test:unit`
- `bun run test:integration` (builds first, then runs Playwright)

## Integration tests (reuse a running server)

If you already have a preview server running, you can skip the build step:

```bash
bun run build
bun run preview -- --host 127.0.0.1 --port 4445 --strictPort
bun run test:integration:dev
```

Set `PLAYWRIGHT_BASE_URL` or `PLAYWRIGHT_PORT` if you use a different host/port.

## Bundle stats

`bun run build:stats` generates `build/stats.html` and `build/stats.json`.

## Cleaning

`bun run clean` removes build artifacts and caches.
