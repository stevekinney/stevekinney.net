---
title: Selective Hydration in Modern React Apps
description: >-
  Hydrate what matters first. Prioritize above‑the‑fold work so pages feel
  interactive even while the rest continues to load.
date: 2025-09-06T22:05:42.929Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - hydration
  - ssr
---

Your users don't care about the footer interactive when they're trying to click "Add to Cart." Selective hydration in React 18+ lets you prioritize what gets hydrated first, making your server-rendered apps feel snappy where it matters most—even while the rest of your page is still waking up in the background.

Think of hydration like filling a swimming pool: instead of waiting for the entire pool to fill before anyone can swim, selective hydration lets people jump into the shallow end while the deep end is still filling up. Your critical components become interactive immediately while less important ones hydrate at their own pace.

## What is Selective Hydration?

Traditional hydration is all-or-nothing. Your entire React app needs to hydrate before any part becomes interactive—even if users are only interested in clicking one button above the fold. This creates frustrating experiences where users click things that look interactive but don't respond because JavaScript hasn't finished loading and executing.

Selective hydration changes this. It allows React to:

1. **Start hydrating high-priority components immediately**
2. **Delay hydration of lower-priority sections**
3. **Respond to user interactions by prioritizing those components**
4. **Stream in components as they become ready**

The key insight? Not all parts of your UI are equally important when the page first loads.

## How Selective Hydration Works Under the Hood

React 18 introduced concurrent features that enable selective hydration through `Suspense` boundaries. Here's the magic:

```tsx
// ✅ Components wrap in Suspense can hydrate independently
function App() {
  return (
    <div>
      <Header /> {/* Always hydrates first */}
      <Suspense fallback={<ShoppingCartSkeleton />}>
        <ShoppingCart /> {/* High priority - hydrates early */}
      </Suspense>
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList /> {/* Medium priority */}
      </Suspense>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer /> {/* Low priority - hydrates last */}
      </Suspense>
    </div>
  );
}
```

When a user tries to interact with a component that hasn't hydrated yet, React automatically prioritizes hydrating that component first. It's like having a smart waiter who brings your appetizer before your tablemate's dessert, even if the dessert was ordered first.

## Setting Up Selective Hydration

Let's build a realistic example. Imagine an e-commerce product page with several distinct sections that have different priorities.

### Basic Setup with `Suspense` Boundaries

```tsx
import { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load non-critical components
const Reviews = lazy(() => import('./Reviews'));
const RecommendedProducts = lazy(() => import('./RecommendedProducts'));
const Footer = lazy(() => import('./Footer'));

function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      {/* Critical above-the-fold content - always hydrates first */}
      <ProductHeader productId={productId} />
      <ProductImages productId={productId} />
      <AddToCartButton productId={productId} />

      {/* Medium priority - user might scroll to quickly */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100" />}>
        <ErrorBoundary fallback={<div>Product details unavailable</div>}>
          <ProductDetails productId={productId} />
        </ErrorBoundary>
      </Suspense>

      {/* Lower priority - typically below the fold */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50" />}>
        <ErrorBoundary fallback={<div>Reviews temporarily unavailable</div>}>
          <Reviews productId={productId} />
        </ErrorBoundary>
      </Suspense>

      {/* Lowest priority - auxiliary content */}
      <Suspense fallback={<div className="h-48 animate-pulse bg-gray-50" />}>
        <RecommendedProducts productId={productId} />
      </Suspense>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
```

### Smart Priority with User Interactions

Here's where selective hydration really shines. When users interact with components, React automatically bumps their hydration priority:

```tsx
function ProductPage({ productId }: { productId: string }) {
  return (
    <div>
      <ProductHeader productId={productId} />

      {/* If user clicks on reviews tab, this gets priority */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews
          productId={productId}
          onTabClick={() => {
            // React automatically prioritizes this component's hydration
            // when user interaction is detected
          }}
        />
      </Suspense>

      {/* Same for recommended products carousel */}
      <Suspense fallback={<CarouselSkeleton />}>
        <RecommendedProducts
          productId={productId}
          onProductClick={(id) => {
            // User interaction triggers priority hydration
            navigate(`/products/${id}`);
          }}
        />
      </Suspense>
    </div>
  );
}
```

## Advanced Patterns and Real-World Usage

### Progressive Enhancement with Feature Detection

Not all features need to be interactive immediately. You can progressively enhance your UI:

```tsx
function SearchBar() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Component is now hydrated and interactive
    setIsHydrated(true);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className={`w-full rounded border p-2 ${
          isHydrated ? 'border-blue-500' : 'border-gray-300'
        }`}
      />

      {/* Only show interactive features after hydration */}
      {isHydrated && (
        <Suspense fallback={null}>
          <SearchSuggestions query={query} />
        </Suspense>
      )}
    </div>
  );
}
```

