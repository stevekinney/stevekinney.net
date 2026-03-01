---
title: The Strangler Fig Pattern
description: >-
  An incremental replacement strategy for legacy systems: keep a stable front
  door, move one slice at a time, and delete the old path when the new one
  proves itself.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

So, you've got a legacy system. Maybe it's a monolith that's been accumulating features for years. Maybe it's a frontend built on a framework that's two major versions behind. The business can't stop shipping features while you rewrite it, the system still has to serve real traffic, and a full rewrite is—let's be honest—a gamble that rarely pays off on schedule.

The **Strangler Fig pattern** is an incremental replacement strategy. You put a façade or proxy in front of the existing system, keep the client-facing interface stable, and gradually route individual capabilities from the old implementation to the new one until the legacy piece can be shut off. Martin Fowler [coined the metaphor][1] after seeing strangler fig trees in Queensland grow around a host tree until the fig becomes self-sustaining. It's one of the few enterprise migration ideas that is both memorable and not completely ridiculous.

## How It Works

At its simplest:

```text
Clients
   │
Façade / proxy / router
  ┌─┴─┐
  │   │
Legacy   New component
```

The façade is the control point. Early on, it routes almost everything to the legacy system. As new slices are implemented, it starts sending only those slices to the new code. The client ideally doesn't need to know which side owns a given feature.

When the old system still depends on something that's already been extracted, you often need an **anti-corruption layer** or adapter inside the monolith so the old interface can call the new one safely. That's the part of the diagram people forget to draw—and the part that causes the most headaches if you don't plan for it.

## The Migration Loop

[AWS summarizes][3] the migration in three verbs: **transform**, **coexist**, **eliminate**.

1. **Transform**: Build the new component in parallel.
2. **Coexist**: Old and new implementations run behind the routing layer so traffic can be shifted safely and rolled back if needed.
3. **Eliminate**: Once the new path is proven, retire the old functionality.

There's a cleanup step that teams love to skip: after all traffic is on the new system, you can remove the façade or keep it only as a temporary compatibility adapter for older clients. If you never do this step, you haven't completed a migration. You've just added a layer.

One detail that matters more than people think: **new features go into the new system**, not back into the monolith. Ordinary bug fixes can continue in the monolith to keep it stable during the transition, but if new work keeps flowing into the legacy code, you're not strangling it. You're feeding it vitamins.

## What Counts as a "Slice"

The migration unit should be a vertical capability with clear business meaning and manageable dependencies. Not "all persistence," not "all utilities," not some technically neat but operationally useless chunk.

[AWS recommends][2] using domain-driven design and event storming to understand boundaries, and warns that premature decomposition is costly when the domain is unclear. Start where the seams are real, not where the architecture deck looks pretty.

A good first slice tends to have:

