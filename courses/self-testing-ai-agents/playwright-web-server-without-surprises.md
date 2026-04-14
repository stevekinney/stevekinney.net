---
title: 'Playwright `webServer` Without Surprises'
description: "A practical guide to Playwright's `webServer` option: the common shapes, the options that matter, and the gotchas that waste half a day when you get them wrong."
modified: 2026-04-14
date: 2026-04-12
---

Most `webServer` problems don't look like `webServer` problems. They look like "the test is flaky," "the app works locally but not in CI," or my personal favorite: "Playwright says the server is ready, but the page is obviously not ready." I've lost enough time to this knob that I now treat it as infrastructure, not convenience.

[`webServer`](https://playwright.dev/docs/test-webserver) is Playwright's answer to a very specific question: _what process should be running before the test suite starts, and how do we know it is ready?_ Once you frame it that way, the option gets a lot easier to reason about.

## What `webServer` actually does

At test startup, Playwright will:

1. Spawn the command you configured.
2. Wait for a port or URL to become available.
3. Run the tests.
4. Shut the process down when the run is over.

That is the whole contract. `webServer` is not your deploy system, not your seed system, and not a substitute for application health checks. It is a process launcher with a readiness check.

The boring shape looks like this:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
});
```

That config answers the two questions that matter:

- What should start? `npm run preview ...`
- How do we know it is ready? a successful HTTP check against `http://127.0.0.1:4173`

Everything else is tuning.

## The three common shapes

Most real setups fall into one of three buckets.

### One app, one process

