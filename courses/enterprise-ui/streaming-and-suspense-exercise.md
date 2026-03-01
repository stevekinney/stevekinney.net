---
title: 'Exercise 3: Streaming & Suspense'
description: >-
  Add Suspense boundaries around independently-fetching components and implement
  renderToPipeableStream for streaming SSR so each section renders progressively
  as its data arrives.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

The analytics dashboard makes three API calls at different speeds: summary stats (200ms), chart data (800ms), and activity table (2000ms). Right now, the entire page shows a single loading spinner until all three resolve. You're going to add Suspense boundaries around each section and implement `renderToPipeableStream` for streaming SSR so each section renders progressively as its data arrives.

## Why It Matters

Suspense boundaries are architectural decisions, not styling choices. Where you place them determines what the user sees while waiting, what streams in together versus independently, and how your loading states compose across package boundaries. In a monorepo with feature packages that each fetch their own data, getting this right means the difference between a responsive application and one that feels frozen for two seconds every page load.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 2 left off. If you need to catch up:

```bash
git checkout 02-streaming-start
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Step 1: Refactor to Per-Component Data Fetching

Currently, `AnalyticsDashboard` fetches all three datasets in a single `Promise.all` and passes them as props. This means the entire page waits for the slowest response (the table at ~2000ms) before anything renders. You're going to refactor so each component fetches its own data — which is a prerequisite for Suspense boundaries to work.

### What to Look At First

1. Open `packages/analytics/src/analytics-dashboard.tsx`. Notice the centralized fetch pattern:

```typescript
const [summaryResponse, chartResponse, tableResponse] = await Promise.all([
  fetch('/api/analytics/summary'),
  fetch(`/api/analytics/chart?range=${timeRange}`),
  fetch('/api/analytics/table?page=1'),
]);
```

All three responses are fetched together and passed as props to child components.

2. Open `mocks/src/handlers.ts` and find the three analytics endpoints. Note the `delay()` calls — 200ms, 800ms, and 2000ms. These are deterministic, not randomized. Right now, the user waits 2000ms for everything because `Promise.all` blocks until the slowest one resolves.

> [!NOTE]
> **There are three common patterns for fetching data, and each has a different performance profile.** Sequential fetching (fetch A, then fetch B, then fetch C) creates a "waterfall" where each request waits for the previous one to finish — total wait time is the sum of all response times. `Promise.all` fires all requests simultaneously, eliminating the waterfall, but the UI still blocks until the slowest response arrives — total wait time equals the maximum response time. Per-component fetching (what you are about to implement) also fires requests simultaneously, but each component renders independently as soon as its own data arrives — the user sees results progressively. The waterfall pattern is the worst case and often appears accidentally when data fetching is nested inside sequential `await` calls or `useEffect` chains that depend on each other's results.

### Refactor Each Component

Move data fetching into each component so it manages its own loading state.

3. Open `packages/analytics/src/stats-bar.tsx`. Add local data fetching:

```typescript
import React, { useEffect, useState } from "react";
import type { SummaryStats } from "@pulse/shared";
import { StatCard, LoadingSkeleton } from "@pulse/ui";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function StatsBar(): React.ReactElement {
  const [stats, setStats] = useState<SummaryStats | null>(null);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((response) => response.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <LoadingSkeleton variant="card" count={4} />;
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Users" value={formatNumber(stats.totalUsers)} />
      <StatCard label="Active Today" value={formatNumber(stats.activeToday)} />
      <StatCard label="Revenue" value={formatCurrency(stats.revenue)} />
      <StatCard
        label="Conversion Rate"
        value={formatPercentage(stats.conversionRate)}
      />
    </div>
  );
}
```

4. Open `packages/analytics/src/chart.tsx`. Add local data fetching with a `range` prop:

```typescript
import React, { useEffect, useState } from "react";
import type { ChartDataPoint, TimeRange } from "@pulse/shared";
import { LoadingSkeleton } from "@pulse/ui";

