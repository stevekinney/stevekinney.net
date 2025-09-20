---
title: Code‑Splitting and Lazy Loading
description: >-
  Load less JavaScript upfront. Split routes, components, and vendors to speed
  first paint and boost Core Web Vitals.
date: 2025-09-06T22:08:00.761Z
modified: '2025-09-20T15:36:56-06:00'
published: true
tags:
  - react
  - performance
  - bundling
  - web-vitals
---

Your JavaScript bundle is getting out of hand. What started as a modest React app has grown into a 2MB monolith that takes forever to load, especially on slower connections. Users are bouncing before they even see your beautiful loading spinner (which is probably over-engineered anyway). Enter code-splitting and lazy loading—the performance optimization techniques that let you serve only what users actually need, when they need it.

Code-splitting breaks your bundle into smaller chunks that can be loaded on-demand, while lazy loading defers non-critical resources until they're required. Together, they dramatically reduce your initial bundle size and improve Core Web Vitals—particularly **Largest Contentful Paint** (LCP) and **First Input Delay** (FID). More importantly, they keep your users happy and engaged.

## The Bundle Size Problem

Before we dive into solutions, let's understand what we're solving. Modern React applications often suffer from "bundle bloat"—shipping massive JavaScript files that include everything from your authentication logic to that rarely-used admin dashboard to the entire lodash library (because someone imported `debounce` once).

The typical progression looks like this:

1. **MVP**: 200KB bundle, loads instantly
2. **Adding features**: 500KB bundle, still acceptable
3. **Third-party integrations**: 1.2MB bundle, getting slow
4. **"Just one more library"**: 2.5MB bundle, users complaining

By the time you notice the problem, you're shipping way more JavaScript than any single page needs. Code-splitting fixes this by breaking your monolith into digestible chunks.

## Route-Based Code Splitting

The easiest win is splitting your app by routes. Most users don't visit every page in a single session, so why make them download the entire admin dashboard when they just want to update their profile?

### Basic Route Splitting with React Router

Here's how to implement route-based splitting with React Router v6:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// ✅ Lazy load route components
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

> [!TIP]
> Always wrap lazy-loaded components in `Suspense`. Without it, React will throw an error when trying to render a component that's still loading.

### Advanced Route Splitting

For larger applications, you might want to create route modules that include not just the component, but also related utilities, hooks, and styles:

```tsx
// pages/Dashboard/index.ts
export { default } from './Dashboard';

// pages/Dashboard/Dashboard.tsx
import { DashboardChart } from './components/DashboardChart';
import { useDashboardData } from './hooks/useDashboardData';
import './Dashboard.css';

export default function Dashboard() {
  const { data, loading } = useDashboardData();

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <DashboardChart data={data} />
    </div>
  );
}
```

This approach ensures that dashboard-specific code (including CSS and utilities) only loads when users visit the dashboard route.

## Component-Based Code Splitting

Sometimes you need finer-grained control. Maybe you have a heavy component that's only shown conditionally—like a rich text editor that appears when users click "Edit" or a data visualization that renders based on user preferences.

### Lazy Loading Modal Components

Modals are perfect candidates for lazy loading since they're hidden by default:

```tsx
import { useState, Suspense, lazy } from 'react';

// ✅ Only load the heavy modal when needed
const EditPostModal = lazy(() => import('./components/EditPostModal'));
const DeleteConfirmModal = lazy(() => import('./components/DeleteConfirmModal'));

function PostActions({ postId }: { postId: string }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowEditModal(true)}>Edit Post</button>
      <button onClick={() => setShowDeleteModal(true)}>Delete Post</button>

      <Suspense fallback={<div>Loading...</div>}>
        {showEditModal && <EditPostModal postId={postId} onClose={() => setShowEditModal(false)} />}
        {showDeleteModal && (
          <DeleteConfirmModal postId={postId} onClose={() => setShowDeleteModal(false)} />
        )}
      </Suspense>
    </div>
  );
}
```

### Lazy Loading Based on User Permissions

You can also conditionally load components based on user roles or permissions:

```tsx
import { Suspense, lazy } from 'react';
import { useAuth } from './hooks/useAuth';

// ✅ Admin-only components are split into separate bundles
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));

function Dashboard() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {user.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
    </Suspense>
  );
}
```

## Vendor Code Splitting

Third-party libraries can be huge. Chart.js, moment.js, or even React itself can dominate your bundle size. Modern bundlers can automatically split vendor code, but you can optimize further with strategic imports.

### Splitting Heavy Libraries

Instead of importing entire libraries upfront, load them when needed:

```tsx
import { useState, useEffect } from 'react';

type ChartData = {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
};

function DataVisualization({ data }: { data: ChartData }) {
  const [Chart, setChart] = useState<any>(null);

  useEffect(() => {
    // ✅ Only load Chart.js when this component mounts
    import('chart.js/auto').then((ChartModule) => {
      setChart(() => ChartModule.Chart);
    });
  }, []);

  if (!Chart) {
    return <div>Loading chart...</div>;
  }

  return <canvas ref={(canvas) => new Chart(canvas, { data })} />;
}
```

