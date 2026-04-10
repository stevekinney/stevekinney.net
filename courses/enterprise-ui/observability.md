---
title: Observability
description: >-
  Observability is the ability to understand a system from the outside—from
  backend signals and OpenTelemetry to the frontend-specific challenges of error
  boundaries, session replay, source map security, microfrontend attribution,
  and resilience patterns that keep enterprise UIs standing when dependencies
  fall over.
modified: 2026-03-17
date: 2026-03-01
---

Observability is the ability to understand a system from the outside by asking useful questions about it without already knowing its internal state. The practical goal is not "more dashboards." It is being able to explain _why_ something is happening, especially when the failure mode is new and annoying and arrived at 2:13 a.m. without the courtesy of being reproducible locally. [OpenTelemetry's observability primer][1] puts it almost exactly that way: good observability lets you handle novel problems and "unknown unknowns," but only if the system is properly instrumented.

That is why observability is not the same thing as monitoring. Monitoring tells you that something crossed a threshold. Observability helps you navigate from symptom to cause. Reliability then sits above both of them: is the service doing what users expect it to do, and are you measuring that with SLIs and enforcing it with SLOs and error budgets? [OpenTelemetry's primer][1] ties observability directly to telemetry and reliability, while the Google SRE material frames error budgets as the control mechanism for balancing feature velocity against reliability.

## What Observability Is For

In distributed systems, the hard part is usually not seeing that _something_ is wrong. The hard part is understanding which request path, dependency, rollout, queue, region, or customer segment is involved, and whether the thing that is wrong is an infrastructure symptom or a user-facing failure. [Google's SRE guidance][2] has been blunt about this for years: white-box monitoring gives you the internal state and bottlenecks, but by itself it does not tell you what users are actually experiencing.

That is why user-facing services should at minimum be legible through the four golden signals: latency, traffic, errors, and saturation. [Google's SRE book][3] still treats those as the best default lens when you do not know where to start, and the SRE workbook explicitly recommends instrumenting dependencies with latency, response codes, and request/response sizes, ideally once in shared client libraries rather than at every call site.

## The Signals

The old "three pillars" framing is still useful, but only if you do not treat it like scripture. Modern observability is a correlated telemetry system, not three unrelated piles of data. [OpenTelemetry][4] is a vendor-neutral framework for generating, collecting, and exporting traces, metrics, and logs, and its documentation now treats profiles as an emerging fourth essential signal.

| Signal   | What it captures                | Cardinality        | Best for                                 | Key concern                       |
| -------- | ------------------------------- | ------------------ | ---------------------------------------- | --------------------------------- |
| Metrics  | Aggregated numbers over time    | Low–medium         | Rates, percentages, SLOs, alerting       | Label cardinality drives cost     |
| Traces   | Request paths across services   | High (per request) | Distributed debugging, latency breakdown | Volume grows fast, needs sampling |
| Logs     | Timestamped event records       | High               | Context, errors, audit trails            | Unstructured logs are noise       |
| Profiles | CPU/memory/allocation snapshots | Medium             | Explaining _why_ code is slow            | Emerging signal, tooling maturing |

Metrics are aggregated numeric measurements over time—the signal [OpenTelemetry][1] uses for rates, error percentages, saturation, queue depth, storage pressure, and latency distributions. Prometheus' naming guidance still matters here: use labels instead of encoding dimensions in metric names, stick to base units like seconds and bytes, and do _not_ use high-cardinality values such as user IDs or email addresses as labels unless you enjoy setting money on fire with your time-series database.

For latency and SLO work, histograms are usually the right metric type.

| Aspect               | Histogram                            | Summary                                   |
| -------------------- | ------------------------------------ | ----------------------------------------- |
| Aggregation          | Aggregatable across instances        | Not aggregatable                          |
| Quantile flexibility | Any quantile at query time           | Preconfigured quantiles only              |
| Server cost          | Higher (bucket storage)              | Lower (pre-computed)                      |
| Use when             | Fleet-wide percentiles, SLO alerting | Single-instance percentiles, low overhead |

[Prometheus' own guidance][5] is clear that histograms can be aggregated and can support direct expressions such as "95% of requests under 300 ms," while summaries are generally not aggregatable across instances and lock you into preconfigured quantiles and windows. If you need fleet-wide latency percentiles and SLO alerting, histograms are the safer default.

Traces model the path of a single request through one or more services. A trace is made of spans, and spans carry names, timestamps, and attributes that describe individual units of work. [OpenTelemetry's observability primer][1] uses traces specifically as the tool that makes distributed request flow understandable, and OpenTelemetry's propagation docs tie that to context propagation, where trace IDs and span IDs move across service boundaries so downstream spans join the same trace. W3C Trace Context is the standard header format that made this less of a vendor turf war than it used to be.

Logs are timestamped records of events, and they are still useful, just not as a replacement for everything else. [OpenTelemetry's log data model][6] is stable and explicitly includes fields like `TraceId`, `SpanId`, severity, body, resource, instrumentation scope, and attributes. That is the modern shape you want: structured logs that can be correlated to traces, not random prose blobs pretending grep is a debugging strategy.

Profiles are increasingly the signal that closes the loop on "why is this slow?" [OpenTelemetry][7] now describes profiles as the fourth essential signal alongside logs, metrics, and traces, because profiles expose where CPU, memory, and other resources are actually being consumed. In practice, traces show _where_ time is spent in a request path, while profiles often reveal _why_ that code path is expensive.

## The Modern Stack

The current default stack is OpenTelemetry instrumentation in the app, OpenTelemetry Collector in the pipeline, and one or more backends for storage, analysis, alerting, and visualization. [OpenTelemetry's documentation][4] positions OTel as the vendor-neutral instrumentation layer, while the Collector is the vendor-neutral component that receives, processes, and exports telemetry so services do not each have to manage their own retry, batching, and export logic.

Resources and semantic conventions are the glue that stop the whole system from degenerating into unlabeled nonsense. [OpenTelemetry resources][8] describe the entity producing telemetry, semantic conventions standardize the names and meanings of attributes across traces, metrics, logs, profiles, and resources, and `service.name` is important enough that the SDK gives it a default of `unknown_service` if you fail to set it yourself. That is not a charming fallback. It is an accusation. Set it explicitly.

There is also a clean boundary between instrumentation authors and application owners. [OpenTelemetry's specification][9] says instrumentation libraries should depend on the API, not on SDK packages; the application wires in the SDK. The library-instrumentation guidance says the same thing in friendlier language: library instrumentation should follow semantic conventions and stay consistent, while applications provide the actual SDK configuration and exporting behavior.

A very ordinary Collector pipeline looks like this:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  memory_limiter:
  batch:
  attributes:
    actions:
      - key: deployment.environment.name
        action: upsert
        value: production

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp]
```

That shape follows the Collector's receiver → processor → exporter model. Processors are optional, but the docs are explicit that they only take effect when you add them to a pipeline, and their order matters. The [Collector docs][10] also recommend using a collector alongside your service in general, because it offloads retries, batching, encryption, and sensitive-data handling away from the app process.

## How to Instrument Sanely

The sane approach is to combine zero-code instrumentation with code-based instrumentation. [OpenTelemetry's instrumentation docs][11] say exactly that: zero-code is great for getting started and for observing libraries and framework edges, while code-based instrumentation gives you the deeper, application-specific telemetry you need from your own business logic. If you stop at auto-instrumentation, you will get edges. You will not get intent.

The highest-value places to instrument manually are request ingress, request egress, queue boundaries, database boundaries, cache boundaries, and critical business operations. [Google's SRE workbook][12] explicitly recommends instrumenting lower-level RPC client libraries once so you get dependency telemetry consistently and "monitor new dependencies for free." That same principle applies more broadly: shared clients and frameworks are leverage. Sprinkling bespoke instrumentation at every call site is how teams produce six naming schemes for the same outbound HTTP request.

Naming discipline matters almost embarrassingly much. [Prometheus][13] warns against procedurally generated metric names and against high-cardinality labels. OpenTelemetry's library guidance says the same thing for span names and attributes: follow semantic conventions, use meaningful names, and think about cardinality before you ship. If you put `user.id`, `email`, or arbitrary query strings into hot-path labels, you are not adding observability. You are creating a billing event.

Logs should be structured, correlated, and used deliberately. [OpenTelemetry's propagation and log-model docs][6] make the modern pattern clear: use context to inject trace and span identifiers into log records so logs can be viewed inside the request path they belong to. A log line without request context is often just a timestamped opinion. A log line with trace correlation is evidence.

Baggage is where good intentions become privacy incidents. [OpenTelemetry's docs][14] explicitly say baggage is not an observability tool; it is a key-value propagation mechanism. The baggage docs also warn that baggage is commonly propagated in HTTP headers and can leak to downstream or third-party services, and that there are no built-in integrity guarantees proving baggage values are trustworthy. So, do not put secrets, PII, or anything delicate in baggage just because it is convenient. Convenient is how breaches market themselves.

## Sampling, Cost, and Keeping the Bill from Becoming a Political Issue

Tracing volume grows fast, so sampling is not optional forever. [OpenTelemetry's sampling docs][15] describe sampling as one of the main ways to reduce telemetry costs while retaining representative data. Common head-sampling approaches include ratio-based samplers such as `TraceIDRatioBased`, while the Collector supports probabilistic and tail-sampling processors. Tail sampling is what you use when you want to keep traces based on what _actually happened_—errors, high latency, specific attributes—instead of making the decision at the first span and hoping the interesting requests were lucky.

Metrics need cost control too, but the enemy there is usually cardinality, not raw event volume. [Prometheus' docs][13] keep repeating the same warning for a reason: every unique label combination is a new time series. The fastest way to break a metrics backend is to smuggle unbounded dimensions into labels and then act surprised when memory and query cost become interpretive dance. Histograms are usually still worth it for latency and SLO work; just choose bucket boundaries deliberately instead of spraying them around like confetti.

Exemplars are one of the few genuinely elegant observability features. [OpenTelemetry's metrics data model][16] defines exemplars as metric observations that can carry trace context, and explicitly calls out linking metrics to traces as a key use case. In practice that means you can click from an ugly latency spike on a chart to an actual representative trace instead of guessing which request might explain the spike. A rare case where the tooling really does save you from yourself.

The Collector is also where you should do a lot of the ugly but necessary economics work: batching, memory limiting, attribute manipulation, filtering, and sensitive-data handling. The [Collector's configuration docs][10] describe processors as the place to filter, drop, rename, and recalculate telemetry, while the security docs explicitly call out protecting telemetry that may contain PII, application-specific data, or network-traffic patterns. Observability pipelines are data pipelines. Treat them with the same suspicion you would apply to any other pipeline carrying potentially sensitive data.

## Alerting and SLOs

Good observability does not page on everything it can see. [Google's on-call guidance][17] is still the best corrective here: page only on alerts that are immediately actionable, keep the signal-to-noise ratio high, and avoid alert fatigue. Their practical alerting material also argues for alerting on high-level service objectives instead of noisy single-machine conditions whenever possible. If your on-call shift is mostly your monitoring system crying wolf, you do not have observability. You have a harassment engine.

That is why SLI and SLO definitions belong inside your observability program, not beside it. [OpenTelemetry's primer][1] defines an SLI as a measurement of service behavior from the user's perspective and an SLO as the way reliability targets are communicated. Google's SRE workbook then turns that into an operating model: an error budget is simply 1 minus the SLO, and release policy can be tightened or halted when the budget is exhausted. Observability without SLOs is often just expensive introspection.

Use both black-box and white-box signals. [Google's SRE guidance][2] is explicit that white-box monitoring shows you internals, while black-box monitoring tells you what users actually see. A healthy alerting system usually pages on user-facing symptoms or fast error-budget burn, then uses white-box telemetry to diagnose and mitigate the problem. Reversing that order is how teams wake people up over a hot node that users never noticed.

When alerts do fire, routing and deduplication matter. [Prometheus Alertmanager][18] is the canonical example here: it deduplicates, groups, routes, silences, and inhibits alerts so a larger outage does not explode into a hundred redundant notifications. The point is not merely niceness. It is preserving human attention so incident response still resembles engineering instead of whack-a-mole.

## What Good Looks Like in Practice

A good observability setup lets you start from a user symptom and move downhill quickly. A latency spike on a service dashboard should break down by route, region, version, or dependency; an exemplar should take you to a representative trace; the trace should show the slow span; the slow span should identify the dependency or code path; correlated logs should tell you what happened there; and a profile should explain whether the problem was CPU, allocation, locking, syscalls, or something equally rude. [OpenTelemetry's primer][1], profiles guidance, log model, and exemplar model all point toward that same end state: correlated signals, not isolated tools.

Resource metadata should make slicing and triage obvious. The `service.name`, service namespace, deployment environment, SDK metadata, and infrastructure attributes exist so you can answer questions like "which service version in which environment on which workload is responsible?" without inventing your own metadata religion every quarter. [OpenTelemetry's resources docs][8] recommend explicit `service.name` and support detectors for host, process, container, Kubernetes, and cloud metadata for exactly this reason.

## The Anti-Patterns

The first anti-pattern is collecting everything and understanding nothing. High-cardinality metrics, random span names, unstructured logs, and missing `service.name` create a system that is technically full of telemetry and practically useless. [Prometheus][13] warns about cardinality; OpenTelemetry warns to set `service.name` explicitly and follow semantic conventions. Ignore both and the backend will faithfully store your chaos for a premium price.

The second anti-pattern is relying on auto-instrumentation alone. [OpenTelemetry's instrumentation guidance][19] says zero-code instrumentation mostly captures the edges—framework requests, database calls, queue operations, runtime behavior. It does not usually instrument your application's own domain logic. So, yes, use it. Just do not confuse "I have spans" with "I have enough meaning to debug the business workflow that actually failed."

The third anti-pattern is treating observability as an internal-only exercise. [Google's SRE guidance][2] keeps coming back to user symptoms, service objectives, and the four golden signals for a reason. Dashboards that only track host-level internals while ignoring what users are seeing are better than blindness and worse than they look.

The fourth anti-pattern is forgetting security. [OpenTelemetry's docs][20] warn about sensitive telemetry in collectors, baggage propagation to external services, and forged or untrusted incoming context. Telemetry is data. Data has privacy, trust, and tampering concerns. If your observability stack can ingest secrets, PII, and attacker-controlled headers, then congratulations—it has joined the list of systems that need threat modeling.

## A Rollout Plan That Won't Collapse Under Its Own Sincerity

Start with the user journeys that matter most and define the smallest meaningful set of SLIs and SLOs around them. That usually means latency, success rate, and maybe freshness or correctness for a few critical paths, not a giant taxonomy workshop where everyone invents new names for "error rate." The SRE workbook and [OpenTelemetry's primer][1] both push toward the same discipline: reliability targets should be explicit, user-centric, and tied to actual business value.

Then instrument the edges first with [zero-code instrumentation][19], because it is the fastest path to visibility, and enrich with manual instrumentation around important domain operations. Set `service.name`, deployment environment, and other core resource metadata immediately so you do not spend the first month debugging `unknown_service` and unlabeled spans.

Put a Collector between services and your backend early unless the system is tiny. The [Collector docs][21] explicitly recommend it in general because it handles retries, batching, encryption, and filtering better than having every service speak directly to the backend. It also gives you one place to add processors for tail sampling, batching, attribute normalization, redaction, and routing. That is a much saner control plane than pushing all of that logic into each app team's SDK config.

After that, fix alerting before you expand telemetry volume. Page on user-visible symptoms, SLO burn, or immediately actionable failures. Route and group alerts properly. Only once that is working should you add nicer things like exemplars, deeper profiling, and more specialized semantic coverage. If you do it in the reverse order, you will end up with exquisite trace waterfalls and an on-call rotation that still hates you, as [Google's on-call guidance][17] has been saying for years.

The whole point of observability is to let engineers ask new questions of production without redeploying instrumentation every time. If your system can tell you what is slow, what is broken, who is affected, where the request went, what changed, and why the code path is expensive—quickly and with tolerable cost—then you have observability. If it mostly gives you dashboards, log floods, and one more bill to justify, you have telemetry, which is [not the same thing][1].

## The Frontend Observability Gap

Everything above mostly assumes your code runs on infrastructure you control—containers, VMs, data center interconnects, orchestration rules. That is the controlled world of backend observability, and it is a fine place to work.

The browser is not that place. The browser is a "wild" execution environment where your application runs on hardware you have never seen, over networks you do not control, driven by humans who do not interact with software the way your Playwright tests do. A single enterprise application might need to work across Chromium, WebKit, and Gecko, on Windows, macOS, Android, and iOS, on hardware ranging from a developer's workstation to a four-year-old phone on a train going through a tunnel. Backend observability cannot capture any of that.

Three things make frontend observability a distinct problem:

- **Client diversity**: Server-side code runs on a known Node.js or JVM version. Frontend code runs on thousands of unique combinations of browser engines, operating systems, and hardware capabilities. An application can pass every synthetic test and still fail on a specific mobile browser because of a subtle difference in DOM implementation or JavaScript engine behavior.
- **Network unreliability**: The "last mile" between your CDN and the user's device is entirely outside your control. Users encounter varying latency, packet loss, and bandwidth constraints that make the backend's low-latency API gateway metrics a fiction. Your server responds in 40 milliseconds; the user waits ten seconds because of heavy asset downloads and slow DNS resolution.
- **User behavior**: Humans rage-click. They navigate back and forth rapidly. They interact with elements before hydration completes, creating race conditions and state corruption that backend logs will never see. Automated tests follow linear paths; real users follow whatever path their impatience suggests.

For years, frontend observability was under-invested because the browser was treated as a black box. Ship the bundle, hope for the best, assume that if the backend is healthy then the user experience is fine. Real User Monitoring has made that assumption untenable. A significant portion of failures occur entirely within the client, where no backend metric will ever see them.

| Aspect           | Backend Observability        | Frontend Observability               |
| ---------------- | ---------------------------- | ------------------------------------ |
| **Environment**  | Controlled (cloud/on-prem)   | Uncontrolled (user's device)         |
| **Connectivity** | Stable, high-speed           | Unreliable, variable (last-mile)     |
| **Visibility**   | Complete (internal states)   | Limited (sandboxed browser)          |
| **Primary goal** | System health and throughput | User experience and interactivity    |
| **Data sources** | Logs, metrics, traces        | RUM, Core Web Vitals, session replay |

## Error Management as Architecture

Error management in large-scale applications has moved well past `try/catch`. The architectural goal is **blast radius containment**—making sure that a broken data visualization widget or an unresponsive third-party integration does not take down the entire page.

### Error boundaries as containment

The most visible pattern for blast radius containment is the **error boundary**. While React 16 popularized the term, the principle applies to any component-based UI: wrap a subtree of your component hierarchy in a boundary that catches rendering errors and provides a fallback UI instead of a blank screen.

When a rendering error occurs, it bubbles up the component tree until it hits the nearest boundary. In React, the boundary uses `static getDerivedStateFromError(error)` to update state for the fallback and `componentDidCatch(error, info)` to log the error to an external tracking service. The rest of the application keeps running. The user does not lose whatever they were typing in a form three panels away.

But, error boundaries have real limitations. They are synchronous and tied to the rendering lifecycle, which means they _do not catch_ errors in event handlers (an `onClick` that triggers an async call), asynchronous code (`setTimeout`, `fetch` callbacks), or server-side rendering. If you have been relying on error boundaries to catch everything, you have a safety net with significant holes in it.

> [!NOTE] Error boundaries and Module Federation
> Module Federation introduces a particularly painful gap: the runtime negotiation phase happens _before_ React mounts, so a dead remote produces a blank page instead of a fallback UI. The [Error Boundaries and Module Federation](/courses/enterprise-ui/error-boundaries-and-federation) section covers this timing problem and the strategies that actually work.

For the gaps that boundaries miss, [reactive primitives like signals][22] offer an interesting alternative. Signals treat error state as reactive data that exists outside the component tree. Any part of the application—synchronous or asynchronous—can update a global error signal, and any part of the UI can react to it. This provides consistent error handling across all execution layers without requiring you to wrap every component in a boundary.

### Global error handlers

Beyond component-level containment, enterprise applications need global safety nets. The `window.onerror` event captures runtime JavaScript errors with metadata like the file URL and line/column numbers. For Promise-based code, the `unhandledrejection` event catches any rejected Promise that lacks a `.catch()` handler.

In microfrontend architectures, these global handlers are typically centralized in the shell application, which acts as the host environment and enriches every captured error with context like the active user ID, session metadata, and the route that was active when things went wrong.

### Structured error classification

Not every error represents a bug. In an enterprise context, you need to classify errors so that alerts are actionable and developers are not drowning in noise from expected failures.

- **User errors (controlled failures)**: Invalid form input, authentication failures, or attempts to access restricted features. The system predicts these and manages them via standard UI feedback. These rarely page an engineer, but you monitor them for trends that might indicate a UX friction point.
- **System errors (exceptional failures)**: Null references, failed state transitions, unhandled API responses. These indicate a regression or a bug and require immediate tracking and triage.
- **Third-party errors**: Failures from external scripts or services—Stripe, Google Analytics, a CDN. You cannot fix these directly, but you need to monitor them so you can activate fallback logic or at least show the user an honest status message instead of a spinning loader that never resolves.

| Classification     | Source        | Predictability | Engineering action     |
| ------------------ | ------------- | -------------- | ---------------------- |
| **User/logic**     | Human input   | High           | Improve UX/messaging   |
| **System/bug**     | Internal code | Low            | Urgent patching        |
| **Dependency**     | Third-party   | Medium         | Fallback/status report |
| **Infrastructure** | Network/CDN   | Low            | DevOps intervention    |

## Source Maps in Production

Enterprise applications ship minified and bundled code. That is not controversial. What _is_ controversial is how you handle the source maps that make those minified stack traces readable again.

**Source maps** are JSON files that map obfuscated production code back to the original TypeScript, JSX, or whatever you actually wrote. Without them, a production error gives you something like `a.js:1:34291`, which is about as useful as a treasure map drawn by someone who has never been to the island.

### The security problem

Publicly accessible source maps are effectively blueprints for your application. Anyone with browser DevTools (or a tool like `source-map-unpacker`) can reconstruct the original codebase and discover proprietary business logic, undocumented internal API endpoints, and—if someone was careless—hardcoded API keys or credentials that should never have been in client-side code in the first place.

This is not hypothetical. The GETTR security incident demonstrated what happens when exposed source maps let attackers discover an undocumented endpoint that permitted password changes without authentication. Source maps turned a "nobody will find this" assumption into a searchable directory.

### Secure source map strategies

The practical question is how to get readable stack traces in your error tracking without exposing the maps to the public. There are three common approaches:

- **Private upload to error tracking**: Generate source maps during the build, upload them to Sentry or Datadog via a secure API, then _delete them_ from the build artifacts before deployment. The error tracking service uses the maps server-side to reconstruct readable stack traces. The maps never reach the public internet. This is the standard approach for a reason.
- **Hidden source maps**: Generate the maps but strip the `//# sourceMappingURL=...` comment from the JavaScript bundle. Browsers will not load the source automatically, but developers who have access to the map file can load it manually into DevTools.
- **IP-restricted hosting**: Host source maps on a separate server accessible only from the corporate network or from specific developer IP addresses. This is more common in environments with strict compliance requirements.

In CI/CD, the first approach integrates cleanly: a build step generates the maps, a subsequent step uploads them via the Sentry or Datadog CLI, and the deployment artifact is stripped of map files. The whole thing adds a few seconds to the pipeline and eliminates a class of security exposure that is otherwise difficult to discover until someone exploits it.

## Error Tracking and Aggregation

In a high-traffic enterprise application, a single bug can generate thousands of error events per minute. If every event produces its own alert, you have an alert storm. If you cannot group related errors into a single "issue," you have a wall of noise that looks the same as having no error tracking at all.

### Fingerprinting

Error tracking platforms aggregate similar occurrences using a **fingerprint**—a unique string that identifies a specific error type. The default behavior for platforms like [Sentry][23] and Rollbar involves analyzing the stack trace, stripping variable data (timestamps, UUIDs, user-specific identifiers), and hashing the remaining filenames and method names into a grouping key.

[Sentry's grouping algorithm][23] normalizes stack traces by marking frames as "in-app" or "out-of-app" based on your project configuration. If the same error fires through different framework entry points, it still groups together. For more ambiguous cases, Sentry's Seer system uses transformer-based text embedding to generate vector representations of stack traces, enabling semantic grouping where errors that are logically identical but technically distinct get merged automatically.

[Datadog's error tracking][24] takes a similar approach but lets you define custom fingerprints via the `error.fingerprint` attribute. This is useful when you want to group errors by a business-level event—say, all failures during the checkout flow—regardless of where they appear in the stack.

### Platform landscape

The choice between error tracking platforms depends on where you need depth.

| Platform        | Focus                     | Strength                                                                        | Best for                                            |
| --------------- | ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Sentry**      | Developer-first tracking  | Intelligent grouping, deep SDK integration across 100+ platforms                | Engineering teams focused on rapid triage           |
| **Datadog RUM** | Full-stack observability  | Seamless correlation between frontend events and backend microservice traces    | Enterprises that want one dashboard for everything  |
| **New Relic**   | Infrastructure-linked RUM | Unified data ingestion with generous free tier                                  | Teams already invested in the New Relic ecosystem   |
| **LogRocket**   | Visual debugging          | Full DOM state capture, Redux/Vuex state changes, console logs alongside replay | Support and UX teams reproducing user-reported bugs |
| **FullStory**   | Behavioral analytics      | User journey visualization and heatmaps for conversion optimization             | Product teams optimizing funnels and engagement     |

Sentry excels at the granular level of stack traces and crash reports. Datadog's strength is the "big picture" view—clicking on a frontend error and immediately seeing the corresponding trace through five backend services. For an enterprise with hundreds of microservices, that correlation between frontend symptoms and backend causes is often what reduces Mean Time to Resolution from hours to minutes.

## Real User Monitoring

Real User Monitoring has moved beyond simple page-load timers to measure how users actually _perceive_ performance. The industry baseline is Google's [Core Web Vitals][25]: LCP for loading, INP for responsiveness, CLS for visual stability. The [Performance Budgets](/courses/enterprise-ui/performance-budgets) section covers CWV thresholds and enforcement in detail, so I will not rehash the numbers here.

What matters from an observability perspective is that CWV gives you the _what_ but not always the _why_. Enterprise applications often need custom performance metrics to measure feature-specific interactivity. A complex dashboard might need to track time-to-interactive for a specific chart widget, not just the page as a whole. The [Performance Observer API and User Timing API][26] make this straightforward:

```typescript
performance.mark('dashboard:chart-render-start');
await renderChart(data);
performance.mark('dashboard:chart-render-end');
performance.measure(
  'dashboard:chart-render',
  'dashboard:chart-render-start',
  'dashboard:chart-render-end',
);
```

These custom measurements integrate with browser DevTools and with analytics providers, so you can track them in production alongside your standard CWV data.

### Connecting technical metrics to business outcomes

Observability in the enterprise eventually has to speak the language of money. This means instrumenting user journeys and conversion funnels—tracking the progression through workflows like "Product Viewed → Added to Cart → Checkout Started → Payment Confirmed"—and correlating technical metrics with those steps.

The questions you want to answer are things like: "What is the impact of a 500-millisecond LCP increase on checkout drop-off?" or "Are users abandoning the payment step because of a specific API failure or a UX problem?" Correlating performance data with funnel data is where observability stops being a cost center and starts being a revenue-protection tool. SRE teams can prioritize fixes based on actual business impact instead of arbitrary technical thresholds.

## Session Replay

Session replay provides a visual reconstruction of what a user actually experienced. It is often described as "CCTV for the web," which is evocative and also slightly misleading about how it works.

### DOM mutation recording, not video

Session replay tools do not record video. That would be prohibitively expensive in bandwidth and storage. Instead, they record the underlying structure of the page:

- **Initial snapshot**: The script captures the initial state of the DOM and CSS.
- **Mutation monitoring**: Using the `MutationObserver` API, the script logs every change to the HTML structure alongside user events—mouse movements, scrolls, keypresses.
- **Reconstruction**: During playback, the tool recreates the DOM on the fly and applies the recorded mutations in chronological order.

This reconstructive approach gives you high-fidelity playback with a lightweight footprint on the user's device. The replay is not pixel-perfect (it is a reconstruction, not a recording), but it is close enough to see exactly what the user saw when things went wrong.

### Privacy and compliance

Session replay sits close to user behavior data, which means it has to be implemented with a **privacy-first** mindset—GDPR, CCPA, HIPAA, and whatever regulation your legal team is currently worried about.

Reputable tools automatically mask sensitive input fields so passwords, credit card numbers, and email addresses are never captured or transmitted. IP anonymization and fingerprinting-attribute removal keep sessions from being tied to specific individuals unless you explicitly need that link. And in enterprise environments, session capture should integrate with your Consent Management Platform so recording only starts after the user provides explicit consent.

The real value of session replay shows up in the support-to-engineering pipeline. When a user reports a bug, an engineer can watch the exact session leading up to the failure—seeing console errors and network failures in real time—which eliminates the "it works on my machine" standoff that otherwise eats hours of back-and-forth.

## Bridging Frontend and Backend with Distributed Tracing

Distributed tracing was covered earlier as a general concept. What matters specifically for frontend observability is the bridge: connecting a button click in the browser to the chain of microservice calls it triggers on the backend.

[OpenTelemetry][27] handles this through **context propagation**. When a user interacts with the UI, the frontend OTel SDK creates a root span and generates a unique Trace ID. When the frontend makes an API call, the SDK injects a `traceparent` header into the HTTP request:

```
traceparent: 00-a0892f3577b34da6a3ce929d0e0e4736-f03067aa0ba902b7-01
```

That header carries the trace ID, parent span ID, and trace flags in the [W3C Trace Context][28] format. The receiving backend service—whether it is Node.js, Python, Go, or anything else with an OTel SDK—extracts the header and creates a child span linked to the same trace.

The result is that you can visualize the entire request lifecycle across service boundaries. A frontend slowdown might trace back to a slow database query three services deep, or to a network bottleneck between regions. Without context propagation, you are stuck with two disconnected worlds: frontend metrics that say "the request was slow" and backend traces that say "everything looks fine from here."

## Synthetic Monitoring

Real User Monitoring tells you what _happened_ to real users. Synthetic monitoring tells you what _will_ happen before any user is involved.

Synthetic monitoring uses automated scripts to simulate user behavior in controlled environments. Tools like Lighthouse CI let you set performance budgets in your CI/CD pipeline, blocking code changes that degrade Core Web Vitals. Playwright-based monitoring services (Checkly is a common one) run heartbeat tests every few minutes from global locations, verifying that critical flows like login and checkout are functional even when there is no real user traffic.

Synthetics provide a noise-free baseline. RUM data is inherently noisy because real users have real devices and real networks, which means your p75 LCP will bounce around based on factors outside your control. Synthetic tests run on consistent hardware from consistent locations, giving you an isolated signal for regressions introduced by code changes rather than environmental variability.

The two complement each other. Synthetics are proactive and controlled. RUM is reactive and real. You need both. One without the other is either blind optimism or Monday-morning quarterbacking.

## Observability in Microfrontend Architectures

Microfrontend architectures make error attribution harder. When a page is composed of five independently deployed modules, each owned by a different team, figuring out _which_ module caused the error is half the debugging problem.

### Error attribution and team ownership

The simplest approach is stack-trace-based attribution. Some platforms (like Coralogix) use build-time metadata plugins for webpack, Vite, or esbuild to generate a metadata file for each microfrontend. When an error occurs, the SDK analyzes the stack trace, matches it to the corresponding module and version, and automatically tags the error with the responsible team.

Even without specialized tooling, you can get most of the way there by using distinct Sentry DSN values or release tags for each microfrontend. This gives each team independent error tracking and alerting. Global issues that affect the entire application trigger cross-team alerts; issues scoped to a single module alert only the responsible team.

### The shell-hub pattern

Many enterprise teams centralize observability in the shell application. Instead of each microfrontend initializing its own SDK, microfrontends emit standard browser events (or call a shared API) that the shell captures and enriches with global context—shell version, user segment, active route—before forwarding to the observability provider.

This pattern keeps the microfrontends lightweight and decoupled from the specific observability vendor, while the shell acts as a single point of enrichment and routing.

### Singleton SDK management

[Honeycomb's microfrontend guidance][29] calls out the most common pitfall: multiple SDK initializations. If every microfrontend tries to initialize its own OpenTelemetry or Sentry SDK, you get duplicated telemetry, conflicting configurations, and a bill that reflects your architecture's redundancy. The fix is to initialize the observability SDK once in the shared bootstrap or shell layer. Module Federation can treat the SDK as a singleton dependency, ensuring all modules share the same telemetry channel.

## Resilience Patterns

Observability tells you _what broke_. Resilience determines _what happens next_. In enterprise applications where users maintain eight-hour sessions and depend on the tool to do their job, a crash that forces a full page reload can mean minutes of lost context, unsaved form data, or an interrupted workflow. The goal is graceful degradation: absorb failures, contain their blast radius, and recover without user intervention wherever possible.

### Retry strategies with backoff

Network requests fail. In enterprise environments with VPN tunnels, corporate proxies, and mobile connectivity, transient failures are routine. A data-fetching layer should implement automatic retries with exponential backoff:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

The decisions that matter: which requests are safe to retry (idempotent GETs, yes; non-idempotent POSTs, only with an idempotency key), how many retries before surfacing an error to the user (typically two or three for interactive requests, more for background syncs), and what backoff curve to use (exponential with jitter prevents thundering-herd problems when a backend recovers from an outage and every client retries at the same instant).

### Circuit breakers in the frontend

When a backend service is fully down, retrying every request wastes bandwidth and delays the user's awareness of the problem. A **circuit breaker** tracks failure rates per endpoint and "opens" the circuit after a threshold, immediately returning a fallback response without making the network call:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000,
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        return fallback;
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      return fallback;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) this.state = 'open';
  }

  private reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}
```

Circuit breakers are particularly valuable in microfrontend architectures where a single failing backend can degrade the entire composed page. The shell can use a circuit breaker per remote API to detect when a service is unhealthy and show a placeholder instead of a spinner that never resolves.

### Graceful degradation strategies

Graceful degradation means the application continues to provide value even when parts of it fail. This extends beyond error boundaries to the full spectrum of failure modes:

| Failure mode                    | Degradation strategy                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Backend API down**            | Show cached or stale data with a "last updated" timestamp; disable write operations                       |
| **Microfrontend fails to load** | Render a placeholder with "This section is temporarily unavailable" and a retry button                    |
| **Third-party script fails**    | Analytics, chat widgets, and A/B scripts should never block the critical path; load async, catch silently |
| **WebSocket disconnection**     | Fall back to polling; show a "reconnecting" indicator; queue outbound messages for replay                 |
| **CDN serving stale assets**    | Service worker serves last-known-good version; background update on reconnection                          |

The principle is that every external dependency should have a defined fallback behavior. During application bootstrapping, each integration point registers its fallback mode, and the error management layer activates fallbacks based on the failure classification.

Progressive enhancement is also making a quiet return in enterprise contexts through frameworks like Remix and the server-first patterns of React Server Components. Forms submit via standard HTML actions, navigation works via standard links, and JavaScript adds optimistic updates and richer interactions on top. If the JavaScript bundle fails to load or hydration is delayed, the application still works. This matters more than you might think in environments with locked-down corporate browsers, high-latency global offices, and hardware that was bought during the previous administration.

## Product Instrumentation

Engineering observability answers "is the system healthy?" Product instrumentation answers "are users succeeding?" Both are essential, and they often share infrastructure while serving different stakeholders.

### Feature adoption and usage tracking

Beyond page loads and errors, enterprise teams need to understand how features are actually used. Product instrumentation captures events like "user completed the onboarding wizard," "user exported a report as PDF," or "user abandoned the checkout flow at step 3." These measure business outcomes, not system health.

The architectural concern is where this instrumentation lives. A thin analytics abstraction decouples the application from the specific analytics provider:

```typescript
interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
  timestamp?: number;
}

interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
  identify(userId: string, traits: Record<string, unknown>): void;
}

let provider: AnalyticsProvider = noopProvider;

export function initAnalytics(p: AnalyticsProvider) {
  provider = p;
}

export function track(name: string, properties: Record<string, string | number | boolean> = {}) {
  provider.track({ name, properties, timestamp: Date.now() });
}
```

This abstraction lets you switch from Amplitude to Mixpanel, or from a SaaS provider to a self-hosted solution, without modifying application code. It also provides a natural point for PII filtering, event batching, and consent gating.

### Funnel analysis and experiment attribution

Enterprise applications often run A/B tests gated by feature flags. The frontend's job is to make sure every product event includes the active experiment variants so the data team can attribute outcomes to specific treatments:

```typescript
track('checkout.completed', {
  revenue: order.totalCents,
  itemCount: order.items.length,
  ...getActiveExperimentVariants(),
});
```

Funnel analysis—measuring drop-off between steps in a multi-step workflow—requires consistent event naming and sequencing. Enterprise teams should establish an **event taxonomy**: a shared document defining event names, required properties, and their semantics, enforced via TypeScript types and linting rules. Without this governance, analytics data devolves into an inconsistent mess where `checkout_complete`, `CheckoutComplete`, and `checkout.done` all refer to the same action.

### Where engineering and product observability converge

Performance metrics like "time from click to checkout confirmation" serve both audiences: engineering cares about the rendering pipeline, product cares about the conversion rate. The recommendation is to use a single event pipeline with different consumers—engineering dashboards consume the performance dimensions while product dashboards consume the business dimensions. This avoids the "two event systems" problem where engineering and product teams instrument the same flows independently with inconsistent data.

## The Cost of Observability Infrastructure

Observability platforms represent a significant and growing cost center. Datadog, New Relic, and Sentry pricing is typically volume-based—more events, more sessions, more traces means higher bills. Architectural decisions directly impact these costs.

- **Event sampling**: Not every page view needs a full session replay. Sampling strategies (100% for errors, 10% for normal sessions, 100% for users on enterprise plans) reduce volume without sacrificing signal.
- **Data retention tiers**: Hot storage for real-time dashboards is expensive. Cold storage for 30-plus-day analysis is cheap. Design the pipeline to tier data automatically.
- **Self-hosted versus SaaS**: OpenTelemetry collectors with Grafana, Tempo, and Loki provide a self-hosted alternative. The tradeoff is operational burden versus licensing cost—most teams under 50 engineers find SaaS cheaper when accounting for the engineering time required to maintain self-hosted infrastructure.
- **Per-microfrontend attribution**: In microfrontend architectures, attributing observability costs to the team that generates the telemetry enables cost-aware engineering. If the dashboard team's verbose logging is driving 40% of the Datadog bill, that is a conversation worth having.

The sampling and cost guidance from earlier in this section still applies. The frontend-specific addition is that session replay and RUM tend to be the fastest-growing cost drivers, because every user session generates data. Controlling that growth with intelligent sampling—capturing errors at full fidelity while sampling normal sessions—is usually the first lever to pull before the monthly invoice triggers a conversation nobody wants to have.

[1]: https://opentelemetry.io/docs/concepts/observability-primer/ 'Observability primer | OpenTelemetry'
[2]: https://sre.google/sre-book/practical-alerting/ 'Practical Alerting | Google SRE'
[3]: https://sre.google/sre-book/monitoring-distributed-systems/ 'Monitoring Distributed Systems | Google SRE'
[4]: https://opentelemetry.io/docs/ 'Documentation | OpenTelemetry'
[5]: https://prometheus.io/docs/practices/histograms/ 'Histograms and summaries | Prometheus'
[6]: https://opentelemetry.io/docs/specs/otel/logs/data-model/ 'Logs Data Model | OpenTelemetry'
[7]: https://opentelemetry.io/docs/specs/otel/profiles/ 'OpenTelemetry Profiles | OpenTelemetry'
[8]: https://opentelemetry.io/docs/concepts/resources/ 'Resources | OpenTelemetry'
[9]: https://opentelemetry.io/docs/reference/specification/overview/ 'Overview | OpenTelemetry'
[10]: https://opentelemetry.io/docs/collector/configuration/ 'Configuration | OpenTelemetry'
[11]: https://opentelemetry.io/docs/concepts/instrumentation/ 'Instrumentation | OpenTelemetry'
[12]: https://sre.google/workbook/monitoring/ 'Monitoring | Google SRE Workbook'
[13]: https://prometheus.io/docs/practices/naming/ 'Metric and label naming | Prometheus'
[14]: https://opentelemetry.io/docs/specs/status/ 'Specification Status Summary | OpenTelemetry'
[15]: https://opentelemetry.io/docs/languages/js/sampling/ 'Sampling | OpenTelemetry'
[16]: https://opentelemetry.io/docs/reference/specification/metrics/data-model/ 'Metrics Data Model | OpenTelemetry'
[17]: https://sre.google/workbook/on-call/ 'Being On-Call | Google SRE Workbook'
[18]: https://prometheus.io/docs/alerting/latest/alertmanager/ 'Alertmanager | Prometheus'
[19]: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/ 'Zero-code | OpenTelemetry'
[20]: https://opentelemetry.io/docs/security/ 'Security | OpenTelemetry'
[21]: https://opentelemetry.io/docs/collector/ 'Collector | OpenTelemetry'
[22]: https://blog.logrocket.com/signals-fix-error-boundaries/ 'Error boundaries are broken – signals can fix them | LogRocket'
[23]: https://docs.sentry.io/concepts/data-management/event-grouping/ 'Issue Grouping | Sentry'
[24]: https://docs.datadoghq.com/error_tracking/ 'Error Tracking | Datadog'
[25]: https://web.dev/articles/vitals 'Web Vitals | web.dev'
[26]: https://web.dev/articles/custom-metrics 'Custom metrics | web.dev'
[27]: https://opentelemetry.io/docs/concepts/context-propagation/ 'Context propagation | OpenTelemetry'
[28]: https://www.w3.org/TR/trace-context/ 'Trace Context | W3C'
[29]: https://docs.honeycomb.io/get-started/best-practices/micro-frontends/ 'Micro Frontends | Honeycomb'

---

## TL;DR

### Structured Logging

> Logs that machines can parse and humans can read.

- **Correlation IDs** — a single ID that traces a request from browser → BFF → backend services.
- Inject the correlation ID in the BFF, propagate it through all downstream calls.
- **Structured format** (JSON) — not string concatenation.

```json
{
  "level": "error",
  "message": "Remote checkout failed to load",
  "correlationId": "abc-123-def",
  "remote": "checkout",
  "duration_ms": 3200,
  "error": "timeout",
  "team": "commerce"
}
```

- Route alerts to the team that owns the remote, not a generic on-call.
