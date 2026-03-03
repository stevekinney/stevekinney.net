---
title: Monoliths, Microfrontends, Monorepos, and the Real Tradeoffs
description: >-
  Three axes people keep shoving into one argument—runtime composition,
  repository topology, and deployment topology—separated so the tradeoffs
  stop sounding mystical and start sounding like engineering.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

This is not one argument. It's three arguments that people keep shoving into the same trench. **Monolith vs microfrontend** is mostly a question about runtime composition and deployability. **Monorepo vs polyrepo** is mostly a question about where source code lives and how builds are managed. Then there's a third axis—**single deployable vs many deployables vs truly independent deployables**. Once you separate those axes, half the debate stops sounding mystical and starts sounding like ordinary engineering tradeoffs again. A microfrontend is "an architectural style where independently deliverable frontend applications are composed into a greater whole," while a monorepo is simply a single Git repository containing multiple applications and libraries. Those aren't rival definitions, so a system can absolutely be both a microfrontend architecture _and_ a monorepo, or neither.

The most useful sentence in this whole topic is probably this one: **most teams should start with a modular monolith, often in a monorepo, and only pay the microfrontend tax when team boundaries, release independence, and organizational scale clearly justify it**. [Fowler's "Monolith First" advice][2] is basically that early systems need fast feedback and flexible refactoring more than they need distributed boundaries, because boundary mistakes are much easier to correct inside one codebase than across independently deployed units.

## The Three Axes People Confuse

The first axis is **runtime architecture**. A frontend monolith is one application built as a single unit. A microfrontend system is many independently deliverable frontend slices composed into one user experience. [Fowler is explicit][3] that a monolith is simply "an application built as a single unit"—not automatically a bad one—and equally explicit that a well-structured monolith is possible.

The second axis is **repository topology**. A monorepo is one repository holding many applications and libraries. A polyrepo gives each project its own repository. [Nx's docs][4] define a monorepo that plainly, and also describe polyrepos as the model where each team can make its own organizational decisions, at the cost of harder code sharing and repeated maintenance across repos.

The third axis is **deployment topology**. You can have one deployable, many deployables that still require lockstep coordination, or many deployables that are genuinely independent. This matters because a system of "many apps" that always has to be rebuilt and released together isn't buying the real benefit people usually want from distributed architecture. That's exactly why [Fowler warns][1] against build-time "microfrontends" packaged into one container bundle—you get package boundaries, but you reintroduce lockstep release.

That gives you the first big correction: **monorepo and microfrontend are not opposites**. A monorepo can host a classic monolith. It can host several unrelated apps. It can host runtime-composed microfrontends. And a microfrontend architecture can live in one repo, many repos, or some hybrid in between. Anyone presenting this as one binary choice is simplifying because the real answer would take longer than a slide deck can tolerate.

## Monoliths

A monolith is not a moral failure. [Fowler's tradeoffs essay][3] says many people casually use "monolith" as an insult, but the more precise definition is just a system built as a single unit, and there's no reason a monolith can't have good modular structure. The real enemy isn't "monolith." The real enemy is the **Big Ball of Mud** version of it—one giant codebase with weak boundaries, easy shortcuts, and coupling that spreads like mold in a damp basement.

The version most teams actually want is a **modular monolith**. That means one deployable application, but strong internal boundaries around features, UI components, data access, and utilities. [Nx's dependency-rules guidance][5] is a good practical example of this style—feature libraries own business use cases and are often app-specific and lazy-loaded, UI libraries are presentational, data-access libraries own API and state logic, and utility libraries sit at the bottom with strict dependency constraints. That's not just folder feng shui. It's how you make one deployable feel smaller than it is.

A monolith is usually the right default when the product is still young, the domain boundaries aren't stable yet, or the team is small enough that people can communicate directly. Fowler's "Monolith First" argument is that early work prioritizes speed and feedback loops, and that getting service boundaries right up front is hard even for experienced teams. His Conway's Law writeup goes further and says a dozen or two people can create a monolith, and that's perfectly fine—the law starts to matter more once team communication itself becomes a structural constraint.

That last point matters a lot in frontend architecture. If one team can still keep a coherent mental model of the product, splitting the frontend into multiple independently deployed runtime pieces may just add ceremony, not leverage. The frontend equivalent of "microservice premium" is real—you're choosing more boundaries, more contracts, more integration points, more pipelines, and more governance. Sometimes that's worth it. Often it's not.

## Microfrontends

Microfrontends exist for a different problem. [Fowler defines them][1] as independently deliverable frontend applications composed into a greater whole, and the benefits he calls out are smaller and more maintainable codebases, incremental upgrades, independent deployment, and more autonomous teams. The important part isn't the word "frontend." The important part is **independent deliverability aligned to team ownership**.

The natural shape of a microfrontend system is usually not "one widget per button." Fowler's article says a common pattern is one microfrontend per page or vertical slice, with a container application handling common page elements, cross-cutting concerns like navigation and authentication, and the job of mounting the right microfrontend in the right place. He also argues that teams should be organized around vertical slices of business functionality rather than horizontal technical layers like styling or forms. That lines up directly with Conway's Law—if teams are separated by capability, the software boundaries should reflect that.

Microfrontends are most compelling when you have multiple teams that need to ship at different cadences, need clearer ownership, or need to migrate a large frontend incrementally instead of stopping the world for a rewrite. Fowler explicitly describes incremental upgrades as one of the main motivations—you can strangle the old frontend piece by piece instead of taking a giant rewrite gamble. That's one of the few modernization stories humans tell themselves that occasionally comes true.

## The Flavors of Microfrontends

**Server-side composition.** Fowler describes this as rendering HTML from multiple templates or fragments, often with server-side includes, while [micro-frontends.org][7] shows the same idea with Custom Elements plus SSI and notes that SSI is old but stable technology. This approach keeps a strong HTML-first posture, works well with SSR and progressive enhancement, and can still preserve team independence if each fragment or page has its own deployment pipeline. It's not trendy, which is part of why it keeps working.

**Build-time integration.** Fowler's example here is publishing each "microfrontend" as a package and having a container app pull them all in as dependencies. That looks neat on paper because you get one bundle and dependency deduplication, but he strongly recommends against it for real microfrontends because every change forces a rebuild and release of the whole container. You took the pain of decomposition and then kept the release coupling anyway. That's not independence—that's a modular monolith wearing an indie-band jacket.

**Runtime integration via iframes.** Fowler calls iframes one of the simplest browser-side composition mechanisms and notes their obvious advantage—strong isolation of styling and globals. He also immediately calls out the costs: routing, history, deep-linking, responsiveness, and cross-app integration become harder. So, iframes are neither a joke nor a default. They're a valid choice when hard isolation matters more than seamless integration.

**Runtime integration via JavaScript modules.** Fowler describes the classic version as loading scripts that expose global entry points, with the container choosing what to mount and where. [single-spa][15] formalizes a modern version of this idea—it's a top-level router, its applications can each live in their own repository and CI pipeline and be separately deployed, and its recommended setup uses in-browser ES modules plus import maps. [single-spa](https://single-spa.js.org/) also says this style can share common libraries once, lazy-load applications, and achieve runtime behavior that's nearly identical to a code-split single application when set up the recommended way. This is the style many teams mean when they say "microfrontends," whether they realize it or not.

**Runtime integration via Web Components.** Fowler presents this as a variation on the runtime-JavaScript model where each slice defines a custom element instead of a global render function. micro-frontends.org makes the contract explicit—the tag name, attributes, and events become the public API between teams. That gives you strong decoupling and tech freedom, but the same source warns that Custom Elements alone don't solve universal rendering, progressive enhancement, or routing, and adds the line every architecture review should print on the wall: just because teams _can_ mix technologies doesn't mean they _should_.

**Module Federation.** [webpack's docs][6] describe it as multiple separate builds acting like containers that expose and consume code at runtime, forming one unified application. Remote modules are loaded asynchronously from remote containers, which makes this a runtime composition mechanism, not a packaging trick. It's often used for microfrontends, but webpack is explicit that it's not limited to that use case. So, Module Federation is best understood as one powerful implementation technique for runtime microfrontends, not the definition of the architecture itself.

| Flavor                  | Composition                   | Isolation                    | Shared dependencies           | Independent deploy | Complexity  |
| ----------------------- | ----------------------------- | ---------------------------- | ----------------------------- | ------------------ | ----------- |
| Server-side composition | Server (SSI/fragments)        | Strong (separate renders)    | Server-managed                | Yes                | Low–medium  |
| Build-time integration  | Build (package imports)       | Package boundaries           | Deduplicated by bundler       | No (lockstep)      | Low         |
| Iframes                 | Browser (iframe)              | Strongest (sandboxed)        | None (fully isolated)         | Yes                | Medium      |
| JavaScript modules      | Browser (import maps/scripts) | Moderate (shared globals)    | Import maps or shared bundles | Yes                | Medium–high |
| Web Components          | Browser (custom elements)     | Strong (shadow DOM optional) | Manual or import maps         | Yes                | Medium–high |
| Module Federation       | Runtime (async modules)       | Moderate (shared scope)      | Negotiated at runtime         | Yes                | High        |

Then there's the **shell question**. Tractor Store 2.0 notes that a central application shell is a popular pattern but not a requirement—a decentralized setup of self-contained systems can be just as valid. [single-spa's FAQ][15] sharpens that further by warning against turning the root config into a parent framework app with child apps beneath it, because that creates coupling and coordinated change without giving you the real advantages of independent systems. So, "app shell" is common, but "giant controlling shell" is how you accidentally invent a distributed monolith in the browser.

## The Annoying Practical Problems Microfrontends Always Bring

Microfrontends are never just a loading strategy. They also force decisions about **routing, state, styling, design systems, and communication contracts**. [Tractor Store's challenge list][7] calls out communication patterns, shared UI components, shell-or-no-shell, server-or-client rendering, and deployment technique as core architectural variables. That's why "we'll just split the frontend into smaller apps" is not a plan. It's the start of a much longer argument.

On communication, Fowler's example deliberately keeps direct cross-application communication minimal and uses the URL as a contract between applications. single-spa's FAQ says the primary communication mechanism is cross-microfrontend imports, where one microfrontend exposes a public interface others can use. Those two ideas are compatible: use the URL for navigation and coarse-grained intent, and use explicit imports or well-defined events only when you truly need richer collaboration. The minute teams start tunneling arbitrary state across every boundary, the architecture stops being modular and starts being theater.

On styling and design systems, the problem is exactly what you think it is—CSS is global, and distributed ownership makes collisions worse. [single-spa recommends][8] a utility microfrontend or centrally shared styleguide for in-house design systems, and says third-party design systems should usually be loaded only once, either through import maps or the equivalent sharing mechanism in Module Federation. Fowler's shared-component section adds a good restraint: don't try to build a giant shared component platform too early. Let patterns emerge, then harvest the duplicates into a shared library once the API is obvious. Humans are very bad at inventing the perfect reusable abstraction before they have real usage.

On performance, the answer is infuriatingly non-dogmatic. Fowler says independent bundles can duplicate dependencies and increase payload size, but also notes that independently compiled page slices can behave like their own form of code-splitting and sometimes improve initial load time. [single-spa](https://single-spa.js.org/) says the recommended ES-module setup can perform nearly the same as a code-split single app. So, the honest answer is: microfrontends can be faster, slower, or roughly equivalent, depending on how you share dependencies, compose routes, and load code. You measure this in production—you don't settle it in Slack with vibes and screenshots.

The final cost is governance. Fowler lists operational and governance complexity as a first-class downside—more repositories, more tools, more deploy pipelines, more environments, more standards to keep aligned. That cost is the frontend analog of distributed-systems overhead on the backend. If you don't have enough automation and organizational maturity, you don't get elegant autonomy. You get a hundred small ways to waste time.

## Monorepos

A monorepo is much less mystical. [Nx defines it][4] simply as one Git repository holding multiple applications and libraries along with the tooling around them. The key benefits Nx calls out are shared code and visibility, atomic changes across producer and consumer, developer mobility, and a single set of third-party dependencies. Those are real advantages, especially in frontend-heavy organizations where design systems, shared types, app shells, and platform tooling like to evolve together.

The simplest flavor is the **workspace monorepo**. [npm workspaces][9] manage multiple local packages from one root package and auto-symlink them during install. pnpm has built-in monorepo support, and its `workspace:` protocol makes local-package intent explicit by refusing to resolve to the registry when a matching local package is required but missing. This is the monorepo flavor for teams who mostly need local package linking, one lockfile, and less dependency drift—not a PhD in build graphs.

The next flavor is the **task-graph monorepo**. [Turborepo][10] describes itself as a high-performance build system for JavaScript and TypeScript monorepos, explicitly because large monorepos can accumulate thousands of build, lint, and test tasks. Nx takes the same problem further with project graphs, task graphs, caching, orchestration, and boundary rules. This is the point where a monorepo stops being "a bunch of folders in Git" and becomes an actual coordinated system.

Then there's the **manager/orchestrator monorepo** flavor. [Rush][11] positions itself as a scalable monorepo manager for large JavaScript repositories with many packages, emphasizing deterministic installs, dependency policies, parallel and incremental builds, and separate publication strategies. This is the flavor teams reach for when workspaces alone aren't enough because the repo is acting like a small ecosystem.

At the far end is the **polyglot or enterprise build-system monorepo**. [Bazel][12] says outright that it handles codebases of any size, including huge monorepos, with incremental builds, dependency analysis, caching, and parallel execution across languages and platforms. Google's monorepo paper makes the important companion point—the repository model works because it's backed by systems and workflows that make it manageable. Copying the "one repo" part without the tooling and process isn't strategy. It's cosplay.

| Flavor                        | Primary concern                 | Tooling examples     | Best for                                            |
| ----------------------------- | ------------------------------- | -------------------- | --------------------------------------------------- |
| Workspace monorepo            | Package linking and installs    | npm, pnpm, Bun       | Small–medium repos needing shared deps              |
| Task-graph monorepo           | Build orchestration and caching | Turborepo, Nx        | Repos where CI speed and task ordering matter       |
| Manager/orchestrator monorepo | Policy, publishing, deploys     | Rush                 | Large JS package ecosystems with release discipline |
| Polyglot/enterprise monorepo  | Hermeticity and multi-language  | Bazel                | Multi-language repos needing correctness guarantees |
| Multiple/synthetic monorepo   | Cross-repo visibility           | Nx (synthetic graph) | Orgs that can't consolidate into one repo           |

Then there are hybrid repo shapes. [Nx documents][13] **multiple monorepos** as the middle ground between one giant monorepo and full polyrepo, and it documents **synthetic monorepos** as a way to connect separate repositories into a unified dependency graph without moving code. That last one is especially useful when the organization has already fragmented into many repos, but you still need cross-repo visibility, change impact analysis, and coordinated CI. You can get some monorepo intelligence without winning the political war required to create an actual monorepo.

A monorepo doesn't automatically make architecture better. [Nx's docs][14] are explicit that large monorepos can suffer from slow builds, complex task pipelines, flaky CI, and architectural erosion if boundaries aren't enforced. Their answer is caching, task orchestration, project graphs, and module-boundary rules. So, the real monorepo divide isn't "one repo or many." It's "one repo with boundaries and automation" versus "one repo where everyone imports whatever they want because nobody felt like being the adult in the room."

## The Combinations That Actually Exist in the Wild

The most common healthy setup is **a modular monolith in a monorepo**. One product, one deployable frontend, but strong library boundaries, shared tooling, a design system package, and maybe several supporting apps like docs, Storybook, admin, or marketing. This gives you atomic changes, dependency consistency, and good internal modularity without runtime composition overhead. For a lot of companies, this is the sweet spot, and they never need anything fancier.

Another common setup is **microfrontends in a monorepo**. The runtime architecture is distributed, but the source still lives together. That gives teams separate deployables and clear ownership while preserving shared code visibility, atomic migrations, and centralized tooling. It's a very practical compromise—more realistic for many organizations than fully separate repos, and less chaotic than pretending independent teams don't need shared types, design tokens, or platform standards. The catch is that repo proximity can tempt teams into sneaky cross-imports unless you enforce boundaries.

Then there's **polyrepo microfrontends**. [single-spa explicitly supports][15] the model where each application has its own repository, CI process, and deployment pipeline. This maximizes team repo autonomy, but Nx's polyrepo discussion captures the tradeoff well—sharing code becomes harder, and org-wide maintenance work has to be repeated across many repos. This is often the right shape when teams are very separate, vendors are involved, or organizational boundaries are hard, but it's not the free lunch people hope it is.

There's also **the fake-microfrontend shape**—many packages or many "apps," but one lockstep release artifact. Fowler's build-time integration warning is basically a red flag for this pattern. If everything is rebuilt and released together, then what you really have is a modular monolith, even if each piece has its own package name and a self-important README. That's not an insult. It's just a naming correction.

And finally there are **multiple monorepos** or a **synthetic monorepo**. This is the compromise model for large organizations that can't or shouldn't centralize everything physically, but still need visibility and coordination. Nx documents both patterns directly. These are often better answers than a forced "one repo to rule them all" migration that everyone quietly resents for two years.

## How to Choose

If your product is early, the domain is still moving, and the frontend is owned by one team or a few tightly collaborating people, start with a **modular monolith**. Fowler's monolith-first logic applies cleanly here—you want fast iteration and you don't yet know the right hard boundaries. Keep the internal architecture disciplined so you can split later if you need to.

If you already know you have **multiple teams that need genuine release independence**, and those teams map cleanly to business capabilities or pages, microfrontends become reasonable. Fowler explicitly ties the benefits to independent deployment and autonomous vertical teams, and Conway's Law says software boundaries should reflect communication boundaries rather than fight them. This is the real justification—not "we wanted to try Module Federation because the conference talk looked cool."

If your main problem is **repo sprawl, dependency drift, duplicated tooling, and painful cross-cutting migrations**, choose a **monorepo** before you choose microfrontends. Nx's benefits list—shared code, atomic changes, single dependency set, developer mobility—is exactly what most internal frontend platforms need. Microfrontends solve runtime and ownership problems. Monorepos solve collaboration and codebase-management problems. Those aren't the same thing.

If your organization can't realistically agree on one repository model, consider **multiple monorepos** or a **synthetic monorepo** instead of forcing a purity contest. Nx documents both as legitimate middle grounds. Software architecture has enough failure modes already without turning repository topology into a blood feud.

If you need hard sandboxing, untrusted or externally owned UI, or strong encapsulation over seamless integration, **iframes** are still on the table. If you need SSR, caching, and HTML-first resilience, **server-side composition** is still on the table. If you want browser-native runtime contracts, **Web Components** are on the table. If you want bundler-level runtime sharing of code, **Module Federation** is on the table. There is no singular "microfrontend architecture." There's a family of tradeoffs, and pretending otherwise is how teams end up arguing theology instead of constraints.

## The Recommendation I Would Actually Give

For most organizations, the best default is **a modular monolith in a monorepo**. Use workspaces for package boundaries, add Nx or Turborepo when build orchestration and caching start to hurt, enforce dependency boundaries, and keep one deployable until the need for independent deployment becomes unmistakable. That gives you the benefits of shared code, atomic changes, and sane internal modularity without paying the governance and runtime-composition overhead of microfrontends too early.

Move to **runtime microfrontends** only when you can answer three questions clearly. First—which business capabilities or pages are independently owned? Second—which teams genuinely need to ship without coordinating with the rest? Third—do you have the tooling, testing, CSS strategy, dependency-sharing strategy, and governance discipline to keep many small frontends from turning into a distributed mess? Fowler's downsides section is basically a checklist for what happens when that answer is "not really."

So, the clean summary is this. **Monolith vs microfrontend** is about how the product is composed and deployed. **Monorepo vs polyrepo** is about how the code is stored and built. **The default for most teams is not "microfrontends everywhere." It's "monolith first, but modular—preferably in a monorepo."** Then, when the team structure and release cadence truly demand it, you can evolve into microfrontends without pretending the repo layout was the architecture all along.

[1]: https://martinfowler.com/articles/micro-frontends.html 'Micro Frontends'
[2]: https://martinfowler.com/bliki/MonolithFirst.html 'Monolith First'
[3]: https://martinfowler.com/articles/microservice-trade-offs.html 'Microservice Trade-Offs'
[4]: https://nx.dev/docs/concepts/decisions/why-monorepos 'Monorepos | Nx'
[5]: https://nx.dev/docs/concepts/decisions/project-dependency-rules 'Project Dependency Rules | Nx'
[6]: https://webpack.js.org/concepts/module-federation/ 'Module Federation | webpack'
[7]: https://micro-frontends.org/tractor-store/ 'Tractor Store 2.0 - TodoMVC for Micro Frontends'
[8]: https://single-spa.js.org/docs/ecosystem-css/ 'CSS | single-spa'
[9]: https://docs.npmjs.com/cli/v7/using-npm/workspaces/ 'workspaces | npm Docs'
[10]: https://turborepo.dev/docs 'Turborepo'
[11]: https://rushjs.io/ 'Rush'
[12]: https://bazel.build/ 'Bazel'
[13]: https://nx.dev/docs/concepts/decisions/overview 'Monorepo or Polyrepo | Nx'
[14]: https://nx.dev/docs/getting-started/intro 'What is Nx? | Nx'
[15]: https://single-spa.js.org/docs/faq/ 'Frequently Asked Questions | single-spa'
