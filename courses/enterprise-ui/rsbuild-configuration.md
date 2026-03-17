---
title: Configuring Rsbuild
description: >-
  A walkthrough of the rsbuild.config.ts files used in this course—defineConfig,
  the plugin system, pluginReact, pluginModuleFederation, shared dependency
  options, dev server settings, and HTML templates.
modified: 2026-03-17
date: 2026-03-01
---

The [Rspack, webpack, and Vite](/courses/enterprise-ui/rspack-webpack-and-vite) lecture established that Rsbuild is the higher-level build tool sitting on top of Rspack—comparable to Vite in ergonomics, but using a bundler-first model in both development and production. This lecture walks through the actual `rsbuild.config.ts` files used in the [runtime composition exercise](/courses/enterprise-ui/runtime-composition-exercise), explaining what each piece of configuration does, why it's there, and what happens when you change it.

If you've configured webpack before, Rsbuild will feel familiar but noticeably less verbose. If you've configured Vite before, it will feel familiar but with a different plugin model underneath. Either way, the configuration surface is small enough to fit in your head, which is the whole point of using a higher-level tool instead of raw Rspack.

## The Full Picture

Here's the host application's complete `rsbuild.config.ts` from the exercise. Every section below refers back to this file.

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'host',
      remotes: {
        remoteAnalytics: 'remoteAnalytics@http://localhost:3001/mf-manifest.json',
      },
      shared: {
        react: { singleton: true, eager: true },
        'react-dom': { singleton: true, eager: true },
        nanostores: { singleton: true, eager: true },
        '@nanostores/react': { singleton: true, eager: true },
        '@pulse/shared': { singleton: true, eager: true },
      },
    }),
  ],
  html: { template: './src/index.html' },
});
```

And the remote:

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  server: { port: 3001 },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'remoteAnalytics',
      dts: false,
      exposes: {
        './analytics-dashboard': './src/analytics-dashboard',
      },
      shared: {
        react: { singleton: true, eager: true },
        'react-dom': { singleton: true, eager: true },
        nanostores: { singleton: true, eager: true },
        '@nanostores/react': { singleton: true, eager: true },
        '@pulse/shared': { singleton: true, eager: true },
      },
    }),
  ],
  html: { template: './src/index.html' },
});
```

Both files are short. That's intentional—Rsbuild's defaults handle most of the build configuration, and what remains is the stuff that's genuinely specific to your application.

## `defineConfig`

```typescript
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  // ...
});
```

`defineConfig` is an identity function. It does nothing at runtime—it exists purely so TypeScript and your editor can provide autocompletion and type checking on the configuration object. You could export a plain object and it would work identically, but you'd lose the type hints, which matters when you're trying to remember whether the option is `server.port` or `devServer.port`.

Rsbuild [looks for config files][1] in a specific order: `rsbuild.config.mjs`, then `.ts`, then `.js`, then `.cjs`, `.mts`, and `.cts`. Using `.ts` is the standard choice for TypeScript projects, and it's what the exercise uses.

`defineConfig` also accepts a function instead of an object. The function receives `env` (`'development'` or `'production'`) and `command` (`'dev'`, `'build'`, or `'preview'`), which lets you return different configuration based on the build context.

```typescript
export default defineConfig(({ env, command }) => ({
  server: {
    port: command === 'dev' ? 3000 : 8080,
  },
}));
```

The exercise doesn't need that—both configs are static—but it's useful to know the escape hatch exists when you need environment-specific behavior.

## `server.port`

```typescript
server: { port: 3000 },
```

This sets the port for Rsbuild's development server. The default is `3000`, so the host config is technically redundant here, but making it explicit is a good habit when you're running multiple dev servers simultaneously. The remote sets `port: 3001` to avoid a collision.

If a port is already occupied, Rsbuild silently increments to the next available port unless you set [`server.strictPort`][2] to `true`, which throws an error instead. In a federation setup, silent port changes are dangerous—the host's `remotes` config hardcodes `localhost:3001`, so if the remote quietly starts on `3002`, the host fetches a manifest that doesn't exist and the federation handshake fails. Explicit ports with `strictPort: true` would be the more defensive choice.

The `server` block also supports `host` (which interface to bind to), `open` (auto-open a URL in the browser on startup), and other options you'd expect from a dev server. The exercise only uses `port`.

## The `plugins` Array

```typescript
plugins: [
  pluginReact(),
  pluginModuleFederation({ /* ... */ }),
],
```

