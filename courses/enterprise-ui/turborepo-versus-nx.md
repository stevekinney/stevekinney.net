---
title: Turborepo versus Nx, Bazel, Lerna, and Friends
description: >-
  The monorepo tooling landscape is muddy because these tools overlap without
  being the same thing—here's how Turborepo, Nx, Bazel, Lerna, pnpm, Rush, and
  moon actually differ, and when each one is the right call.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

This comparison gets muddy because these tools overlap without being the same thing. [Turborepo][1] and Nx are both task orchestration and caching systems that sit on top of a repo. Bazel is a broader build system built for multi-language, multi-platform work with hermetic and remotely executable builds. Lerna is now a JavaScript monorepo tool whose task running, caching, graphing, and distribution story is powered by Nx, while [pnpm][2] is a package manager with built-in workspace support rather than a build system. Rush is a monorepo manager with strong policy, publishing, and deployment workflows, and moon positions itself as a repository management and orchestration tool for the web ecosystem, sitting somewhere between shell-script chaos and Bazel-level structure.

The simplest way to think about the landscape is this: pnpm answers "how do packages get installed and linked," Turborepo and Nx answer "how do tasks run fast and in the right order," Lerna and Rush answer "how do we manage multi-package release and publishing workflows," and Bazel answers "how do we build and test a large, often polyglot codebase with strong correctness guarantees." People keep comparing them like they're all one product category, which is charmingly wrong.

## What Turborepo Is Really Optimized For

Turborepo is a high-performance build system for JavaScript and TypeScript codebases. Its docs are very explicit that it's built on top of package-manager workspaces, that it uses the package manager's dependency relationships to form a package graph, and that it then builds a task graph from your `turbo.json` configuration. Its core pitch is fast orchestration of the scripts you already have, not a whole platform that wants to own the rest of your engineering life.

That gives Turborepo a very specific flavor. It's intentionally workspace-native, script-first, and JavaScript-ecosystem-native. Its [caching model][3] fingerprints task inputs and restores outputs and logs on cache hits, and its remote cache can be shared across machines through a managed provider or a self-hosted implementation of its Remote Cache API. It also has `turbo-ignore`, which is essentially a pre-work shortcut for deciding whether a given workspace task can be skipped before you spend time provisioning CI and installing dependencies.

That's why Turborepo tends to feel very clean in app-and-packages repositories. If your world is `apps/` and `packages/`, your package manager already expresses dependency edges correctly, and your main pain is "our scripts and CI are too slow," Turborepo is a very natural fit. It can also be [added incrementally][4] to an existing workspace instead of forcing a big-bang migration, which is useful because repo-wide tooling rewrites are how teams create folklore and trauma at the same time.

## How Nx Differs

[Nx][5] is also a build system, but it's much more obviously a platform. Its docs center on the project graph, the task graph, affected commands, caching, remote caching, distributed task execution, code generation, module-boundary enforcement, and release tooling. It can be added to an existing project, including a non-monorepo project, but the value proposition is broader than "run scripts faster." It's trying to become the operating system for your monorepo rather than just the fast task runner living inside it.

The practical difference from Turborepo is that Nx ships much more repo intelligence and governance in the box. It has first-class [affected execution][6], so "run only what changed since base and only what depends on it" is a core workflow, not a helper layered on later. It has Nx Agents for distributed task execution across machines. It has generators for scaffolding and standardizing code, module-boundary rules for keeping project dependencies sane, and Nx Release for release groups, independent releases, changelogs, and publishing flows. If your repo problems are as much organizational as computational, Nx starts to look a lot more compelling.

Nx also stretches much further beyond plain JavaScript workspaces. Its docs say it can be [added to any type of project][7], and its [plugin registry][10] includes official plugins for things like .NET, Gradle, Maven, Docker, Module Federation, and the usual JavaScript frameworks. That doesn't make it Bazel, but it does mean Nx is much more comfortable than Turborepo once the repo stops being "just Node packages plus a few apps."

## Turborepo versus Nx, Without the Fan Fiction