- Visible business value (so stakeholders stay invested).
- A clear owner (so somebody is accountable).
- A low blast radius (so your proof of concept doesn't also become your first outage).

That gives you a real proof of concept instead of a months-long archaeology dig. [Google's modernization guidance][4] makes the same broader point: start with a team that has the capacity and authority to prove the approach, then spread the lessons. Don't declare a grand migration crusade and hope morale can be used as infrastructure.

## Beyond Microservices: In-Process Migrations

People often describe Strangler Fig as a monolith-to-microservices pattern, but the core idea is broader than that. Old and new implementations coexist behind a stable boundary, and traffic (or calls) moves gradually. For in-process codebase migrations—framework swaps, package extractions, UI rewrites—the close cousin is Fowler's [Branch by Abstraction][5] pattern.

The recipe:

1. Create an abstraction layer in code.
2. Move callers behind it.
3. Build the new implementation against the same abstraction.
4. Switch callers over incrementally.
5. Delete the old implementation—and usually the temporary abstraction too.

In practice, large migrations often use both patterns together: Strangler Fig at the system boundary and Branch by Abstraction inside the codebase. The heart of it isn't "microservices." The heart of it is controlled coexistence plus gradual cutover.

A key benefit that Fowler stresses: the system can keep building and releasing while the migration is underway, instead of disappearing into a long-lived branch or rewrite bunker.

## Data Is the Hard Part

The routing story is the easy diagram. Data is where the migration becomes real.

[Azure's example][6] shows a common sequence:

1. The new system initially reads and writes through the legacy database.
2. A new database is introduced.
3. Historical data is backfilled with ETL.
4. Shadow writes update both databases in parallel.
5. Reads keep validating against the legacy source.
6. Only later does the new database become the system of record.

[AWS makes the tradeoff explicit][2]: during migration, new services may need their own stores, and the old monolith may still need to access related data. Synchronizing through queues or agents can work, but it introduces duplication and eventual consistency. That's a tactical step, not a healthy end state.

The real rule: shared databases and translation adapters are acceptable migration tools, but they're not the destination. If they become permanent, you haven't completed a strangler migration. You've built a permanent diplomatic border between two systems that dislike each other.

## Release, Testing, and Rollback

The release strategy is incremental by design. Keep one entry point, move a small amount of behavior to the new implementation, watch it, and retain the ability to send traffic back to the old path quickly. [AWS explicitly says][3] each refactored service needs a rollback plan.

Branch by Abstraction gives the same logic at code level: old and new implementations coexist behind one abstraction so the system stays releasable while the change is in progress. Feature flags can be used in test environments to compare behaviors while the migration is underway.

Azure's database example adds another useful tactic: shadow writes and validation _before_ making the new store authoritative. That mindset applies beyond data. The more you can compare old and new behavior safely before full cutover, the lower the migration risk.

The important point: "gradual" has to mean more than splitting work into sprints. It means the system can actually run with both implementations present and switch between them safely.

## Organizational Implications

This pattern isn't just a routing trick. AWS ties the benefits of decomposition to team ownership and delivery speed—smaller components can be released independently, scaled independently, and owned more clearly. [Google says][4] teams need enough authority and capacity to make architectural evolution part of daily work instead of treating modernization as a side quest.

In practice, Strangler Fig works best when business boundaries, code boundaries, deployment boundaries, and team boundaries more or less agree. When they don't, the migration turns into a long chain of coordination meetings pretending to be architecture.

## When to Use It

- The old system can continue to exist for a while.
- Requests can be intercepted through a façade or proxy.
- Replacing the whole thing at once would be risky.
- You must keep shipping features during the migration.
- Clients shouldn't have to understand two different backends.

The pattern also works for API versioning and for continuing to support legacy interactions that won't be upgraded immediately.

## When Not to Use It

- The system is small enough that a direct replacement is simpler.
- Requests can't be intercepted.
- You need to decommission the original solution quickly.

For a tiny service, "introduce façade, route traffic, shadow writes, dual stores, adapters, decommission" isn't strategy. It's performance art.

## Common Failure Modes

Most failed strangler migrations fail in boringly predictable ways:

- **The façade becomes a bottleneck.** The proxy introduces latency or becomes a single point of failure. Monitor it like the critical infrastructure it is.
- **Wrong decomposition boundaries.** The domain wasn't understood before extraction started. Do the domain modeling work _first_.
- **Permanent dual-write pain.** Data synchronization was supposed to be tactical and became permanent. Set explicit timelines for retiring the old store.
- **The monolith keeps growing.** New features keep flowing into legacy code, so it never shrinks. Enforce the rule: new work goes into the new system.
- **Nobody cleans up.** Temporary adapters and compatibility layers are never deleted, leaving the system in a permanent half-migrated state. Schedule the cleanup. Put it on the roadmap. If it's not scheduled, it won't happen.

## The Shortest Useful Definition

Keep a stable front door. Move one meaningful slice at a time. Let old and new coexist safely. Shift traffic gradually. Migrate data with discipline. Delete the old path completely when the new one proves itself.

If you can't do the coexistence and cutover safely, you don't really have a strangler migration. You have a rewrite with optimistic branding.

We'll put this into practice in [Exercise 9](strangler-fig-and-codemods-exercise.md), where we'll use a Vite proxy as the façade layer and jscodeshift codemods to mechanically transform code during the migration.

[1]: https://martinfowler.com/bliki/StranglerFigApplication.html 'Strangler Fig Application'
[2]: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html 'Strangler fig pattern - AWS Prescriptive Guidance'
[3]: https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-decomposing-monoliths/strangler-fig.html 'Strangler fig pattern - AWS Prescriptive Guidance'
[4]: https://cloud.google.com/resources/rearchitecting-to-cloud-native 'Re-architecting To Cloud Native | Google Cloud'
[5]: https://martinfowler.com/bliki/BranchByAbstraction.html 'Branch By Abstraction'
[6]: https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig 'Strangler Fig Pattern - Azure Architecture Center | Microsoft Learn'
