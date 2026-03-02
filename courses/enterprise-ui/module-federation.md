---
title: Module Federation
description: >-
  A runtime code-sharing model where multiple independent builds form a single
  application—how it works, what the configuration surface actually means, and
  where the sharp edges live.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Module Federation is a runtime code-sharing model for JavaScript applications. The original [webpack concept][1] is straightforward but powerful: multiple separate builds should form a single application, where each build can act as a container, expose modules, and consume modules from other containers at runtime. The high-level `ModuleFederationPlugin` is the ergonomic wrapper over webpack's lower-level `ContainerPlugin` and `ContainerReferencePlugin`.

The important word is "runtime." A remote module is not part of the current build. It's loaded asynchronously from another container, then evaluated synchronously once its factory is available. That means Module Federation isn't just a packaging trick—it's a runtime composition system that happens to be driven by bundlers. webpack's concept goals also make clear that it's intended to be environment-independent and usable in web and Node.js, not only in browser microfrontends.

## When It's the Right Tool

Module Federation is a good fit when you want independently deployed slices to behave like one app. webpack's official use cases include separate builds per page in an SPA, a shared components library exposed as a container, and dynamic A/B tests that can provide a different version of a shared module at runtime. The docs also stress that this is often called microfrontends, but is not limited to microfrontends.

It's also the right tool when you need decentralization without giving up composition. If a team owns a route, a domain feature, or a component library and wants to ship it independently, Federation can make that possible. If you just want reusable code with identical release cadence and no runtime indirection, a normal package is usually simpler. Humans do love adding a distributed system because a monorepo felt too peaceful.

## The Core Mental Model

Five concepts matter more than the rest.

A **producer** (often called a remote) exposes modules. A **consumer** (often called a host) loads those exposed modules. A **container** is the runtime façade around a build. **Shared dependencies** live in **share scopes**, which are named pools used for reuse and override rules. The container interface itself is tiny—`init` for wiring share scopes, and `get` for retrieving an exposed module factory.

**Local module** versus **remote module** is the boundary to keep in your head. Local modules are compiled into the current build. Remote modules are discovered and loaded later. Loading is asynchronous, usually behind `import()`-style chunk boundaries, which is why Federation feels natural with lazy loading and route splitting. webpack also explicitly notes that containers can be nested, and even circular dependencies between containers are possible. Just because you _can_ do that doesn't mean your future self will send you flowers.

A good shorthand:

```text
host app
  ├─ local modules
  ├─ shared dependencies
  └─ remote containers
       ├─ exposed module A
       └─ exposed module B
```

That mental model is enough to reason about most real systems: who owns the remote, what gets exposed, what is shared, what must be singleton, and when loading happens.

## The Ecosystem and Version Story

There are really three layers to keep straight. First, webpack 5 has the original native `webpack.container.ModuleFederationPlugin`. Second, [Rspack][2] ships built-in support for Module Federation v1.5, including runtime plugins. Third, Module Federation 2.0 adds features like dynamic TypeScript type hints, Chrome DevTools integration, runtime plugins, preloading, shared tree shaking, and more—typically through the `@module-federation/enhanced` plugins. Rspack's own docs recommend v1.5 or v2.0 and say v1.0 compatibility mode is no longer being iterated on.