Rsbuild's [plugin system][3] is its primary extension model. Plugins run in declaration order, and built-in Rsbuild plugins always run before user plugins. The array accepts `RsbuildPlugin` objects, falsy values (which are silently ignored), promises, and nested arrays.

That falsy-value handling is useful for conditional plugins:

```typescript
plugins: [
  pluginReact(),
  process.env.ANALYZE && pluginBundleAnalyzer(),
],
```

One distinction worth internalizing: the `plugins` array is for _Rsbuild_ plugins. If you need to use a raw Rspack or webpack plugin, those go in `tools.rspack.plugins` instead. The two plugin models are not interchangeable—Rsbuild plugins hook into Rsbuild's lifecycle, while Rspack plugins hook into the underlying compiler. The exercise only uses Rsbuild plugins.

## `pluginReact`

```typescript
import { pluginReact } from '@rsbuild/plugin-react';
```

[`pluginReact`][4] handles the React-specific build concerns that would otherwise require manual Rspack configuration: SWC-based JSX compilation, React Fast Refresh for HMR in development, and automatic code splitting for React and router packages. It's the Rsbuild equivalent of `@vitejs/plugin-react` in the Vite world.

The exercise calls `pluginReact()` with no arguments, which gives you the defaults:

- **`runtime: 'automatic'`**: Uses React 17+'s automatic JSX transform, so you don't need `import React from 'react'` at the top of every file.
- **`fastRefresh: true`**: Enables React Fast Refresh in development—component state is preserved across edits instead of doing a full page reload.
- **`splitChunks: true`**: Automatically splits React and router packages into separate chunks for better caching.

If you're using a CSS-in-JS library like Emotion that provides its own JSX runtime, you'd pass `swcReactOptions: { importSource: '@emotion/react' }`. If you need the React Profiler in production builds, `enableProfiler: true` turns it on. But for a standard React app with Module Federation, the defaults are the right answer.

## `pluginModuleFederation`

```typescript
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
```

This is the Module Federation 2.0 plugin for Rsbuild. It's a separate package from Rsbuild itself, maintained by the [Module Federation][5] team. The [module-federation lecture](/courses/enterprise-ui/module-federation) covers the federation model in depth—this section focuses specifically on the configuration surface as it appears in the exercise.

> [!NOTE] v1.5 versus v2.0
> Rsbuild also has a built-in Module Federation v1.5 path through the `moduleFederation.options` config key, which requires no extra package. The exercise uses the v2.0 plugin because it provides additional capabilities—Chrome DevTools integration, dynamic TypeScript type hints, runtime plugins, and manifest-based loading. If you don't need those extras, the built-in v1.5 path works fine with a slightly different config shape.

### `name`

```typescript
name: 'host',
```

The container name. This is required and must be unique across all participants in the federation. The [MF 2.0 docs][6] say the name is used for runtime data retrieval and global chunk storage references—so if two containers share a name, they collide in ways that produce very confusing errors.

The host uses `'host'` and the remote uses `'remoteAnalytics'`. The names are strings, not symbols, and they live in a flat global namespace. In a system with many remotes, a naming convention matters—team name, domain, or package scope all work as prefixes.

### `remotes`

```typescript
remotes: {
  remoteAnalytics:
    'remoteAnalytics@http://localhost:3001/mf-manifest.json',
},
```

This is consumer-side configuration. The key (`remoteAnalytics`) is the alias your application code imports from—`import('remoteAnalytics/analytics-dashboard')` in the host's source. The value is a string in the format `containerName@entryUrl`.

The entry URL can point to either a `remoteEntry.js` file or an `mf-manifest.json` file. The exercise uses the manifest because it unlocks MF 2.0 features: dynamic type hints, resource preloading, and Chrome DevTools support. The [remotes configuration docs][7] explain the tradeoffs between the two formats.

The alias doesn't have to match the remote's `name`. You could write `remotes: { analytics: 'remoteAnalytics@...' }` and import from `analytics/analytics-dashboard` instead. In practice, keeping the alias and the container name aligned reduces confusion, but there's no technical requirement.

### `exposes`

```typescript
exposes: {
  './analytics-dashboard': './src/analytics-dashboard',
},
```

This is producer-side configuration. It declares which modules the remote makes available to consumers. Only paths listed here are importable—everything else in the remote's source stays private.

The key (`'./analytics-dashboard'`) becomes the import subpath consumers use. The `./` prefix is required—the [exposes docs][8] are explicit that bare names without `./` are not supported, and `.` by itself means the default export of the container. The value on the right is the path to the actual source file.