### Bundle Analysis and Optimization

Use webpack-bundle-analyzer or similar tools to identify optimization opportunities:

```bash
# Install the analyzer
npm install --save-dev webpack-bundle-analyzer

# For analyzing bundle composition
npm install --save-dev source-map-explorer

# Analyze your bundle
npm run build
npx source-map-explorer 'dist/assets/*.js'
```

This visualization shows exactly which libraries are eating up your bundle size, helping you decide what to split or replace.

## Advanced Patterns and Best Practices

### Preloading Critical Routes

You can preload routes that users are likely to visit next:

```tsx
import { useEffect } from 'react';

function HomePage() {
  useEffect(() => {
    // ✅ Preload the dashboard route when user is likely to navigate there
    const timer = setTimeout(() => {
      import('../pages/Dashboard');
    }, 2000); // Preload after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, []);

  return <div>Welcome to our app!</div>;
}
```

### Error Boundaries for Lazy Components

Always wrap lazy components in error boundaries to handle loading failures gracefully:

```tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

class LazyErrorBoundary extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong loading this component.</div>;
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <LazyErrorBoundary fallback={<div>Failed to load page</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyRoute />
      </Suspense>
    </LazyErrorBoundary>
  );
}
```

### Smart Fallback Components

Instead of generic "Loading..." messages, create meaningful fallbacks that match your UI:

```tsx
import { Suspense } from 'react';

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-1/4 rounded bg-gray-200"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-32 rounded bg-gray-200"></div>
        <div className="h-32 rounded bg-gray-200"></div>
        <div className="h-32 rounded bg-gray-200"></div>
      </div>
    </div>
  );
}

<Suspense fallback={<DashboardSkeleton />}>
  <Dashboard />
</Suspense>;
```

## Measuring the Impact

### Before and After Metrics

Track these key metrics to measure your code-splitting success:

- **Initial bundle size**: How much JavaScript loads on first visit
- **Time to First Contentful Paint (FCP)**: When users see something useful
- **Time to Interactive (TTI)**: When the page becomes fully interactive
- **Route transition speed**: How quickly lazy routes load

### Using React DevTools Profiler

The React DevTools Profiler can show you exactly how long components take to load and render:

```tsx
import { Profiler } from 'react';

function onRenderCallback(id: string, phase: string, actualDuration: number) {
  console.log(`${id} (${phase}) took ${actualDuration}ms to render`);
}

<Profiler id="LazyDashboard" onRender={onRenderCallback}>
  <Suspense fallback={<DashboardSkeleton />}>
    <Dashboard />
  </Suspense>
</Profiler>;
```

## Common Pitfalls and How to Avoid Them

### Over-Splitting

Don't split everything. Very small components (< 10KB) might not be worth splitting due to the overhead of additional network requests.

```tsx
// ❌ Probably not worth splitting
const SmallIcon = lazy(() => import('./SmallIcon')); // 2KB component

// ✅ Definitely worth splitting
const RichTextEditor = lazy(() => import('./RichTextEditor')); // 200KB component
```

### Forgetting to Handle Loading States

Always provide meaningful loading states. Users shouldn't see blank screens or broken layouts while components load.

```tsx
// ❌ Bad: No loading state
<Suspense>
	<HeavyComponent />
</Suspense>

// ✅ Good: Meaningful loading state
<Suspense fallback={<ComponentSkeleton />}>
	<HeavyComponent />
</Suspense>
```

### Splitting Too Late

Implement code-splitting early in development, not as an afterthought when performance becomes a problem. It's much easier to architect for splitting from the start.

## Related Topics

- **[Bundle Analysis Deep Dive](./bundle-analysis-deep-dive.md)** - Analyze bundles to identify splitting opportunities
- **[CDN Caching & Immutable Assets](./cdn-caching-immutable-assets.md)** - Cache split chunks efficiently
- **[Resource Preloading APIs](./resource-preloading-apis.md)** - Preload critical split chunks
- **[Priority Hints Resource Loading](./priority-hints-resource-loading.md)** - Control chunk loading priority
- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Measure splitting impact on metrics
- **[React Server Components RSC](./react-server-components-rsc.md)** - Server-side code splitting patterns

## Next Steps

Code-splitting and lazy loading are fundamental performance optimizations for modern React applications. Start with route-based splitting for quick wins, then move to component-based splitting for fine-grained control. Always measure the impact and prioritize splits based on actual bundle analysis.

Your users will thank you with faster load times, better Core Web Vitals scores, and—most importantly—they'll actually stick around to use your application instead of bouncing to a competitor with a snappier experience.
