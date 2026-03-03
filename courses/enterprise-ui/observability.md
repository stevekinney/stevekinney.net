---
title: Observability
description: >-
  Observability is the ability to understand a system from the outside—here is
  how to instrument sanely, what signals matter, and how to keep the cost from
  becoming a political issue.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
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