export function Chart({ range = "30d" }: { range?: TimeRange }): React.ReactElement {
  const [data, setData] = useState<ChartDataPoint[] | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/analytics/chart?range=${range}`)
      .then((response) => response.json())
      .then(setData);
  }, [range]);

  if (!data) {
    return <LoadingSkeleton variant="chart" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value));
  const chartHeight = 200;
  const chartWidth = 800;
  const barWidth = Math.max(4, (chartWidth - data.length * 2) / data.length);
  const gap = 2;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
      className="h-64 w-full"
      role="img"
      aria-label="Analytics activity chart"
    >
      {data.map((point, index) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x = index * (barWidth + gap);
        const y = chartHeight - barHeight;

        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              className="fill-gray-800"
              rx={2}
            />
            {index % Math.ceil(data.length / 6) === 0 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="fill-gray-400 text-[10px]"
              >
                {point.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

5. Open `packages/analytics/src/big-table.tsx`. Add local data fetching:

```typescript
import React, { useEffect, useState } from "react";
import type { TableRow, PaginatedResponse } from "@pulse/shared";
import { DataTable, LoadingSkeleton } from "@pulse/ui";

const columns = [
  { key: "user" as const, header: "User" },
  { key: "action" as const, header: "Action" },
  {
    key: "timestamp" as const,
    header: "Time",
    render: (value: TableRow[keyof TableRow]) =>
      new Date(String(value)).toLocaleString(),
  },
  {
    key: "duration" as const,
    header: "Duration",
    render: (value: TableRow[keyof TableRow]) => `${value}ms`,
  },
];

export function BigTable(): React.ReactElement {
  const [data, setData] = useState<TableRow[] | null>(null);

  useEffect(() => {
    fetch("/api/analytics/table?page=1")
      .then((response) => response.json())
      .then((result: PaginatedResponse<TableRow>) => setData(result.data));
  }, []);

  if (!data) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-medium text-gray-900">Recent Activity</h3>
      <DataTable columns={columns} data={data} keyField="id" />
    </div>
  );
}
```

> [!NOTE]
> **The table API returns a paginated response.** The `/api/analytics/table?page=1` endpoint wraps the rows in a `PaginatedResponse<TableRow>` object with `data`, `page`, `pageSize`, and `total` fields. You need to extract `result.data` to get the array of `TableRow` items.

6. Now simplify `analytics-dashboard.tsx`. It no longer fetches data — it's just a layout shell:

```typescript
import React, { useState } from "react";
import type { TimeRange } from "@pulse/shared";
import { useAuth } from "@pulse/shared";
import { StatsBar } from "./stats-bar";
import { Chart } from "./chart";
import { BigTable } from "./big-table";

export function AnalyticsDashboard(): React.ReactElement {
  const { user, isAuthenticated } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Analytics Overview
        </h2>
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Viewing as: {user.name}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Not authenticated
            </span>
          )}
        </div>
      </div>

      <StatsBar />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Activity</h3>
          <div className="flex gap-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-sm ${
                  timeRange === range
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <Chart range={timeRange} />
      </div>

      <BigTable />
    </div>
  );
}

export default AnalyticsDashboard;
```

> [!NOTE]
> **Why each component fetches its own data:** This is a deliberate architectural choice. By colocating data fetching with the component that needs it, each section can render independently as soon as its data arrives. The `StatsBar` renders after ~200ms without waiting for the table's ~2000ms response. This pattern is what makes Suspense boundaries useful in Step 2: they give React the granularity to show partial results while other fetches are still in flight.

### Checkpoint

Reload the page at `http://localhost:5173`. You should now see each section appear independently — the stats bar first (~200ms), then the chart (~800ms), then the table (~2000ms). Each shows its own loading skeleton while waiting. This is the per-component fetching pattern you need before adding Suspense.

---

## Step 2: Make Data Fetching Suspense-Compatible

The per-component `useEffect` + `useState` pattern from Step 1 already gives each section its own loading state. But Suspense boundaries need a different mechanism — a data source that **throws a promise** during loading instead of returning `null`. This is React's signal for "not ready yet."

### Create a Suspense Resource Helper

1. Open `packages/shared/src/api-client.ts` and add a `createSuspenseResource` function:

```typescript
interface SuspenseResource<T> {
  read(): T;
}

export function createSuspenseResource<T>(promise: Promise<T>): SuspenseResource<T> {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: T;
  let error: unknown;

  const suspender = promise.then(
    (value) => {
      status = 'success';
      result = value;
    },
    (err) => {
      status = 'error';
      error = err;
    },
  );

  return {
    read() {
      if (status === 'pending') throw suspender;
      if (status === 'error') throw error;
      return result;
    },
  };
}
```