The honest comparison isn't "which one is better." It's "how much platform do you want." Turborepo is the cleaner answer when you want a JavaScript/TypeScript build system that leans on package-manager workspaces, understands package and task graphs, and gives you fast caching and remote caching without also becoming your release manager, architecture cop, generator framework, and CI scheduler. Nx is the better answer when you specifically want those extra layers: affected execution, distributed CI, release orchestration, generators, dependency boundaries, and broader language/plugin support.

A good shorthand is this. Turborepo feels like a sharp build tool for modern JS/TS workspaces. Nx feels like a monorepo platform that also happens to be a build tool. If you only need the first thing, the second can feel heavy. If you eventually need the second thing, the first can start to feel intentionally narrow. This is less ideology than it is feature gravity pretending to be philosophy.

## What Bazel Is Actually Competing On

[Bazel][8] lives in a different tier of seriousness. Its official docs describe it as a build-and-test system for multi-language, multi-platform projects with fast incremental builds, advanced local and distributed caching, optimized dependency analysis, and parallel execution. It also has first-class remote execution and puts heavy emphasis on **hermeticity**, which is the discipline of making builds depend only on declared inputs so results are reproducible and portable across machines.

That's a fundamentally different worldview from Turborepo. Turborepo assumes the npm-workspace world and optimizes task execution inside it. Bazel assumes you're willing to model the build itself in Bazel terms, with `BUILD` and `.bzl` files written in [Starlark][9]. That gives you far more control and determinism, but it also means a steeper learning curve and a much more opinionated build architecture. Bazel is what you reach for when polyglot scale, hermeticity, and remote execution matter enough to justify the ceremony. Turborepo is what you reach for when your repo is basically JavaScript and you want to move faster without turning the build into a separate religion.

Nx sits between those two worlds. It's not as hermetic or as build-language-driven as Bazel, but it reaches beyond plain npm package graphs through its plugin system and its project-graph analysis. So, if the repo is drifting beyond pure JS/TS but you don't want full Bazel complexity, Nx is the more natural bridge than Turborepo. Bazel is the "we are serious about polyglot builds and reproducibility" answer. Nx is the "we still want an opinionated developer platform, not a full build language" answer.

## What Lerna Is Now, Not What People Remember

Lerna is the one people misremember the most. It's still the original JavaScript monorepo name a lot of teams know, but its [current docs][11] make the relationship crystal clear: Nx took over stewardship in 2022, Lerna uses Nx to detect packages and dependencies, and Lerna defers to Nx's task runner for parallel execution, caching, and distribution. The docs even say that when it comes to task running and caching, Lerna and Nx can be used interchangeably because Lerna is using Nx under the hood.

What Lerna still foregrounds is [versioning and publishing][12]. Its docs still present fixed and independent versioning modes, and the project homepage still frames Lerna as the tool for managing and publishing multiple JavaScript/TypeScript packages from one repository. That makes Lerna feel less like "a competitor to Turborepo" and more like "a package-publishing workflow with Nx-powered task execution attached." If the center of gravity in your repo is package release management, Lerna still makes sense. If the center of gravity is build orchestration and repo architecture, Nx or Turborepo is usually the clearer mental model.

One current-state detail matters a lot here: Lerna's old package-management commands are gone. In v9, `lerna bootstrap`, `lerna add`, and `lerna link` were [fully removed][13] after a long deprecation, and Lerna now explicitly tells you to use your package manager's `workspaces` feature instead. Its config is also split across `lerna.json` and `nx.json`, which tells you everything you need to know about where the modern task engine actually lives.

So, the blunt version is this: if you still think of Lerna as the tool that links packages and installs dependencies, you are several ecosystem eras behind. Modern Lerna is mostly about package versioning, publishing, and a familiar JS-monorepo interface on top of Nx-backed execution.

## pnpm Is Not a Turborepo Replacement

pnpm has built-in monorepo support, a workspace protocol that removes ambiguity around local package resolution, and recursive commands that can run commands across every project in a workspace. That makes pnpm an excellent baseline and, for small to medium repos, sometimes a sufficient one. If all you really need is "install, link, and run commands across workspaces," pnpm already does that just fine.