This is the standard `frontend starts app, Playwright hits app` flow. [Shelf](https://github.com/stevekinney/shelf-life) lives here. So do most [SvelteKit](https://kit.svelte.dev/), [Next.js](https://nextjs.org/), [Remix](https://remix.run/), and [Vite](https://vite.dev/) apps.

Use `webServer` when the app under test is local and the suite should own its lifecycle.

### Frontend plus backend

Sometimes the browser needs two processes: frontend plus API server, app plus webhook receiver, docs site plus mock identity provider. `webServer` accepts an array for exactly this reason:

```ts
export default defineConfig({
  webServer: [
    {
      name: 'app',
      command: 'npm run preview -- --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      name: 'api',
      command: 'npm run api:test',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
});
```

Use `name`. When two startup logs are interleaved, named prefixes are the difference between "obvious" and "guessing."

### Hosted target

If the thing under test is already deployed—a preview URL, a staging environment, a local container stack somebody else booted—do not add a fake local `webServer` just to make the config symmetrical. Point `baseURL` at the hosted target and leave `webServer` out entirely.

This is the common mistake in smoke suites: people inherit the end-to-end config, so the smoke tests boot a local app even though the real target is a deployed URL. That is not a smoke test anymore. That is a local regression suite wearing a smoke-test badge.

## `port` versus `url`

This is the first gotcha worth memorizing.

- `port` waits until something accepts TCP connections on that port. Note that `port` is marked **deprecated** in current Playwright docs, which direct new configs to use `url` instead.
- `url` waits until the URL returns an allowed status code.

Allowed status codes for `url` readiness are broader than people expect: `2xx`, `3xx`, `400`, `401`, `402`, and `403` all count as "server is ready." That is deliberate. The question is "is the server listening and responding?" not "did the application render the exact page I wanted?"

Use `port` when:

- you only care that the process is listening
- the app has no useful health endpoint
- you want the simplest possible local check

Use `url` when:

- you want to probe a specific health endpoint like `/health`
- the app needs warmup work before the real pages are useful
- you need `ignoreHTTPSErrors`
- auth redirects or non-200 readiness are part of the normal boot shape

There is one more wrinkle: according to the [Playwright `TestConfig` docs](https://playwright.dev/docs/api/class-testconfig#test-config-web-server), `port` can implicitly set `baseURL`, but `url` does not. And if `webServer` is an array, you must configure `baseURL` explicitly anyway. My advice is simple: always set `use.baseURL` yourself. You will forget this detail exactly once, and it will be on a day you did not have spare patience.

## The options that actually matter

The full option list is longer than the average team needs. These are the ones I keep coming back to.

### `cwd`

`cwd` controls where the process starts. It defaults to the directory of the Playwright config file. In a monorepo, that default is often wrong for at least one of your servers.

If the startup command depends on local files, set `cwd` deliberately.

### `env`

The spawned process inherits `process.env`, and Playwright adds `PLAYWRIGHT_TEST=1`. That default is useful. It gives your app a stable "I am running under Playwright" signal without inventing yet another environment variable.

This is a good place for test-only flags like:

- pointing the app at a disposable test database
- switching to a temporary database
- disabling analytics
- pointing the app at a fake third-party service

What this is _not_ a good place for is a giant blob of production configuration copied from your deployment platform. Keep the test environment minimal and explicit.

### `reuseExistingServer`

This should usually be `!process.env.CI`.

Locally, reusing an already-running server makes the loop faster. In CI, it is the opposite of what you want. CI should start fresh so a stale process cannot make the suite pass for the wrong reason.

The gotcha: if you are building before previewing, a reused local server can be a _stale build_. That is the exact failure mode Shelf calls out elsewhere in the course. When the app behavior does not match the code you just changed, kill the reused server first. Do that before you start debugging the test.

### `stdout`, `stderr`, and `wait`

Output handling is one of those places where people assume the defaults will save them. Sometimes they do. Sometimes the only useful readiness message prints somewhere you are not looking.

If your server chooses its port dynamically or only prints "ready" to stdout, switch `stdout` to `'pipe'` and use `wait.stdout` with a regular expression:

```ts
webServer: {
  command: 'npm run app:test',
  stdout: 'pipe',
  wait: {
    stdout: /Listening on port (?<app_port>\d+)/,
  },
}
```

This is an advanced escape hatch, not the default path. If you do use capture groups, keep the names distinct across multiple servers and make sure you have a concrete reason for it beyond "this seemed neat."

Those named capture groups become environment variables for the test run. Playwright uppercases the name, so `app_port` is exposed as `process.env.APP_PORT`. That is powerful and a great way to create weird invisible plumbing if you use it casually. Treat it like infrastructure, not a cute regex trick.

### `timeout`

The default startup timeout is 60 seconds. Raise it when the app _honestly_ needs longer. Do not raise it because the wrong readiness check is probing the wrong thing.

If your app is ready at 12 seconds and your `webServer` is still timing out at 60, the problem is almost never "the app is too slow." The problem is usually:

- the command failed and you hid stdout
- the process is listening on a different port
- the readiness URL is wrong
- the app is redirecting somewhere unexpected

### `gracefulShutdown`

If you do not configure shutdown, Playwright will force-kill the process group. That is fine for simple dev servers. It is not always fine for [Docker](https://www.docker.com/) containers, watchers, or servers that need a clean `SIGTERM` path.

The docs explicitly call out that Docker shutdown requires `SIGTERM`, and they also note that Windows ignores `SIGTERM` and `SIGINT` here. That is worth knowing before you start wondering why your teardown behavior differs between local machines and CI.

## The gotchas that matter in practice

### A healthy URL can still be the wrong URL

If your readiness URL is too shallow—say, `/health` returns 200 while the real app is still compiling assets—you will start tests against a half-ready system. `webServer` did its job. Your health check lied.

Pick a readiness signal that exercises the thing the browser actually needs.

### `reuseExistingServer` can hide drift

This is the local-developer tax. Reusing a server is fast, until the reused process does not match your current code or environment. When the failure makes no sense, turn reuse off temporarily or kill the server and rerun. I have saved more time with that blunt move than with any clever debugging trick.

### `webServer` is not a seed hook

Starting the server and seeding the app are different responsibilities. If the suite needs a seeded database, do that in [fixtures](fixtures-worker-scoped-test-scoped.md), [global setup](https://playwright.dev/docs/test-global-setup-teardown), or explicit test helpers. Do not jam seed logic into the startup command and pretend that is cleaner.

### CI does not need a second manual boot step

If `playwright.config.ts` already has a correct `webServer`, your [GitHub Actions](https://github.com/features/actions) workflow usually does _not_ need an extra "start the server in the background" step. Duplicating the lifecycle in CI is how you get port conflicts, races, and two sources of truth.

### Use preview or production-ish start when you care about reality

For end-to-end tests, I usually want the production-ish server path, not the dev server. Dev servers add hot reload, extra transforms, debug overlays, and middleware that do not exist in production. That is sometimes exactly what you want while debugging. It is usually not what you want as the default contract for the suite.

## The agent rules

```markdown
## Playwright webServer

- `webServer` owns process startup and readiness only. Do not hide seed or
  migration logic inside the startup command.
- Set `use.baseURL` explicitly even when Playwright could infer it.
- Use `reuseExistingServer: !process.env.CI` unless the suite has a specific
  reason not to.
- Prefer a production-ish start command (`preview`, `start`) for end-to-end
  tests and keep dev servers for debugging.
- If startup fails and the reason is unclear, expose stdout and run again
  with `DEBUG=pw:webserver`.
```

## The thing to remember

`webServer` is a contract: start this process, wait for this signal, then run the suite. The moment you treat it like a general-purpose setup hook, it gets weird. Keep the contract small, pick an honest readiness signal, and most of the "mysterious Playwright flake" category disappears.

## Additional Reading

- [Configuring Playwright](configuring-playwright.md)
- [Playwright Projects](playwright-projects.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Lab: Add Post-Deploy Smoke Checks to Shelf](lab-add-post-deploy-smoke-checks-to-shelf.md)
