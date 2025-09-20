---
title: Performance Characteristics of useLayoutEffect
description: >-
  Know when layout effects are necessary—and when they block paint. Prefer
  passive effects and measure before forcing sync work.
date: 2025-09-06T22:29:02.602Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - hooks
  - effects
---

`useLayoutEffect` runs synchronously after all DOM mutations but before the browser paints. This timing makes it powerful for preventing visual glitches but potentially expensive for performance. Let's explore when you need it, when you don't, and how to measure its impact on your application's responsiveness.

The key insight: `useLayoutEffect` forces React to block the browser's paint process until your effect completes. This can be exactly what you need—or exactly what's killing your frame rate.

## Understanding the Timing Difference

React provides two hooks for side effects that run after render: `useEffect` and `useLayoutEffect`. The difference lies in their relationship to the browser's rendering pipeline.

```tsx
function TimingDemo() {
  const [count, setCount] = useState(0);

  // ✅ Runs asynchronously after paint
  useEffect(() => {
    console.log('useEffect runs after paint');
  }, [count]);

  // 🟡 Runs synchronously before paint (blocking)
  useLayoutEffect(() => {
    console.log('useLayoutEffect runs before paint');
  }, [count]);

  return <div>Count: {count}</div>;
}
```

Here's what happens during a typical render cycle:

1. React renders your component
2. DOM mutations are applied
3. **`useLayoutEffect` runs synchronously** ← Blocks here
4. Browser paints the screen
5. `useEffect` runs asynchronously

This synchronous execution is both `useLayoutEffect`'s superpower and its performance pitfall.

## When You Actually Need `useLayoutEffect`

Use `useLayoutEffect` when you need to read from or write to the DOM before the browser paints—typically to prevent visual flicker or measure elements.

### Measuring DOM Elements

The most common legitimate use case is measuring elements that depend on dynamic content:

```tsx
function AutoResizingTextarea() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');

  // ✅ Good use of useLayoutEffect - prevents visible height jumps
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to measure natural height
    textarea.style.height = '0px';
    const scrollHeight = textarea.scrollHeight;

    // Apply the measured height
    textarea.style.height = `${scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  );
}
```

### Preventing Layout Thrashing

When you need to read and immediately write layout properties:

```tsx
function ScrollSyncedHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    // Read and write in the same frame to prevent thrashing
    const opacity = Math.max(0, 1 - scrollY / 100);
    header.style.opacity = opacity.toString();

    // Position sticky header based on scroll
    header.style.transform = `translateY(${Math.max(0, scrollY - 50)}px)`;
  }, [scrollY]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <header ref={headerRef}>Scroll-synced header</header>;
}
```

## Performance Characteristics and Costs

`useLayoutEffect` has measurable performance implications because it blocks the main thread during the critical rendering path.

### Blocking the Paint Process

Every millisecond spent in `useLayoutEffect` directly delays when users see your updates:

```tsx
function ExpensiveLayoutEffect() {
  const [data, setData] = useState<number[]>([]);

  // ❌ Bad - blocks paint for expensive computation
  useLayoutEffect(() => {
    // Simulating expensive DOM measurements
    const measurements = [];
    for (let i = 0; i < 1000; i++) {
      const element = document.querySelector(`[data-item="${i}"]`);
      if (element) {
        measurements.push(element.getBoundingClientRect());
      }
    }

    console.log('Blocking paint for', measurements.length, 'measurements');
  }, [data]);

  // ✅ Better - use useEffect unless sync timing is critical
  useEffect(() => {
    // Same expensive work, but doesn't block paint
    // User sees the update immediately, measurements happen after
  }, [data]);
}
```

### Impact on Concurrent Features

`useLayoutEffect` runs synchronously even in React's Concurrent Mode, which can interfere with features like time slicing:

```tsx
function ConcurrentUnfriendly() {
  const [items, setItems] = useState<Item[]>([]);

  // This blocks even during concurrent rendering
  useLayoutEffect(() => {
    // Heavy DOM work that can't be interrupted
    items.forEach((item, index) => {
      const element = document.querySelector(`[data-id="${item.id}"]`);
      if (element) {
        // Expensive layout calculations
        element.style.transform = calculateTransform(item, index);
      }
    });
  }, [items]);
}
```

## Measuring Performance Impact

Use the React DevTools Profiler and browser performance tools to measure the actual cost:

```tsx
function MeasuredLayoutEffect() {
  const [trigger, setTrigger] = useState(0);

  useLayoutEffect(() => {
    const start = performance.now();

    // Your layout effect work
    document.querySelectorAll('.measured-element').forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Do something with measurements
    });

    const end = performance.now();
    console.log(`Layout effect took ${end - start}ms`);
  }, [trigger]);

  return <button onClick={() => setTrigger((t) => t + 1)}>Trigger Layout Effect</button>;
}
```

> [!TIP]
> Use `performance.mark()` and `performance.measure()` for more sophisticated profiling that integrates with browser DevTools.

## Optimization Strategies

### Batch DOM Operations

When you must use `useLayoutEffect`, batch your DOM operations to minimize layout thrashing:

```tsx
function BatchedLayoutOperations() {
  const [items, setItems] = useState<Item[]>([]);

  useLayoutEffect(() => {
    // ❌ Bad - causes multiple layout recalculations
    items.forEach((item) => {
      const el = document.querySelector(`[data-id="${item.id}"]`);
      if (el) {
        el.style.height = `${item.height}px`; // Layout recalc
        el.style.width = `${item.width}px`; // Layout recalc
      }
    });

    // ✅ Better - batch style changes
    const updates = items.map((item) => ({
      element: document.querySelector(`[data-id="${item.id}"]`),
      styles: { height: `${item.height}px`, width: `${item.width}px` },
    }));

    // Apply all changes together
    updates.forEach(({ element, styles }) => {
      if (element) {
        Object.assign(element.style, styles);
      }
    });
  }, [items]);
}
```

### Use ResizeObserver When Appropriate

For measuring elements, consider `ResizeObserver` as an alternative to layout effects:

```tsx
function ResizeObserverExample() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // ResizeObserver is more efficient than layout effects for size changes
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={elementRef}>
      Content that might resize: {dimensions.width}x{dimensions.height}
    </div>
  );
}
```

## Common Anti-Patterns to Avoid

### Using `useLayoutEffect` for Non-DOM Side Effects

```tsx
// ❌ Bad - doesn't need to block paint
useLayoutEffect(() => {
  // API calls don't need synchronous timing
  fetchUserData(userId).then(setUser);
}, [userId]);