What pnpm doesn't try to be is a graph-aware build platform on the same level as Turborepo or Nx. It gives you workspaces, linking, and recursive execution. It doesn't give you Turborepo's task graph and cache model, Nx's project graph and affected intelligence, or Bazel's hermetic build world. So, "pnpm or Turborepo?" is usually the wrong question. The real question is "is package-manager recursion enough, or do I need a real task graph and cache layer on top?"

## Rush Is for Organizations That Care About Policy as Much as Speed

[Rush][14] is another tool people should compare less casually, because it solves a somewhat different problem. Its docs emphasize subset and incremental builds, deterministic installs, common configuration files, change files, publishing flows, deployment packaging, and repo-wide policy files like `common-versions.json`, `version-policies.json`, and `deploy.json`. It also documents `rush change`, `rush publish`, and `rush deploy` as first-class workflows, which tells you this is a monorepo manager with strong operational and release opinions, not just a fancy way to run npm scripts.

That makes Rush especially attractive in large JavaScript package ecosystems where publishing, dependency policy, deterministic installs, and controlled deployment outputs matter a lot. It's less lightweight than Turborepo and less "platform for everything" than Nx, but it's unusually serious about the governance and release side of monorepo life. If your repo is basically a product workspace with apps and libraries, Turborepo or Nx is usually the more natural starting point. If your repo is an industrial package factory with policy and release discipline as the real bottleneck, Rush deserves a [harder look][15].

## moon Is the Modern Middle Ground People Should at Least Know Exists

[moon][16] is the most interesting "other" in this conversation because its own docs explicitly position it between Bazel's high complexity and low-structure script-based setups. It describes itself as a repository management, organization, orchestration, and notification tool for the web ecosystem, written in Rust, with smart hashing, remote caching, an integrated toolchain, project and dependency graphs, code generation, code ownership, incremental builds, and Git-hook management. It also has a staged multi-language vision, with support tiers rather than pretending every ecosystem is equally mature today.

That makes moon compelling for teams who want more structure than Turborepo, more toolchain management than Nx usually foregrounds, and far less conceptual weight than Bazel. Its docs also note that action distribution across multiple machines is coming soon, which is an important current limitation if distributed CI is a must-have today rather than a nice future story. So, moon is real and interesting, but it's still a different maturity and ecosystem position from Nx, Turborepo, or Bazel.

## Quick Reference

| Capability            | Turborepo             | Nx                                   | Bazel                  | Lerna                  | pnpm                  | Rush                     | moon                    |
| --------------------- | --------------------- | ------------------------------------ | ---------------------- | ---------------------- | --------------------- | ------------------------ | ----------------------- |
| Primary role          | Task runner and cache | Monorepo platform                    | Polyglot build system  | Versioning/publishing  | Package manager       | Monorepo manager         | Repository orchestrator |
| Task orchestration    | Yes (turbo.json)      | Yes (project/task graphs)            | Yes (BUILD files)      | Via Nx under the hood  | Recursive commands    | Yes (incremental builds) | Yes (smart hashing)     |
| Local caching         | Yes                   | Yes                                  | Yes                    | Via Nx                 | No                    | Yes (cobuild)            | Yes                     |
| Remote caching        | Yes                   | Yes (Nx Cloud)                       | Yes (remote execution) | Via Nx Cloud           | No                    | Yes (cobuild)            | Yes                     |
| Affected analysis     | Via `turbo-ignore`    | First-class (`nx affected`)          | Dependency analysis    | Via Nx                 | No                    | Subset builds            | Yes                     |
| Distributed execution | No                    | Yes (Nx Agents)                      | Yes (remote execution) | Via Nx Agents          | No                    | Cobuild                  | Coming soon             |
| Code generation       | No                    | Yes (generators)                     | Via Starlark rules     | No                     | No                    | No                       | Yes                     |
| Boundary enforcement  | No                    | Yes (module boundaries)              | Via BUILD visibility   | No                     | No                    | Via policy files         | Yes (code ownership)    |
| Release/publishing    | No                    | Yes (Nx Release)                     | No                     | Yes (core feature)     | Via Changesets        | Yes (core feature)       | No                      |
| Language support      | JavaScript/TypeScript | JS/TS + plugins (.NET, Gradle, etc.) | Any language           | JavaScript/TypeScript  | JavaScript/TypeScript | JavaScript/TypeScript    | Web ecosystem (tiered)  |
| Build model           | Workspace scripts     | Project graph + plugins              | Hermetic (Starlark)    | Workspace scripts (Nx) | Workspace scripts     | Workspace scripts        | Task graph + toolchain  |

