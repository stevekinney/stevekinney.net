---
title: Use Layout Effect And Effect Typing
description: >-
  React's useEffect and useLayoutEffect look nearly identical on the surface,
  but their timing differences can make or break your UI. One runs after the DOM
  updates, the other runs synchronously before the browser paints—and choosing
  wrong...
modified: '2025-09-06T17:49:18-06:00'
date: '2025-09-06T17:49:18-06:00'
---

React's `useEffect` and `useLayoutEffect` look nearly identical on the surface, but their timing differences can make or break your UI. One runs after the DOM updates, the other runs synchronously before the browser paints—and choosing wrong can lead to flickering layouts or janky animations. With TypeScript, we can make these effects type-safe and catch common pitfalls before they reach production.

Understanding when to reach for `useLayoutEffect` instead of `useEffect` is crucial for building performant React applications. The key difference isn't just _when_ they run—it's about preventing visual inconsistencies that make your app feel broken to users.

## The Fundamental Difference

Both hooks follow the same API, but their execution timing is completely different:

```ts
// ✅ useEffect: Runs asynchronously after DOM updates and paint
useEffect(() => {
  // Runs after the browser has painted the screen
  console.log('DOM is painted, user can see changes');
}, []);

// ✅ useLayoutEffect: Runs synchronously before paint
useLayoutEffect(() => {
  // Runs after DOM mutations but before browser paint
  console.log("DOM is updated, but user hasn't seen changes yet");
}, []);
```

Think of it this way: `useEffect` is like sending a postcard—it gets there eventually, after everything else is done. `useLayoutEffect` is like a phone call—it happens immediately and blocks everything else until it's finished.

> [!NOTE]
> Both hooks have identical TypeScript signatures, but their timing implications affect how you should type their dependencies and cleanup functions.

## When to Use `useLayoutEffect`

Use `useLayoutEffect` when you need to:

1. **Measure DOM elements** before the browser paints
2. **Modify styles** that would cause visible layout shifts
3. **Synchronously update** state based on DOM measurements
4. **Prevent flickering** in animations or transitions

Here's a common Real World Use Case™—measuring an element's dimensions:

```ts
import { useLayoutEffect, useRef, useState } from 'react';

interface ElementDimensions {
  width: number;
  height: number;
}

function useMeasure<T extends HTMLElement>(): [React.RefObject<T>, ElementDimensions] {
  const ref = useRef<T>(null);
  const [dimensions, setDimensions] = useState<ElementDimensions>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    if (!ref.current) return;

    const measure = (): void => {
      const { offsetWidth, offsetHeight } = ref.current!;
      setDimensions({
        width: offsetWidth,
        height: offsetHeight,
      });
    };

    measure(); // Initial measurement

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [ref, dimensions];
}
```

Notice how we're using `useLayoutEffect` here because we need the DOM measurements _before_ the browser paints. If we used `useEffect`, the component would render with `width: 0, height: 0` initially, then jump to the correct dimensions—causing a visual flicker.

> [!TIP]
> TypeScript's strict null checks help catch ref access errors. Always check `ref.current` exists before using it, even in layout effects.

## Typing Effect Dependencies

Both effects require careful typing of their dependencies. Here's how to avoid common TypeScript pitfalls:

```ts
// ❌ Bad: Poorly typed dependencies
function BadExample({ userId }: { userId: string | undefined }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // TypeScript can't guarantee userId isn't undefined here
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
  }, [userId]); // This dependency could be undefined

  return user ? <div>{user.name}</div> : null;
}

// ✅ Good: Properly typed with guards
interface User {
  id: string;
  name: string;
  email: string;
}

function GoodExample({ userId }: { userId: string | undefined }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    const fetchUser = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const userData: User = await response.json();
        setUser(userData);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching user:', error);
          setUser(null);
        }
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, [userId]); // Now properly guarded against undefined

  return user ? <div>{user.name}</div> : null;
}
```

## Typing Cleanup Functions

Both effects can return cleanup functions, and TypeScript helps ensure they're properly typed:

```ts
// ✅ Good: Properly typed cleanup with explicit return type
useLayoutEffect((): (() => void) | void => {
  if (!ref.current) return; // Early return, no cleanup needed

  const element = ref.current;
  const handleResize = (): void => {
    // Handle resize logic
  };

  element.addEventListener('resize', handleResize);

  // TypeScript ensures this returns the correct cleanup type
  return (): void => {
    element.removeEventListener('resize', handleResize);
  };
}, []);
```

> [!WARNING]
> Never return a promise from an effect cleanup function. React expects cleanup to be synchronous.

```ts
// ❌ Bad: Returning a promise from cleanup
useEffect(() => {
  return async () => {
    await cleanup(); // TypeScript error: cleanup must be synchronous
  };
}, []);

// ✅ Good: Synchronous cleanup with async handling
useEffect(() => {
  return () => {
    cleanup().catch((error) => {
      console.error('Cleanup failed:', error);
    });
  };
}, []);
```

## Performance Considerations and Typing

`useLayoutEffect` is synchronous and blocks painting, so TypeScript can help us be more intentional about expensive operations:

```ts
interface ExpensiveCalculationResult {
  result: number;
  computationTime: number;
}

// ❌ Bad: Expensive sync operation in useLayoutEffect
function BadPerformance() {
  const [result, setResult] = useState<number>(0);

  useLayoutEffect(() => {
    // This blocks painting! Don't do this.
    const expensive = heavyComputation();
    setResult(expensive);
  }, []);

  return <div>{result}</div>;
}

// ✅ Good: Move expensive work to useEffect
function GoodPerformance() {
  const [result, setResult] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(true);

  useEffect(() => {
    const performCalculation = async (): Promise<void> => {
      setIsCalculating(true);

      // Use setTimeout to yield control back to the browser
      const calculation = await new Promise<ExpensiveCalculationResult>(resolve => {
        setTimeout(() => {
          const start = performance.now();
          const result = heavyComputation();
          const computationTime = performance.now() - start;

          resolve({ result, computationTime });
        }, 0);
      });

      setResult(calculation.result);
      setIsCalculating(false);
    };

    performCalculation();
  }, []);

  if (isCalculating) {
    return <div>Calculating...</div>;
  }

  return <div>{result}</div>;
}
```

## Common TypeScript Pitfalls

### Stale Closures with Event Handlers

```ts
// ❌ Bad: Stale closure captures old count value
function StaleClosureExample() {
  const [count, setCount] = useState<number>(0);

  useLayoutEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        // This captures the initial count value (0) forever
        setCount(count + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return (): void => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Empty deps array creates stale closure

  return <div>Count: {count}</div>;
}

// ✅ Good: Use functional updates to avoid stale closures
function FreshClosureExample() {
  const [count, setCount] = useState<number>(0);

  useLayoutEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        // Functional update always gets the latest state
        setCount(currentCount => currentCount + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return (): void => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Now the empty deps array is safe

  return <div>Count: {count}</div>;
}
```

### Ref Current Type Guards

```ts
// ❌ Bad: Not checking ref.current exists
function UnsafeRefAccess() {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    // TypeScript error: Object is possibly 'null'
    inputRef.current.focus();
  }, []);

  return <input ref={inputRef} />;
}

// ✅ Good: Always guard ref access
function SafeRefAccess() {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();

    // TypeScript knows input is non-null in this block
    const handleFocus = (): void => {
      input.select(); // Safe to access input here
    };

    input.addEventListener('focus', handleFocus);

    return (): void => {
      input.removeEventListener('focus', handleFocus);
    };
  }, []);

  return <input ref={inputRef} />;
}
```

## Real-World Example: Tooltip Positioning

Here's a practical example that combines proper typing with `useLayoutEffect` for tooltip positioning:

```ts
interface Position {
  top: number;
  left: number;
}

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  isVisible: boolean;
}

function Tooltip({ children, content, isVisible }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const calculatePosition = (): Position => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = triggerRect.bottom + 8;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

      // Prevent tooltip from going off-screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }

      if (top + tooltipRect.height > viewportHeight - 8) {
        top = triggerRect.top - tooltipRect.height - 8;
      }

      return { top, left };
    };

    const newPosition = calculatePosition();
    setPosition(newPosition);
  }, [isVisible]); // Recalculate when visibility changes

  return (
    <>
      <div ref={triggerRef}>
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
```

This example uses `useLayoutEffect` because we need to:

1. Measure the trigger and tooltip elements
2. Calculate the optimal position
3. Apply the position before the browser paints

Using `useEffect` here would cause the tooltip to briefly appear in the wrong position before jumping to the correct spot.

## Testing Layout Effects

Testing components with `useLayoutEffect` requires special consideration since they run synchronously:

```ts
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';

// Mock ResizeObserver for tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

test('measures element dimensions synchronously', () => {
  const TestComponent = () => {
    const [ref, dimensions] = useMeasure<HTMLDivElement>();

    return (
      <div
        ref={ref}
        data-testid="measured-element"
        style={{ width: 200, height: 100 }}
      >
        {dimensions.width}x{dimensions.height}
      </div>
    );
  };

  // act() ensures layout effects run before assertions
  act(() => {
    render(<TestComponent />);
  });

  expect(screen.getByTestId('measured-element')).toHaveTextContent('200x100');
});
```

> [!TIP]
> Always wrap renders that trigger layout effects in `act()` to ensure they complete before your assertions run.

## Key Takeaways

- **Use `useLayoutEffect`** when you need synchronous DOM measurements or style updates that prevent visual flicker
- **Use `useEffect`** for asynchronous operations, API calls, and side effects that don't need to block painting
- **Always type your dependencies** explicitly and use proper type guards for refs and nullable values
- **Be mindful of performance**—`useLayoutEffect` blocks the browser paint cycle
- **Test layout effects** with `act()` to ensure they complete before assertions

The choice between these hooks often comes down to user experience. If your users would notice a visual jump or flicker, reach for `useLayoutEffect`. If they wouldn't notice the delay, stick with `useEffect` and keep the main thread responsive.

With proper TypeScript typing, you can catch potential issues early and ensure your effects handle edge cases gracefully—leading to more robust, performant React applications that feel polished to your users.