Exposed modules are split into their own chunks during the build. That's automatic—you don't need to configure chunk splitting for them. The remote's other code that isn't exposed stays in the remote's own bundle and is never fetchable by the host.

### `dts`

```typescript
dts: false,
```

The remote sets `dts: false` to disable automatic TypeScript type generation. By default in MF 2.0, `dts` is `true`, which means the producer generates a compressed `@mf-types.zip` file during build, and consumers automatically download and extract the remote's types into an `@mf-types` directory. That's a genuinely nice developer experience—you get autocompletion and type checking for remote modules without maintaining ambient declaration files.

The exercise disables it to keep the setup simple and avoid the type-download step during development. In a production system, you'd almost certainly want `dts: true` (or at least not explicitly `false`) so that consumers get build-time type safety for exposed module APIs.

### `shared`

```typescript
shared: {
  react: { singleton: true, eager: true },
  'react-dom': { singleton: true, eager: true },
  nanostores: { singleton: true, eager: true },
  '@nanostores/react': { singleton: true, eager: true },
  '@pulse/shared': { singleton: true, eager: true },
},
```

Shared dependencies are the most operationally important part of the federation config. They control which packages are deduplicated at runtime instead of bundled separately into each participant. The [module-federation lecture's shared dependencies section](/courses/enterprise-ui/module-federation#shared-dependencies-properly-understood) covers the full model—here's how the exercise's specific options work.

The `shared` block appears in _both_ the host and the remote config. Both sides must declare the same packages with compatible options, or the runtime negotiation won't produce the result you expect.

#### `singleton`

```typescript
react: { singleton: true },
```

**`singleton: true`** tells the Module Federation runtime that exactly one copy of this package should exist at runtime, regardless of how many participants declare it. The runtime picks the highest compatible semver version from all participants and uses that single copy everywhere.

For React and React DOM, singleton is non-negotiable. React hooks, context, and reconciliation all depend on a single module instance. Two copies of React in the same page means two separate hook registries, which means hooks called in one copy's context are invisible to the other—and the error messages are not helpful.

The exercise also marks `nanostores`, `@nanostores/react`, and `@pulse/shared` as singletons. That's because the entire [nanostores cross-boundary state pattern](/courses/enterprise-ui/nanostores#nanostores-in-a-federation-context) depends on the host and remote having a reference to the _same_ atom object. If `@pulse/shared` isn't a singleton, each side creates its own atom, and writes from the host are invisible to the remote. The `nanostores` library itself must also be a singleton so the subscription mechanism is shared. All three form a chain—break any link and state stops flowing.

#### `eager`

```typescript
react: { singleton: true, eager: true },
```

**`eager: true`** bundles the shared dependency directly into the participant's output instead of loading it asynchronously during the federation negotiation phase.

Without `eager`, a remote expects the host to provide shared modules like React at runtime. That works when the remote loads inside the host, but it means the remote can't boot standalone—it has nowhere to get React from. The exercise sets `eager: true` on all shared dependencies so that both the host and the remote can run independently. The Module Federation runtime still deduplicates at runtime when both are present, so you don't end up with two copies of React in production. `eager` just ensures standalone mode works.

The tradeoff is bundle size. Eager sharing pulls the dependency into the initial chunk, which inflates the entry bundle. For a few shared packages that's fine. For dozens, it starts to add up. The [MF 2.0 docs][9] warn about this explicitly—use `eager` when you deliberately want synchronous availability, not as a default for everything.

#### `requiredVersion` and `strictVersion`

These don't appear in the exercise's committed config, but the exercise asks you to experiment with them:

```typescript
react: {
  singleton: true,
  eager: true,
  requiredVersion: '^18.0.0',
  strictVersion: true,
},
```

**`requiredVersion`** declares the semver range this participant needs. It defaults to the version in the participant's own `package.json`. The runtime uses it during negotiation to decide whether the provided version is acceptable.

**`strictVersion: true`** turns a version mismatch from a warning into a hard error. Without it, the runtime uses the highest available version even if it doesn't satisfy `requiredVersion`—the remote might silently get React 19 when it expected React 18. With `strictVersion`, that mismatch throws before any UI renders, which is at least honest about the problem.

The exercise has you set `requiredVersion: '^19.0.0'` with `strictVersion: true` against a project that uses React 18, specifically to see the error. That's the kind of guardrail you'd use in production to catch version drift between independently deployed remotes.

## `html.template`

```typescript
html: { template: './src/index.html' },
```

This points Rsbuild at a custom HTML template file instead of using the [built-in default][10]. Rsbuild's default template is a minimal HTML file with a `<div id="root"></div>` mount point. The exercise uses a custom template because the host and remote need different HTML structures—the host has the full page shell, and the remote has a simpler standalone wrapper.

The path is relative to the project root (where `rsbuild.config.ts` lives). It can also be an absolute path, or a function that returns different templates per entry point for multi-page applications.

## What's Not in the Config

Rsbuild handles a lot of configuration through defaults that the exercise doesn't need to override. A few worth knowing about:

- **`output.distPath`**: Where build output goes. Defaults to `dist`. The exercise uses the default.
- **`source.entry`**: The application entry point. Defaults to `src/index.(ts|js|tsx|jsx|mjs|mts)`. The exercise uses `src/index.tsx`, which matches the default pattern.
- **`dev.assetPrefix`**: When Module Federation is configured, Rsbuild automatically sets this to `true` so that asset URLs are absolute rather than relative. That's important because the remote's assets need to be fetchable from the host's domain, and relative paths would resolve against the wrong origin.
- **`output.uniqueName`**: Rsbuild automatically sets this to the federation `name` when Module Federation is configured. This prevents chunk naming collisions between participants. webpack users had to set this manually—Rsbuild handles it.
- **Chunk splitting**: Rsbuild's default `split-by-experience` strategy is automatically disabled when Module Federation is active, because federation has its own chunk-splitting behavior for exposed modules and shared dependencies.

Those automatic adjustments are one of the reasons to use Rsbuild's Module Federation plugin rather than configuring raw Rspack. The plugin knows which Rsbuild defaults need to change for federation to work, and it changes them for you.

## Extending the Config

The exercise configs are minimal because they're teaching the federation model, not the full Rsbuild feature set. In a production setup, you'd likely add some of these:

**Environment variables** via `source.define` or `.env` files. Rsbuild supports `.env`, `.env.local`, `.env.development`, and `.env.production` out of the box, and variables prefixed with `PUBLIC_` are available in client code.

**Proxy configuration** via `server.proxy` for API requests during development. Same concept as Vite's `server.proxy` or webpack-dev-server's `proxy`—it forwards matching requests to a backend server so you don't need CORS headers in development.

**TypeScript path aliases** via `source.alias`. If your project uses `paths` in `tsconfig.json`, you'd mirror them here so the bundler resolves them correctly.

**CSS configuration** via `tools.lightningcss` or `tools.postcss`. Rsbuild uses Lightning CSS by default for CSS processing, which replaces `postcss-loader` plus `autoprefixer` for most use cases.

**Performance budgets** via Rspack's performance hints in `tools.rspack`. The [performance budgets lecture](/courses/enterprise-ui/performance-budgets) covers this in the webpack context—Rspack supports the same `performance.hints`, `maxAssetSize`, and `maxEntrypointSize` options.

But none of that is necessary to understand the federation configuration, which is the point of the exercise. Start with the minimal config that works, and add complexity only when you have a reason to.

[1]: https://rsbuild.rs/guide/configuration/rsbuild 'Configure Rsbuild - Rsbuild'
[2]: https://rsbuild.rs/config/server/strict-port 'server.strictPort - Rsbuild'
[3]: https://rsbuild.rs/config/plugins 'Plugins - Rsbuild'
[4]: https://rsbuild.rs/plugins/list/plugin-react 'React Plugin - Rsbuild'
[5]: https://module-federation.io/guide/build-plugins/plugins-rsbuild 'Rsbuild - Module Federation'
[6]: https://module-federation.io/configure/name 'Name - Module Federation'
[7]: https://module-federation.io/configure/remotes 'Remotes - Module Federation'
[8]: https://module-federation.io/configure/exposes 'Exposes - Module Federation'
[9]: https://module-federation.io/configure/shared 'Shared - Module Federation'
[10]: https://rsbuild.rs/config/html/template 'html.template - Rsbuild'

---

## TL;DR

### Rsbuild for Module Federation

> The modern alternative to webpack for federated apps.

- Built on **Rspack** (Rust-based webpack alternative) — 5-10x faster builds.
- First-class Module Federation plugin.
- Compatible with webpack's federation protocol — can interop with webpack hosts/remotes.

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'checkout',
      exposes: { './Cart': './src/Cart.tsx' },
      shared: { react: { singleton: true } },
    }),
  ],
});
```