// ❌ Bad - local storage doesn't need to block paint
useLayoutEffect(() => {
  localStorage.setItem('theme', currentTheme);
}, [currentTheme]);

// ✅ Good - use regular useEffect instead
useEffect(() => {
  fetchUserData(userId).then(setUser);
}, [userId]);
```

### Overusing for "Feels Faster"

```tsx
function OverEngineeredComponent() {
  const [data, setData] = useState(null);

  // ❌ Bad - no visual benefit, just blocking paint
  useLayoutEffect(() => {
    // This doesn't prevent visual flicker, just delays everything
    processData(data);
  }, [data]);

  // ✅ Better - let the user see the update immediately
  useEffect(() => {
    processData(data);
  }, [data]);
}
```

## React 19 Considerations

React 19's Concurrent Features make `useLayoutEffect` even more important to use judiciously. The new rendering model makes blocking synchronous work more visible to users.

```tsx
function React19Aware() {
  const [items, setItems] = useState<Item[]>([]);

  // Consider if you can use startTransition to make updates non-blocking
  const updateItems = useCallback((newItems: Item[]) => {
    startTransition(() => {
      setItems(newItems);
    });
  }, []);

  // Only use layout effect if you absolutely need sync DOM access
  useLayoutEffect(() => {
    // Measure only what you must measure synchronously
    const criticalMeasurements = measureCriticalElements();
    applyCriticalUpdates(criticalMeasurements);
  }, [items]);

  // Move non-critical work to regular effects
  useEffect(() => {
    updateNonCriticalUI(items);
  }, [items]);
}
```

## Testing Layout Effect Performance

Create performance benchmarks to validate your `useLayoutEffect` usage:

```tsx
function PerformanceTest() {
  const [iterations, setIterations] = useState(0);
  const timeRef = useRef<number[]>([]);

  useLayoutEffect(() => {
    const start = performance.now();

    // Simulate your actual layout work
    for (let i = 0; i < 100; i++) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const rect = el.getBoundingClientRect(); // Force layout
      document.body.removeChild(el);
    }

    const duration = performance.now() - start;
    timeRef.current.push(duration);

    if (timeRef.current.length > 10) {
      const avg = timeRef.current.reduce((a, b) => a + b) / timeRef.current.length;
      console.log(`Average layout effect time: ${avg.toFixed(2)}ms`);
      timeRef.current = [];
    }
  }, [iterations]);

  return (
    <button onClick={() => setIterations((i) => i + 1)}>
      Run Performance Test (iterations: {iterations})
    </button>
  );
}
```

## Related Topics

- **[Animation Performance](./animation-performance.md)** - Use useLayoutEffect for smooth animations without layout thrashing
- **[Flushsync in React DOM](./flushsync-in-react-dom.md)** - Understand synchronous DOM updates and when they're necessary
- **[INP Optimization & Long Tasks](./inp-optimization-long-tasks.md)** - Minimize useLayoutEffect impact on Interaction to Next Paint metrics
- **[GPU Acceleration Patterns](./gpu-acceleration-patterns.md)** - Combine useLayoutEffect with GPU-accelerated properties for optimal performance
- **[Debugging Performance Issues](./debugging-performance-issues.md)** - Profile and identify useLayoutEffect performance bottlenecks

## The Bottom Line

`useLayoutEffect` is a precision tool—use it when you need synchronous DOM access before paint, not as a general-purpose effect hook. The performance cost is real and measurable. When in doubt, start with `useEffect` and only upgrade to `useLayoutEffect` when you can demonstrate that the synchronous timing prevents a specific visual problem.

Remember: every millisecond spent in `useLayoutEffect` is a millisecond your users are waiting to see their update. Make those milliseconds count.