As of the current official docs, [MF 2.0's ecosystem][3] spans major bundlers and tools, including webpack, Rspack, Rollup, Rolldown, Rsbuild, Vite, Metro, Modern.js, Next.js, Rspress, Rslib, Storybook, React, Vue, and React Native. In practice, support quality is not identical everywhere, so read the plugin docs for your exact stack instead of assuming every badge means "same maturity."

For webpack and Rspack, the official MF 2.0 path is the [enhanced plugin][4]. The webpack plugin docs describe hot reloading for consumed remotes, remote type download, and standard shared/remotes/exposes support. Rspack's docs show the same general model, and Rspack's built-in federation layer remains a first-class option if you don't need MF 2.0 extras.

[Vite support][5] exists, but the official plugin docs still say the `dev` option is unsupported, with remote hot updates and Nuxt SSR listed on the roadmap. Next.js support is [explicitly marked as deprecating][24], supports only the Pages Router, and the docs flag "App Router Not Supported." [Modern.js][23] is the strongest official framework-integrated path at the moment and includes SSR support.

## The Essential Configuration Surface

At minimum, you configure `name`, `remotes`, `exposes`, and `shared`. In the MF 2.0 [config docs][6], `name` is required and must be unique because it's used for runtime data retrieval and global chunk storage references. `filename` controls the generated remote entry name and defaults to `remoteEntry.js`.

[`exposes`][7] is producer-side. Setting it means "this build publishes modules." The docs say exposed modules are split into their own chunk, and async chunks are extracted according to chunk-splitting rules. Expose keys follow package-entry-point style semantics, and the docs are explicit that `.` means the default export while `"./"` by itself is not supported.

[`remotes`][8] is consumer-side. The alias you configure is the name your app imports from, and it doesn't have to equal the producer's `name`. The remote string is `producerName@entryUrl`, where the entry can be either `remoteEntry.js` or `mf-manifest.json`. If you use `mf-manifest.json`, the docs say you gain dynamic module type hints, resource preloading, and Chrome DevTool support.

A stripped-down remote and host configuration:

```js
// remote: module-federation.config.js
module.exports = {
  name: 'catalog',
  filename: 'remoteEntry.js',
  exposes: {
    './ProductCard': './src/ProductCard.jsx',
    './pricing': './src/pricing.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
};

// host: module-federation.config.js
module.exports = {
  name: 'shell',
  remotes: {
    store: 'catalog@http://localhost:3001/remoteEntry.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
};
```

That follows the official producer/consumer split—remote exposes modules, host references the remote through an alias, and shared dependencies are declared in both places. The import path on the host side would be something like `store/ProductCard`, because the alias is what the consumer uses.

## How Loading Actually Works

At the raw webpack level, the remote-loading protocol is straightforward. First the host initializes the shared scope with `__webpack_init_sharing__("default")`. Then it gets the container and calls `container.init(__webpack_share_scopes__.default)`. Finally, it calls `container.get("./module")` and executes the returned factory. That's the real runtime handshake hiding underneath the nicer plugin syntax.

In practice, the build plugin hides almost all of that. But the low-level model matters because it explains several edge cases: why loading is async, why shared resolution happens before the module factory is used, why remotes can be connected dynamically, and why promise-based remotes only need to resolve an object that implements the same `get`/`init` interface.

The low-level flow:

```js
await __webpack_init_sharing__('default');
const container = window.catalog;
await container.init(__webpack_share_scopes__.default);
const factory = await container.get('./ProductCard');
const ProductCardModule = factory();
```

That's why Module Federation feels magical until you remember it's "just" a runtime registry plus a share-scope negotiation step. A very elaborate registry, naturally, because simple things would upset the ecosystem.

## Build Plugin Mode Versus Pure Runtime Mode

The [official runtime docs][9] say there are two ways to register and load modules: declare them in the build plugin, or register and load them directly through the runtime API. The two modes can be mixed. The big difference is that build-plugin mode supports direct `import`-style loading and remote type hints, while pure runtime mode supports dynamic registration and works without the build plugin—but you load with `loadRemote()` rather than normal import syntax.

If you use the build plugin, an MF instance is created automatically and stored in memory. That's why `loadRemote()` can be imported directly from `@module-federation/enhanced/runtime` and still know which application instance it belongs to. If you don't use the build plugin, you must call `createInstance()` yourself. The [docs specifically call out][10] pure-runtime use, multiple separate MF instances, and custom partitioning as reasons to create your own instance.

A typical runtime-only setup:

```ts
import { createInstance } from '@module-federation/enhanced/runtime';

const mf = createInstance({
  name: 'shell',
  remotes: [
    {
      name: 'catalog',
      entry: 'http://localhost:3001/mf-manifest.json',
    },
  ],
});

const mod = await mf.loadRemote('catalog/ProductCard');
```

That pattern is official, not some community hack. The [Node.js guide][11] says runtime-only federation works in Node as well, including HTTP-based remotes, which is why Federation is now viable in SSR, BFF, and service-layer scenarios rather than only in browsers.

The runtime API also exposes `registerRemotes`, `registerShared`, `registerPlugins`, `getInstance`, `loadShare`, and `preloadRemote`. `registerRemotes(..., { force: true })` is explicitly documented as risky because it overwrites registered and loaded modules and deletes their cache if already loaded. That's useful for canary or environment switching, but it's the kind of power tool that removes fingers if you get casual.

## Shared Dependencies, Properly Understood

Shared modules are the part people fear for good reason. webpack defines them as modules that are both overridable and provided as overrides to nested containers. In the default model, module requests in `shared` are only provided when used, will match equal requests in your build, and can even provide and consume multiple versions when nested `node_modules` exist. That last bit matters—sharing is not automatically singleton unless you make it so.

In the [MF 2.0 config docs][12], the common shared options are `singleton`, `requiredVersion`, `eager`, `shareScope`, `import`, `allowNodeModulesSuffixMatch`, and tree-shaking settings. The default share scope is `"default"`. `requiredVersion` defaults to the current application's dependency version. `import: false` means the shared dependency won't be packaged into that build at all, so the consuming environment must provide it.

For React and React DOM, `singleton: true` is the standard move. webpack's [plugin docs][13] are explicit about why—libraries with global internal state, such as React and React DOM, should only have one instance active at a time. The same docs also say that if multiple versions exist in the shared scope, the highest semantic version is used.

A sane React shared block:

```js
shared: {
  react: {
    singleton: true,
    requiredVersion: deps.react,
  },
  'react-dom': {
    singleton: true,
    requiredVersion: deps['react-dom'],
  },
}
```

That pattern is documented directly in webpack's plugin examples and is still the default mental model for React-based federation.

`eager` is the other big lever. In both webpack and MF 2.0 docs, the warning is the same—eager sharing pulls the shared dependency into the entry or initial chunk instead of loading it asynchronously, which can inflate your entry size and force those modules to download up front. Use it only when you deliberately want synchronous availability, usually at one shell entry point, not because the error message annoyed you.

If you're in a pnpm, symlinked, or custom-loader world, `allowNodeModulesSuffixMatch` matters. The official docs say it matches shared modules by the resolved path segment after `node_modules/`, which helps when host and remote resolve the same package through different absolute paths but you still want them treated as the same shared module. One of those tiny options that saves an absurd amount of time.

webpack's native plugin also documents advanced hints that aren't always front-and-center in the enhanced config pages: `packageName`, `shareKey`, `strictVersion`, and explicit `version`. `strictVersion: true` means invalid shared versions throw for singletons or modules without a fallback; otherwise a fallback can be used. `shareKey` lets you publish under one request key and import under another. `packageName` helps when the required version can't be inferred automatically from the request.

One subtle rule from webpack's concepts page is worth remembering: shared requests with a trailing slash, such as `"react/"`, match all module requests with that prefix. That's how you deliberately share subpath imports rather than just the package root.

## Share Scopes and Multiple Pools

A **share scope** is just a named pool of shared dependencies. The default is `"default"`, but the [MF 2.0 docs][14] support multiple share scopes so you can isolate reuse domains. The producer declares which scopes it initializes through `shareScope`, each shared dependency picks a scope through `shared[*].shareScope`, and the consumer can align specific remotes to one or more scopes with `remotes[remote].shareScope`.

That means you can keep React in the default pool while isolating something like an internal design system or special runtime into a separate scope. This is useful when two apps should reuse some things globally but shouldn't accidentally unify everything. It's not magic isolation—it's just explicit dependency pooling, which is honestly a healthier idea than most frontend architecture slogans.

## Share Strategy and Startup Behavior

MF 2.0 introduces [`shareStrategy`][15], with two official modes: `'version-first'` and `'loaded-first'`. The default is `'version-first'`, which loads all remotes during initialization so shared dependencies can register and the highest compatible versions can be selected. `'loaded-first'` delays remote loading until a module is actually requested and prioritizes reuse of already loaded shared dependencies.

The tradeoff is operational, not theoretical. The docs are clear that with `'version-first'`, if a remote is offline during startup, `errorLoadRemote` is triggered with `lifecycle: 'beforeLoadShare'`, and if you don't provide a fallback the app can hang or fail during initialization. With `'loaded-first'`, offline remotes don't break startup unless you actually request them. So, if your remote network isn't perfectly reliable, `'loaded-first'` is usually the more resilient default.

If you do need version-first semantics, pair them with real fallback logic through runtime plugins. The runtime hook docs explicitly support `errorLoadRemote` returning custom fallback behavior, and the share-strategy docs specifically call out retry mechanisms, fallbacks, and error boundaries as production measures.

## Promise-Based Remotes and Dynamic Registration

webpack's official docs support **promise-based dynamic remotes**. Instead of a fixed URL string in `remotes`, you can provide a promise that resolves at runtime to an object implementing `get` and `init`. The docs show using a query parameter to pick a versioned `remoteEntry.js`, inject the script, and then resolve a proxy around `window.app1`.

That's the canonical solution for tenant routing, feature flags, environment switching, or version pinning at runtime. It's also the conceptual bridge to MF 2.0's runtime registration APIs like `registerRemotes`, which let you add or override remotes after startup. The docs even use remote override as an example and warn that `force: true` should be used carefully because it replaces loaded modules and clears caches.

## Manifests Versus `remoteEntry.js`

Classic webpack federation revolves around `remoteEntry.js`. MF 2.0 adds [`mf-manifest.json`][16], which the docs describe as a runtime-oriented manifest consumers can use, and the [remotes docs][8] say manifest-based remotes unlock dynamic type hints, resource preloading, and Chrome DevTools features. If you want the modern toolchain around federation, manifest-based remotes are the more capable choice.

The manifest config supports `fileName`, `filePath`, and `disableAssetsAnalyze`. The default filename is `mf-manifest.json`, and if you customize it, the companion stats file gets a `-stats` suffix automatically. That matters when you're standardizing deployment artifacts or building tooling around the manifest.

## Type Hints and TypeScript Support

MF 2.0's type story is one of the biggest quality-of-life upgrades. The [`dts` option][17] defaults to `true`. The official docs say the producer will generate a compressed `@mf-types.zip` file during build, and the consumer will automatically download and extract remote types into `@mf-types`. That's a far nicer experience than hand-written ambient declarations and prayer.

If you're using runtime-only loading or hosting types at nonstandard URLs, [`consumeTypes.remoteTypeUrls`][18] lets you provide those addresses explicitly. The docs call out runtime-only scenarios as a specific use case for this.

If type generation fails, the official [troubleshooting advice][19] is to start with `FEDERATION_DEBUG=true` and enable `dts.displayErrorInTerminal`, then inspect the console and the `.mf/typesGenerate.log` file. One of those small doc nuggets you only appreciate after spending an hour pretending TypeScript is the mysterious one.

## Runtime Plugins and Hooks

One of MF 2.0's defining features is the runtime plugin system. The [`runtimePlugins` config][20] accepts paths or `[path, options]` tuples, and the docs say those plugins are automatically injected and used during the build process. This is the official extension point for changing how remotes are resolved, fetched, loaded, and how shares are selected.

The most useful [hooks][21] are `beforeRequest` and `afterResolve` for modifying remote resolution, `errorLoadRemote` for fallbacks, `resolveShare` for manually selecting a shared implementation, `createScript` for customizing how remote scripts are inserted, `fetch` for controlling manifest requests, and `loadEntry` for fully custom remote types or delegation models. The docs include examples for credentials on manifest fetches, custom script attributes like `crossorigin="anonymous"`, JSON remotes, and delegate modules.

A representative runtime plugin:

```ts
import type { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';

export default function (): FederationRuntimePlugin {
  return {
    name: 'with-credentials',
    fetch(manifestUrl, requestInit) {
      return fetch(manifestUrl, {
        ...requestInit,
        credentials: 'include',
      });
    },
    createScript({ url }) {
      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = 'anonymous';
      return script;
    },
  };
}
```

That's the right place for cross-cutting policy—auth, retries, tenant resolution, observability, offline fallbacks, and CDN quirks—instead of smearing that logic across every consumer.

## Public Path and Asset URL Resolution

Asset URLs are one of the classic Federation pain points, especially behind reverse proxies or subpaths. webpack's official docs describe two runtime solutions. One is to expose a method from the remote so the host can set `__webpack_public_path__` before bootstrapping the rest of the remote. The other is to infer the public path from `document.currentScript.src`.

MF 2.0 also adds [`getPublicPath`][22]. The config docs say it must be a function provided as a string, and it's executed with `new Function` to obtain the public path prefix. If you use the webpack plugin and want dynamic public path behavior there, the docs explicitly say to set `__webpack_public_path__ = window.cdn_prefix` inside that function body. Because this is literally executed code, treat it as trusted configuration only, not as a place for user-controlled nonsense.

## SSR, Node, and Framework Reality

At the concept level, webpack's federation docs say the model is environment-independent and usable in web and Node.js. In practice, SSR support depends on your tooling layer. The official [Node.js guide][11] says Module Federation works in Node out of the box and can load local CommonJS builds or HTTP remotes through the runtime API.

[Modern.js][23] is currently the most complete official SSR path. Its docs say the plugin supports SSR, and specifically note that for performance reasons the Modern.js SSR integration only supports stream SSR. The MF 2.0 stable release post also calls out SSR as a major capability area.

[Next.js][24] is the cautionary tale. The official docs say support for the Next.js plugin is ending, that it supports Next 12 through 15, SSR, and the Pages Router, and separately flag that App Router is not supported. The usage notes also say you need local webpack via `NEXT_PRIVATE_LOCAL_WEBPACK=true`, and recommend `React.lazy` instead of `next/dynamic` for federated components to avoid hydration errors.

[Vite][5] is usable, but read the fine print. The official Vite plugin docs say all options are supported except `dev`, and list remote hot updates and Nuxt SSR on the roadmap. Not a dealbreaker—it just means you shouldn't assume webpack/Rspack parity everywhere.

## Style Isolation and CSS

The official [style-isolation docs][25] are blunt: Module Federation does not directly handle CSS isolation, and they explain why. Shared dependencies can escape sandboxes, isolation can become dependent on load order, and runtime handling of CSS isolation has many edge cases. The docs call out Shadow DOM compatibility issues, hard-to-debug CSS collection/clearing problems, and uncontrollable impact when sandboxes change in the consumer.

The [recommended approaches][26] are to solve CSS in the producer, not in Federation itself—use CSS Modules, prefixes or BEM, CSS-in-JS, unified component-library versions, or directly export Shadow DOM components when that tradeoff is acceptable.

The practical takeaway is simple: don't expect Federation to save you from global CSS. Keep styling boundaries inside the remote, or you'll end up debugging load order at 2 a.m. like the world's saddest stage magician.

## Debugging and Observability

MF 2.0 ships a surprisingly decent debugging story. The [Chrome DevTools extension][27] can proxy online remotes to local ones, inspect module info, visualize dependency graphs, and analyze shared dependency reuse, including singleton and strict-version behavior. The docs state that the visualization and proxy capabilities require `mf-manifest.json`.

There's also a [global `__FEDERATION__` object][28] injected after initialization. The docs say it contains all module federation information for the current application, including processed `moduleInfo`, and recommend using the Chrome DevTools panel to inspect it. `__FEDERATION__.__INSTANCES__` lets you inspect created runtime instances.

If you're debugging type issues, start with `FEDERATION_DEBUG=true`. If you're debugging runtime resolution or share behavior, use the DevTools panel and the global variables before you start rewriting config from memory. Memory is not a source of truth—it's where broken assumptions go to ferment.

## Performance Tuning

The first lever isn't exotic—avoid sharing or federating everything. Shared dependencies exist to reduce duplicate downloads and enable reuse, but the docs for both webpack and [MF 2.0][29] warn that eager sharing increases initial bundle size and forces download of provided and fallback modules up front. Keep remotes and shared boundaries meaningful rather than atomized.

The second lever is preloading. The [runtime API][10] includes `preloadRemote`, which the docs say can start loading remote resources earlier to avoid waterfall requests. Manifest-based remotes also enable preloading features, and MF 2.0 adds `prefetch` and `cache` APIs for isomorphic data prefetching and caching. The prefetch docs also warn that prefetching can produce stale data if users mutate server state after a prefetch result has been cached.

The third lever is shared-dependency tree shaking in MF 2.0. The [official stable-release post][30] says shared dependencies now support tree shaking, with `runtime-infer` and `server-calc` modes. `runtime-infer` works out of the box and can fall back to the full dependency if the tree-shaken variant is insufficient. `server-calc` is aimed at larger systems where a server or CI can compute a globally optimal pruning result.

If you use `server-calc`, the deployment service rebuilds shared dependencies in a second pass, and your original project build config isn't loaded for that pass. That's why [`treeShakingSharedPlugins`][31] exists—to let you bring required build plugins, such as custom `externals`, into the shared tree-shaking rebuild. The related `injectTreeShakingUsedExports` option controls whether actual used exports are injected into the bundler runtime, and the docs recommend setting it to `false` with `server-calc`.

The fourth lever is the [`experiments` block][32]. `asyncStartup` removes the need for the classic `import('./bootstrap')` trick and automatically makes entrypoints async, which also helps avoid eager-consumption errors. `externalRuntime` and `provideExternalRuntime` can dramatically reduce remote entry size by having the topmost consumer provide the runtime. `disableSnapshot` reduces runtime size further, but the docs warn that it disables the mf-manifest protocol, TypeScript syncing, and HMR for federated modules.

## The Most Common Edge Cases

The classic webpack error is `Uncaught Error: Shared module is not available for eager consumption`. The official fix is either to make the dependency eager—carefully, usually only in the shell—or, better, introduce an async boundary so initialization happens asynchronously. MF 2.0's `asyncStartup` experiment formalizes that second path.

If you see `Module "./Button" does not exist in container`, the webpack docs point to expose-key format. The exposed key needs the `./` prefix, so `Button` is wrong and `./Button` is right.

If you see `fn is not a function`, webpack's troubleshooting page says you're likely missing the remote container. If the target remote is loaded and the error remains, the docs say to ensure the host container's remote container file is present as well.

If multiple remotes collide, webpack recommends setting `output.uniqueName` on remote builds. Rspack's federation guide also explicitly tells you to set `uniqueName` so HMR works. One of those tiny config details that stops bizarre runtime collisions before they happen.

If you use `'version-first'` and a remote goes offline, the startup failure will usually show up through `errorLoadRemote` with `lifecycle: 'beforeLoadShare'`. The docs specifically recommend either switching to `'loaded-first'` for resilience or implementing explicit fallback and retry behavior.

## Best Practices That Actually Hold Up

Federate coarse-grained vertical slices first—routes, domain features, or stable component surfaces. webpack's own use cases emphasize separate builds per page and whole component libraries as containers, not every last atom. If you federate tiny leaf widgets without a real ownership boundary, you mostly buy extra network and coordination cost.

Share React and React DOM as singletons unless you have a very unusual reason not to. Use custom share scopes only when you truly need isolated pools, such as keeping a design system separate from the default React pool. Keep `eager` rare, keep `import: false` deliberate, and turn on `allowNodeModulesSuffixMatch` early in pnpm or symlink-heavy environments.

Prefer manifest-based remotes if you want the better developer experience—types, preloading, devtools, and proxying all ride on `mf-manifest.json`. Use `remoteEntry.js` when you need the classic entry and don't care about those extras. That's not ideology—it's just what the official feature split currently is.

Choose `loaded-first` unless strict version coordination is more important than startup resilience. Put remote auth, credentials, CDN quirks, and offline fallback behavior into runtime plugins instead of ad hoc app code. Use the runtime API when you need dynamic registration or runtime-only composition. Use the build plugin when you want import syntax, bidirectional shared behavior, and type hints.

Be brutally honest about framework support. Modern.js is the strongest official SSR path. Next.js Pages Router works for now, but the official plugin is deprecating and App Router is not supported. Vite works, but the docs still list gaps. Rspack and webpack remain the most complete home territory for the model.

## The Shortest Honest Summary

Module Federation is a runtime container protocol plus shared-dependency negotiation. At the webpack level, it's `get`/`init` and share scopes. At the architecture level, it's a way to let independently built and deployed applications behave like one system. The hard parts aren't "how do I expose a component." The hard parts are version policy, startup resilience, CSS boundaries, public path resolution, and deciding what truly deserves to be federated in the first place.

The tooling is much better now than it was a few years ago, which is fortunate, because people remain committed to building distributed frontends whether physics approves or not.

[1]: https://webpack.js.org/concepts/module-federation/ 'Module Federation | webpack'
[2]: https://rspack.dev/guide/features/module-federation 'Module Federation - Rspack'
[3]: https://module-federation.io/blog/v2-stable-version 'MF 2.0 Stable Release - Module Federation'
[4]: https://module-federation.io/guide/build-plugins/plugins-webpack 'Webpack - Module Federation'
[5]: https://module-federation.io/guide/build-plugins/plugins-vite 'Vite - Module Federation'
[6]: https://module-federation.io/configure/name 'Name - Module Federation'
[7]: https://module-federation.io/configure/exposes 'Exposes - Module Federation'
[8]: https://module-federation.io/configure/remotes 'Remotes - Module Federation'
[9]: https://module-federation.io/guide/runtime/ 'Runtime Access - Module Federation'
[10]: https://module-federation.io/guide/runtime/runtime-api 'Runtime API - Module Federation'
[11]: https://module-federation.io/blog/node 'Module Federation on Node.js - Module Federation'
[12]: https://module-federation.io/configure/shared 'Shared - Module Federation'
[13]: https://webpack.js.org/plugins/module-federation-plugin/ 'ModuleFederationPlugin | webpack'
[14]: https://module-federation.io/configure/sharescope 'shareScope - Module Federation'
[15]: https://module-federation.io/configure/sharestrategy 'shareStrategy - Module Federation'
[16]: https://module-federation.io/configure/manifest 'manifest - Module Federation'
[17]: https://module-federation.io/configure/dts 'dts - Module Federation'
[18]: https://module-federation.io/configure/dts 'dts - Module Federation'
[19]: https://module-federation.io/guide/basic/type-prompt 'Type Hinting - Module Federation'
[20]: https://module-federation.io/configure/runtimeplugins 'runtimePlugins - Module Federation'
[21]: https://module-federation.io/guide/runtime/runtime-hooks.html 'Runtime Hooks - Module Federation'
[22]: https://module-federation.io/configure/getpublicpath 'GetPublicPath - Module Federation'
[23]: https://module-federation.io/guide/framework/modernjs 'Modern.js - Module Federation'
[24]: https://module-federation.io/guide/framework/nextjs 'Next.js - Module Federation'
[25]: https://module-federation.io/guide/basic/css-isolate 'Style Isolation - Module Federation'
[26]: https://module-federation.io/guide/basic/css-isolate 'Style Isolation - Module Federation'
[27]: https://module-federation.io/guide/debug/chrome-devtool 'Chrome Devtool - Module Federation'
[28]: https://module-federation.io/guide/debug/variables 'Global variables - Module Federation'
[29]: https://module-federation.io/configure/shared 'Shared - Module Federation'
[30]: https://module-federation.io/blog/v2-stable-version.html 'MF 2.0 Stable Release - Module Federation'
[31]: https://module-federation.io/configure/treeshakingsharedplugins 'treeShakingSharedPlugins - Module Federation'
[32]: https://module-federation.io/configure/experiments 'Experiments - Module Federation'