2. Export it from `packages/shared/src/index.ts`:

```typescript
export { createSuspenseResource } from './api-client';
```

> [!IMPORTANT]
> **How the throw-promise pattern works:** When a component calls `resource.read()` and the data isn't ready, the function throws the pending promise. React catches this thrown promise, shows the nearest `<Suspense>` fallback, and re-renders the component when the promise resolves. This is fundamentally different from `useEffect` — instead of rendering with `null` and updating state later, the component _never renders_ until data is available. This is what makes Suspense boundaries useful: they intercept the thrown promise and show a fallback UI.

### Update Components to Use Suspense Resources

3. Update `packages/analytics/src/stats-bar.tsx` to use `createSuspenseResource` instead of `useEffect`:

```typescript
import React from "react";
import type { SummaryStats } from "@pulse/shared";
import { createSuspenseResource } from "@pulse/shared";
import { StatCard } from "@pulse/ui";

// ... keep formatNumber, formatCurrency, formatPercentage functions ...

const statsResource = createSuspenseResource<SummaryStats>(
  fetch("/api/analytics/summary").then((r) => r.json()),
);

export function StatsBar(): React.ReactElement {
  const stats = statsResource.read();

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Users" value={formatNumber(stats.totalUsers)} />
      <StatCard label="Active Today" value={formatNumber(stats.activeToday)} />
      <StatCard label="Revenue" value={formatCurrency(stats.revenue)} />
      <StatCard
        label="Conversion Rate"
        value={formatPercentage(stats.conversionRate)}
      />
    </div>
  );
}
```

4. Update `packages/analytics/src/chart.tsx` to use `createSuspenseResource`. Since the chart data depends on the `range` prop, use a `Map`-based cache so each range gets its own resource:

```typescript
import React from "react";
import type { ChartDataPoint, TimeRange } from "@pulse/shared";
import { createSuspenseResource } from "@pulse/shared";

const chartCache = new Map<
  TimeRange,
  ReturnType<typeof createSuspenseResource<ChartDataPoint[]>>
>();

function getChartResource(range: TimeRange) {
  if (!chartCache.has(range)) {
    chartCache.set(
      range,
      createSuspenseResource<ChartDataPoint[]>(
        fetch(`/api/analytics/chart?range=${range}`).then((r) => r.json()),
      ),
    );
  }
  return chartCache.get(range)!;
}

export function Chart({
  range = "30d",
}: {
  range?: TimeRange;
}): React.ReactElement {
  const data = getChartResource(range).read();

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value));
  const chartHeight = 200;
  const chartWidth = 800;
  const barWidth = Math.max(4, (chartWidth - data.length * 2) / data.length);
  const gap = 2;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
      className="h-64 w-full"
      role="img"
      aria-label="Analytics activity chart"
    >
      {data.map((point, index) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x = index * (barWidth + gap);
        const y = chartHeight - barHeight;

        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              className="fill-gray-800"
              rx={2}
            />
            {index % Math.ceil(data.length / 6) === 0 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="fill-gray-400 text-[10px]"
              >
                {point.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

5. Update `packages/analytics/src/big-table.tsx` to use a module-level Suspense resource:

```typescript
import React from "react";
import type { TableRow, PaginatedResponse } from "@pulse/shared";
import { createSuspenseResource } from "@pulse/shared";
import { DataTable } from "@pulse/ui";

const columns = [
  { key: "user" as const, header: "User" },
  { key: "action" as const, header: "Action" },
  {
    key: "timestamp" as const,
    header: "Time",
    render: (value: TableRow[keyof TableRow]) =>
      new Date(String(value)).toLocaleString(),
  },
  {
    key: "duration" as const,
    header: "Duration",
    render: (value: TableRow[keyof TableRow]) => `${value}ms`,
  },
];

const tableResource = createSuspenseResource<TableRow[]>(
  fetch("/api/analytics/table?page=1")
    .then((r) => r.json())
    .then((result: PaginatedResponse<TableRow>) => result.data),
);