### Data-Dependent Selective Hydration

Sometimes hydration priority depends on the data itself:

```tsx
function DashboardWidget({
  widget,
  priority,
}: {
  widget: Widget;
  priority: 'high' | 'medium' | 'low';
}) {
  // High priority widgets load immediately
  if (priority === 'high') {
    return <InteractiveWidget data={widget} />;
  }

  // Lower priority widgets use Suspense
  return (
    <Suspense fallback={<WidgetSkeleton title={widget.title} height={widget.height} />}>
      <LazyInteractiveWidget data={widget} priority={priority} />
    </Suspense>
  );
}

function Dashboard({ widgets }: { widgets: Widget[] }) {
  // Sort widgets by priority for hydration order
  const prioritizedWidgets = useMemo(
    () =>
      widgets.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    [widgets],
  );

  return (
    <div className="grid gap-4">
      {prioritizedWidgets.map((widget) => (
        <DashboardWidget key={widget.id} widget={widget} priority={widget.priority} />
      ))}
    </div>
  );
}
```

## Common Pitfalls and How to Avoid Them

### Over-Suspensing Your Components

Don't wrap every single component in Suspense. This creates unnecessary overhead:

```tsx
// ❌ Bad: Too granular
function ProductCard({ product }) {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductImage src={product.image} />
      </Suspense>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductTitle title={product.title} />
      </Suspense>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductPrice price={product.price} />
      </Suspense>
    </div>
  );
}

// ✅ Good: Group related functionality
function ProductCard({ product }) {
  return (
    <Suspense fallback={<ProductCardSkeleton />}>
      <ProductCardContent product={product} />
    </Suspense>
  );
}
```

### Forgetting About Error Boundaries

Always pair Suspense with proper error handling:

```tsx
function SafeSelectiveComponent({ data }: { data: unknown }) {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong. Please try again.</div>}
      onError={(error) => {
        // Log error for monitoring
        console.error('Component failed to hydrate:', error);
      }}
    >
      <Suspense fallback={<ComponentSkeleton />}>
        <LazyComponent data={data} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Inconsistent Fallback States

Make sure your skeleton states match your actual content dimensions:

```tsx
// ✅ Good: Skeleton matches actual content layout
function ProductListSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-48 animate-pulse rounded bg-gray-200" />
          <div className="h-4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
```

## Performance Benefits and Trade-offs

### The Good News

Selective hydration can dramatically improve perceived performance:

- **Faster time to interactive** for critical components
- **Better user experience** during hydration
- **Reduced main thread blocking** during initial load
- **Automatic priority management** based on user interactions

### The Considerations

Like any optimization, selective hydration has trade-offs:

- **Increased complexity** in component architecture
- **More bundle splitting** can increase overall bundle size
- **Error boundaries become critical** for good UX
- **Testing becomes more complex** with async loading

## When to Use Selective Hydration

Selective hydration works best when you have:

1. **Clear content hierarchy** (above/below fold, primary/secondary features)
2. **Heavy components** that are expensive to hydrate
3. **User-driven interactions** where you can predict priority
4. **Server-side rendering** already in place

Consider it essential for:

- **E-commerce sites** (product pages, shopping carts)
- **Dashboards** (widget-based layouts)
- **Content sites** (articles with comments, related content)
- **Social platforms** (feeds with infinite scroll)

## Measuring Success

Track these metrics to validate your selective hydration implementation:

```tsx
// Simple performance tracking
function measureHydrationPerformance() {
  const navigationStart = performance.getEntriesByType('navigation')[0]?.startTime || 0;

  // Measure when critical components become interactive
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'critical-component-hydrated') {
        console.log(`Critical hydration completed in ${entry.startTime - navigationStart}ms`);
      }
    }
  });

  observer.observe({ entryTypes: ['measure'] });
}

// Mark critical hydration completion
function CriticalComponent() {
  useEffect(() => {
    performance.mark('critical-component-hydrated');
  }, []);

  return <div>{/* Your critical content */}</div>;
}
```

Focus on:

- **Time to Interactive (TTI)** for critical components
- **First Input Delay (FID)** improvements
- **User interaction success rates** during hydration
- **Cumulative Layout Shift (CLS)** from skeleton transitions

## The Bottom Line

Selective hydration transforms server-rendered apps from "all or nothing" to "progressive by default." By wrapping less critical components in Suspense boundaries and leveraging React's automatic prioritization, you can create apps that feel responsive from the moment they load—even while parts are still hydrating in the background.