## The Decision Framework

If your repo is mostly JavaScript or TypeScript, already uses workspaces, and your main goal is "make local tasks and CI faster without changing the entire social contract of the repo," Turborepo is the cleanest default. Its worldview is narrow in the good way: package graph from the package manager, task graph from config, cache the results, optionally share the cache, skip unaffected work when you can.

If your repo problems are broader than speed, Nx is usually the stronger fit. Choose it when you want project-graph awareness, affected execution, distributed CI, generators, module-boundary enforcement, release workflows, and a plugin system that extends beyond vanilla JS packages into things like .NET, Gradle, Maven, and Module Federation. That's the point where Turborepo's intentional minimalism starts to look less like elegance and more like missing surface area.

Choose Bazel when hermeticity, remote execution, and polyglot scale are first-order requirements, not interesting future possibilities. If your org wants one build system that can own correctness and reproducibility across many languages and platforms, Bazel is the real answer in this group. It's also the heaviest answer, because you're buying into a build language and a much stricter model of the world. Conveniently, strict models of the world are exactly what large build systems are for.

Choose Lerna when the main thing you need is versioning and publishing many JS/TS packages and you like its workflow model. Under the hood you're still effectively buying Nx for task running and caching, but Lerna's center of gravity remains multi-package release management. If you're not publishing packages heavily, Lerna is often one layer of personality on top of machinery you might rather use directly.

Choose pnpm alone when you mostly need workspaces, linking, and recursive commands, and the repo is still small enough that a full task-graph system would mostly be theater. Choose Rush when you need strong repo policies, controlled publishing, and deploy packaging in a large JavaScript monorepo. Choose moon when you want a modern orchestration layer with integrated toolchain management and stronger repository structure than Turborepo without going all the way to Bazel.

## The Shortest Honest Answer

Turborepo is the best default when the problem is "fast builds and CI for a JavaScript/TypeScript workspace." Nx is the better choice when the problem is "we need a monorepo platform, not just a task runner." Bazel is what you use when the repo is large, polyglot, and correctness-driven enough to justify real build-system complexity. Lerna is still relevant when versioning and publishing packages are the main event. pnpm is the baseline workspace engine, Rush is the policy-heavy release manager, and moon is the modern middle-ground contender. Or, phrased less politely, most teams arguing about these tools are really arguing about how much structure they're willing to admit they need.

[1]: https://turborepo.com/docs 'Introduction'
[2]: https://pnpm.io/workspaces 'Workspace | pnpm'
[3]: https://turborepo.com/docs/crafting-your-repository/caching 'Caching'
[4]: https://turborepo.com/docs/getting-started/add-to-existing-repository 'Add to an existing repository'
[5]: https://nx.dev/docs/getting-started/intro 'What is Nx? | Nx'
[6]: https://nx.dev/docs/features/ci-features/affected 'Run Only Tasks Affected by a PR | Nx'
[7]: https://nx.dev/docs/guides/adopting-nx/adding-to-existing-project 'Adding Nx to your Existing Project | Nx'
[8]: https://bazel.build/ 'Bazel'
[9]: https://bazel.build/rules/rules-tutorial 'Rules Tutorial | Bazel'
[10]: https://nx.dev/docs/plugin-registry 'Nx Plugin Registry | Nx'
[11]: https://lerna.js.org/docs/lerna-and-nx 'Lerna and Nx'
[12]: https://lerna.js.org/docs/features/version-and-publish 'Version and Publish | Lerna'
[13]: https://lerna.js.org/docs/legacy-package-management 'Legacy Package Management | Lerna'
[14]: https://rushjs.io/pages/intro/welcome/ 'Welcome to Rush! | Rush'
[15]: https://rushjs.io/pages/advanced/rush_files_and_folders/ 'Rush files and folders'
[16]: https://moonrepo.dev/docs 'Introduction | moonrepo'
[17]: https://nx.dev/docs/features/explore-graph 'Explore your Workspace | Nx'