export function BigTable(): React.ReactElement {
  const data = tableResource.read();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-medium text-gray-900">Recent Activity</h3>
      <DataTable columns={columns} data={data} keyField="id" />
    </div>
  );
}
```

> [!NOTE]
> **Module-level resources execute immediately.** The `statsResource` and `tableResource` are created at import time, which means the fetch starts as soon as the module loads — not when the component renders. This is actually desirable for Suspense: the earlier the fetch starts, the sooner data arrives. For resources that depend on props (like the chart's time range), the `Map`-based cache creates a new resource on first access for each range value.

### Add Suspense Boundaries

6. Now wrap each component in a Suspense boundary. Update `analytics-dashboard.tsx`:

```typescript
import React, { Suspense, useState } from 'react';
import { LoadingSkeleton } from '@pulse/ui';
// ... other imports stay the same ...
```

Wrap each child component:

```typescript
<Suspense fallback={<LoadingSkeleton variant="card" count={4} />}>
  <StatsBar />
</Suspense>

<div className="rounded-lg border border-gray-200 bg-white p-6">
  {/* ... time range buttons ... */}
  <Suspense fallback={<LoadingSkeleton variant="chart" />}>
    <Chart range={timeRange} />
  </Suspense>
</div>

<Suspense fallback={<LoadingSkeleton variant="table" />}>
  <BigTable />
</Suspense>
```

7. Save and reload the page. Watch the rendering sequence:
   - The page shell (sidebar, header) renders immediately
   - Skeleton fallbacks appear for each section
   - `StatsBar` appears after ~200ms as the skeleton is replaced
   - `Chart` appears after ~800ms
   - `BigTable` appears after ~2000ms

### Checkpoint

Each section of the analytics dashboard now loads independently via Suspense. The stats bar with its four metric cards appears first, the chart follows about 600ms later, and the table arrives last. Each shows its own skeleton placeholder while loading. The key difference from Step 1: the loading state is now managed by React's Suspense mechanism, not by manual `useState` in each component.

---

## Step 3: Understanding Streaming SSR with `renderToPipeableStream`

The Suspense boundaries you added in Step 2 serve double duty. On the client, they show skeleton fallbacks while data loads. On the server, they tell React's streaming SSR where to split the HTML stream. Here's what a streaming SSR implementation looks like using the Suspense boundaries you've already built:

```typescript
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { App } from "./app";
import type { Request, Response } from "express";

export function render(req: Request, res: Response) {
  const { pipe } = renderToPipeableStream(
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>,
    {
      bootstrapScripts: ["/src/main.tsx"],
      onShellReady() {
        res.setHeader("Content-Type", "text/html");
        pipe(res);
      },
      onError(error) {
        console.error("SSR error:", error);
        res.statusCode = 500;
      },
    },
  );
}
```

> [!NOTE]
> **`onShellReady` vs. `onAllReady`:** The `renderToPipeableStream` API gives you two callback options for when to start piping HTML to the client. `onShellReady` fires as soon as everything _outside_ of Suspense boundaries has rendered — the app shell, navigation, and skeleton fallbacks. Content inside Suspense boundaries streams in later as each one resolves. `onAllReady` waits until everything has resolved, including all Suspense boundaries — this gives you the old "wait for everything" behavior. For progressive rendering, always use `onShellReady`. Use `onAllReady` only for static site generation or crawlers that need complete HTML.

> [!NOTE]
> **How streaming replacement works under the hood:** When `onShellReady` fires, React sends the complete HTML for the shell — including the fallback content of each Suspense boundary rendered as real HTML (the skeleton components). As each Suspense boundary resolves on the server, React sends a `<script>` tag containing the resolved HTML and a tiny function that swaps it into the right place in the DOM. The browser executes this inline script immediately, replacing the skeleton with the final content — no JavaScript framework needed for the swap. This is why the page appears to "fill in" progressively even before React hydrates on the client.

> [!NOTE]
> **This step is conceptual.** Setting up Express middleware or Vite SSR mode is outside the scope of this exercise. The key takeaway is that your Suspense boundaries automatically work with `renderToPipeableStream` — you don't need to change any component code to enable streaming SSR. The architecture you've built in Steps 1-2 is SSR-ready by design.

> [!NOTE]
> **Hydration is the process where React attaches event listeners and interactive behavior to server-rendered HTML.** When the browser receives the initial HTML from streaming SSR, it is static markup — buttons do not respond to clicks, state changes do not trigger re-renders, and effects do not run. Hydration is when React walks the existing DOM, compares it against the component tree it would have rendered on the client, and "adopts" those DOM nodes by wiring up event handlers, refs, and state management. After hydration completes, the application becomes fully interactive. This is why streaming SSR is valuable even before hydration finishes: the user sees real content immediately (server-rendered HTML), and the page becomes interactive incrementally as React hydrates each Suspense boundary. A hydration mismatch — where the server-rendered HTML differs from what the client would render — causes React to discard the server markup and re-render from scratch, negating the performance benefit.

### Checkpoint

You understand how `renderToPipeableStream` uses your Suspense boundaries to progressively stream HTML. The shell (sidebar, header, skeleton fallbacks) ships first, then each resolved Suspense boundary streams as a replacement `<script>` tag.

---

## Step 4: Experiment with Boundary Placement

The placement of Suspense boundaries changes the user experience. Try different configurations to feel the trade-offs.

### Configuration A: One Boundary Around Everything

```typescript
<Suspense fallback={<LoadingSkeleton variant="page" />}>
  <StatsBar />
  <Chart />
  <BigTable />
</Suspense>
```

This is the "all or nothing" approach. The entire analytics area shows a single skeleton until the slowest component (BigTable at 2000ms) resolves. The fast StatsBar data sits unused for 1800ms.

### Configuration B: Individual Boundaries (Current)

```typescript
<Suspense fallback={<LoadingSkeleton variant="card" />}>
  <StatsBar />
</Suspense>
<Suspense fallback={<LoadingSkeleton variant="chart" />}>
  <Chart />
</Suspense>
<Suspense fallback={<LoadingSkeleton variant="table" />}>
  <BigTable />
</Suspense>
```

Each section renders as soon as its data is ready. Maximum progressiveness, but the page shifts layout three times as sections pop in.

### Configuration C: Grouped Boundaries

```typescript
<Suspense fallback={<LoadingSkeleton variant="card" />}>
  <StatsBar />
</Suspense>
<Suspense fallback={<LoadingSkeleton variant="page" />}>
  <Chart />
  <BigTable />
</Suspense>
```

Stats bar streams in first (fast feedback), then chart and table appear together when the table resolves. Two layout shifts instead of three. The chart data is ready at 800ms but waits until 2000ms to render because it shares a boundary with BigTable.

> [!IMPORTANT]
> **There is no universally correct placement.** Configuration B gives the fastest time-to-first-content, but causes three layout shifts. Configuration C reduces layout shifts but delays the chart by 1200ms. Configuration A has the worst time-to-first-content but zero layout shifts. The right choice depends on your product: a real-time dashboard benefits from progressive rendering (B), while a data-dense report might prefer the stability of grouped boundaries (C). This is why Suspense boundaries are architectural decisions — they encode product priorities into your component tree.

### Try Each One

Switch between configurations A, B, and C. Watch the network waterfall in DevTools and pay attention to how the page feels as a user. Settle on whichever approach you prefer and leave it in place.

### Checkpoint

You've tried at least two different Suspense boundary placements and observed how each changes the loading experience. You can articulate the trade-off between time-to-first-content and layout stability.

---

## Stretch Goals

- **Add error boundaries alongside Suspense boundaries:** Wrap each Suspense boundary in an `ErrorBoundary` from `@pulse/ui`. Stop the mock API for one endpoint (modify the MSW handler to return a 500) and verify the error boundary catches it without crashing the rest of the dashboard.
- **Nested Suspense:** Add a Suspense boundary inside `BigTable` around the pagination controls. When the user changes pages, the table header stays visible while only the rows show a loading state.
- **`useTransition` for navigation:** Wrap route changes in `useTransition` so the previous route stays visible while the next route's data loads, instead of showing a page-level skeleton.

---

## Solution

If you need to catch up, the completed state for this exercise is available on the `03-monorepo-start` branch:

```bash
git checkout 03-monorepo-start
pnpm install
```

---

## What's Next

You've seen how Suspense boundaries control the loading experience across independently-fetching components. The dashboard now has multiple packages (analytics, ui, shared) but no build orchestration — `pnpm -r build` rebuilds everything every time. In the next exercise, you'll add Turborepo to get cached, dependency-aware builds and feel the difference when a second build takes near-zero time.
