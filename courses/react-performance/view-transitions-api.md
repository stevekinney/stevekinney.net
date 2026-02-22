---
title: View Transitions API for React
description: >-
  Create smooth, native-like page transitions in React apps using the View
  Transitions API
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
status: published
tags:
  - React
  - Performance
  - View Transitions
  - Animation
  - UX
---

Your React app navigates instantly thanks to client-side routing. But instant isn't always better. When a page changes abruptly, users lose context. They don't see how the old page relates to the new one. They experience what designers call "cognitive load"—that jarring moment where their brain has to reorient itself.

Native mobile apps solved this years ago with smooth transitions that guide the eye from one state to the next. Now, the View Transitions API brings that same power to the web. Imagine product images that smoothly grow into detailed views. Navigation that slides naturally between pages. State changes that feel intentional, not jarring.

Let's transform your React app's navigation from functional to delightful, using the View Transitions API to create transitions that aren't just smooth—they're meaningful.

## Understanding View Transitions API

The View Transitions API captures snapshots and animates between them:

```typescript
interface ViewTransition {
  ready: Promise<void>; // Resolves when transition is ready
  finished: Promise<void>; // Resolves when transition completes
  updateCallbackDone: Promise<void>; // Resolves when DOM update is done
  skipTransition(): void; // Skip the transition
}

// Basic usage
if (document.startViewTransition) {
  document.startViewTransition(() => {
    // Update the DOM
    updateDOM();
  });
} else {
  // Fallback for browsers without support
  updateDOM();
}
```

## React Integration Patterns

### Basic React Router Integration

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

const useViewTransition = () => {
  const navigate = useNavigate();

  const navigateWithTransition = useCallback((to: string) => {
    if (!document.startViewTransition) {
      navigate(to);
      return;
    }

    document.startViewTransition(async () => {
      navigate(to);
      // Wait for React to render
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }, [navigate]);

  return { navigateWithTransition };
};

// Usage in component
const NavigationLink: React.FC<{ to: string; children: React.ReactNode }> = ({
  to,
  children
}) => {
  const { navigateWithTransition } = useViewTransition();

  return (
    <button onClick={() => navigateWithTransition(to)}>
      {children}
    </button>
  );
};
```

### Advanced Transition Manager

```typescript
class ViewTransitionManager {
  private currentTransition: ViewTransition | null = null;
  private transitionQueue: Array<() => void> = [];

  async startTransition(
    updateDOM: () => void | Promise<void>,
    options?: TransitionOptions,
  ): Promise<void> {
    // Skip if no support
    if (!document.startViewTransition) {
      await updateDOM();
      return;
    }

    // Cancel current transition if exists
    if (this.currentTransition) {
      this.currentTransition.skipTransition();
    }

    // Apply transition class names
    if (options?.className) {
      document.documentElement.classList.add(options.className);
    }

    try {
      this.currentTransition = document.startViewTransition(async () => {
        await updateDOM();
      });

      // Wait for transition to be ready
      await this.currentTransition.ready;

      // Apply custom animations if provided
      if (options?.onReady) {
        options.onReady(this.currentTransition);
      }

      // Wait for transition to complete
      await this.currentTransition.finished;
    } catch (error) {
      console.error('View transition failed:', error);
      // Ensure DOM is updated even if transition fails
      await updateDOM();
    } finally {
      // Cleanup
      if (options?.className) {
        document.documentElement.classList.remove(options.className);
      }
      this.currentTransition = null;

      // Process next transition in queue
      this.processQueue();
    }
  }

  private processQueue() {
    const next = this.transitionQueue.shift();
    if (next) {
      next();
    }
  }

  queueTransition(transition: () => void) {
    this.transitionQueue.push(transition);
    if (!this.currentTransition) {
      this.processQueue();
    }
  }
}

interface TransitionOptions {
  className?: string;
  onReady?: (transition: ViewTransition) => void;
}

// React hook for transition manager
const useTransitionManager = () => {
  const managerRef = useRef(new ViewTransitionManager());
  return managerRef.current;
};
```

## Named View Transitions

### Implementing Shared Element Transitions

```typescript
// Mark elements for shared transitions
const SharedElement: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  return (
    <div
      style={{
        viewTransitionName: id
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

// Product grid with shared elements
const ProductGrid: React.FC = () => {
  const products = useProducts();
  const { navigateWithTransition } = useViewTransition();

  return (
    <div className="grid">
      {products.map(product => (
        <div
          key={product.id}
          onClick={() => navigateWithTransition(`/product/${product.id}`)}
        >
          <SharedElement id={`product-image-${product.id}`}>
            <img src={product.image} alt={product.name} />
          </SharedElement>
          <SharedElement id={`product-title-${product.id}`}>
            <h3>{product.name}</h3>
          </SharedElement>
        </div>
      ))}
    </div>
  );
};

// Product detail with matching shared elements
const ProductDetail: React.FC<{ id: string }> = ({ id }) => {
  const product = useProduct(id);

  return (
    <div className="detail">
      <SharedElement id={`product-image-${id}`}>
        <img src={product.image} alt={product.name} />
      </SharedElement>
      <SharedElement id={`product-title-${id}`}>
        <h1>{product.name}</h1>
      </SharedElement>
      <p>{product.description}</p>
    </div>
  );
};
```

### Dynamic View Transition Names

```typescript
const useDynamicTransitionName = (baseName: string, isActive: boolean) => {
  const [transitionName, setTransitionName] = useState<string | undefined>();

  useEffect(() => {
    if (isActive) {
      setTransitionName(baseName);
    } else {
      // Clear after transition completes
      const timeout = setTimeout(() => {
        setTransitionName(undefined);
      }, 500); // Match transition duration

      return () => clearTimeout(timeout);
    }
  }, [baseName, isActive]);

  return transitionName;
};

// Usage for morphing elements
const MorphingCard: React.FC<{ id: string; expanded: boolean }> = ({
  id,
  expanded
}) => {
  const transitionName = useDynamicTransitionName(`card-${id}`, true);

  return (
    <div
      className={expanded ? 'card-expanded' : 'card-collapsed'}
      style={{ viewTransitionName: transitionName } as React.CSSProperties}
    >
      {/* Card content */}
    </div>
  );
};
```

## Custom CSS Animations

### Defining Transition Animations

```css
/* Default cross-fade animation */
::view-transition-old(root) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(root) {
  animation: fade-in 0.3s ease-out;
}

/* Slide transitions for navigation */
.transition-forward::view-transition-old(root) {
  animation: slide-out-left 0.3s ease-out;
}

.transition-forward::view-transition-new(root) {
  animation: slide-in-right 0.3s ease-out;
}

.transition-back::view-transition-old(root) {
  animation: slide-out-right 0.3s ease-out;
}

.transition-back::view-transition-new(root) {
  animation: slide-in-left 0.3s ease-out;
}

/* Shared element transitions */
::view-transition-group(product-image) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Morph animation for shared elements */
@keyframes morph {
  from {
    border-radius: 8px;
  }
  to {
    border-radius: 0;
  }
}

::view-transition-image-pair(hero-image) {
  animation: morph 0.4s;
}

/* Stagger animations for lists */
::view-transition-group(list-item-1) {
  animation-delay: 0ms;
}
::view-transition-group(list-item-2) {
  animation-delay: 50ms;
}
::view-transition-group(list-item-3) {
  animation-delay: 100ms;
}
```

### Programmatic Animation Control

```typescript
const useAnimatedTransition = () => {
  const applyTransition = useCallback(async (
    updateDOM: () => void,
    animation: AnimationConfig
  ) => {
    if (!document.startViewTransition) {
      updateDOM();
      return;
    }

    const transition = document.startViewTransition(updateDOM);

    await transition.ready;

    // Get all transition pseudo-elements
    const oldElement = document.documentElement.querySelector(
      '::view-transition-old(root)'
    );
    const newElement = document.documentElement.querySelector(
      '::view-transition-new(root)'
    );

    // Apply custom animations using Web Animations API
    if (oldElement) {
      oldElement.animate(
        animation.old.keyframes,
        animation.old.options
      );
    }

    if (newElement) {
      newElement.animate(
        animation.new.keyframes,
        animation.new.options
      );
    }

    await transition.finished;
  }, []);

  return { applyTransition };
};

interface AnimationConfig {
  old: {
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
  };
  new: {
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
  };
}

// Usage example
const CustomTransition: React.FC = () => {
  const { applyTransition } = useAnimatedTransition();
  const [state, setState] = useState('initial');

  const handleTransition = () => {
    applyTransition(
      () => setState('updated'),
      {
        old: {
          keyframes: [
            { opacity: 1, transform: 'scale(1) rotate(0deg)' },
            { opacity: 0, transform: 'scale(0.8) rotate(-10deg)' }
          ],
          options: { duration: 300, easing: 'ease-out' }
        },
        new: {
          keyframes: [
            { opacity: 0, transform: 'scale(1.2) rotate(10deg)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)' }
          ],
          options: { duration: 300, easing: 'ease-out' }
        }
      }
    );
  };

  return <div onClick={handleTransition}>{state}</div>;
};
```

## Performance Optimization

### Reducing Paint Complexity

```typescript
const OptimizedTransition: React.FC = () => {
  const prepareForTransition = useCallback(() => {
    // Reduce paint complexity before transition
    document.body.classList.add('transitioning');

    // Disable animations on non-critical elements
    document.querySelectorAll('.animation-heavy').forEach(el => {
      (el as HTMLElement).style.animation = 'none';
    });

    // Use will-change for optimization hints
    document.documentElement.style.willChange = 'transform, opacity';
  }, []);

  const cleanupAfterTransition = useCallback(() => {
    document.body.classList.remove('transitioning');

    // Re-enable animations
    document.querySelectorAll('.animation-heavy').forEach(el => {
      (el as HTMLElement).style.animation = '';
    });

    // Clear will-change
    document.documentElement.style.willChange = 'auto';
  }, []);

  const optimizedNavigate = useCallback(async (to: string) => {
    prepareForTransition();

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        navigate(to);
      });

      await transition.finished;
    } else {
      navigate(to);
    }

    cleanupAfterTransition();
  }, [prepareForTransition, cleanupAfterTransition]);

  return <NavigationMenu onNavigate={optimizedNavigate} />;
};
```

### Conditional Transitions Based on Device

```typescript
const useAdaptiveTransitions = () => {
  const [transitionsEnabled, setTransitionsEnabled] = useState(true);

  useEffect(() => {
    // Check device capabilities
    const checkCapabilities = () => {
      // Disable on low-end devices
      const memory = (navigator as any).deviceMemory;
      if (memory && memory < 4) {
        setTransitionsEnabled(false);
        return;
      }

      // Disable on slow connections
      const connection = (navigator as any).connection;
      if (connection?.saveData || connection?.effectiveType === '2g') {
        setTransitionsEnabled(false);
        return;
      }

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setTransitionsEnabled(!prefersReducedMotion);
    };

    checkCapabilities();

    // Listen for changes
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', checkCapabilities);

    return () => {
      window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .removeEventListener('change', checkCapabilities);
    };
  }, []);

  const navigate = useCallback(
    (to: string) => {
      if (transitionsEnabled && document.startViewTransition) {
        document.startViewTransition(() => {
          window.location.href = to;
        });
      } else {
        window.location.href = to;
      }
    },
    [transitionsEnabled],
  );

  return { navigate, transitionsEnabled };
};
```

## Fallback Strategies

### Progressive Enhancement

```typescript
class TransitionFallback {
  private supportsViewTransitions = 'startViewTransition' in document;
  private fallbackStrategy: 'css' | 'js' | 'none';

  constructor() {
    this.fallbackStrategy = this.detectFallbackStrategy();
  }

  private detectFallbackStrategy(): 'css' | 'js' | 'none' {
    if (this.supportsViewTransitions) return 'none';

    // Check for CSS animation support
    const animationSupport = 'animation' in document.documentElement.style;
    if (animationSupport) return 'css';

    // Check for requestAnimationFrame
    if ('requestAnimationFrame' in window) return 'js';

    return 'none';
  }

  async transition(updateDOM: () => void, options?: TransitionOptions) {
    switch (this.fallbackStrategy) {
      case 'none':
        // Use native View Transitions
        if (document.startViewTransition) {
          await document.startViewTransition(updateDOM).finished;
        } else {
          updateDOM();
        }
        break;

      case 'css':
        await this.cssFallback(updateDOM, options);
        break;

      case 'js':
        await this.jsFallback(updateDOM, options);
        break;

      default:
        updateDOM();
    }
  }

  private async cssFallback(updateDOM: () => void, options?: TransitionOptions) {
    const container = document.getElementById('root');
    if (!container) {
      updateDOM();
      return;
    }

    // Add transition class
    container.classList.add('transitioning-out');

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Update DOM
    updateDOM();

    // Transition in
    container.classList.remove('transitioning-out');
    container.classList.add('transitioning-in');

    // Cleanup
    await new Promise((resolve) => setTimeout(resolve, 300));
    container.classList.remove('transitioning-in');
  }

  private async jsFallback(updateDOM: () => void, options?: TransitionOptions) {
    const container = document.getElementById('root');
    if (!container) {
      updateDOM();
      return;
    }

    // Fade out
    await this.animate(container, [{ opacity: '1' }, { opacity: '0' }], { duration: 300 });

    // Update DOM
    updateDOM();

    // Fade in
    await this.animate(container, [{ opacity: '0' }, { opacity: '1' }], { duration: 300 });
  }

  private animate(
    element: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Promise<void> {
    return new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      animation.onfinish = () => resolve();
    });
  }
}
```

## Integration with State Management

### Redux Integration

```typescript
const useReduxTransition = () => {
  const dispatch = useDispatch();

  const dispatchWithTransition = useCallback(async (action: AnyAction) => {
    if (!document.startViewTransition) {
      dispatch(action);
      return;
    }

    const transition = document.startViewTransition(() => {
      dispatch(action);
    });

    try {
      await transition.finished;
    } catch (error) {
      console.error('Transition failed:', error);
    }
  }, [dispatch]);

  return { dispatchWithTransition };
};

// Usage in component
const TodoList: React.FC = () => {
  const todos = useSelector(selectTodos);
  const { dispatchWithTransition } = useReduxTransition();

  const handleComplete = (id: string) => {
    dispatchWithTransition(completeTodo(id));
  };

  return (
    <ul>
      {todos.map(todo => (
        <li
          key={todo.id}
          style={{ viewTransitionName: `todo-${todo.id}` } as React.CSSProperties}
        >
          <button onClick={() => handleComplete(todo.id)}>
            {todo.text}
          </button>
        </li>
      ))}
    </ul>
  );
};
```

## Best Practices Checklist

✅ **Design meaningful transitions:**

- Use shared elements for continuity
- Match transition direction to user intent
- Keep durations under 400ms

✅ **Optimize for performance:**

- Reduce paint complexity during transitions
- Use will-change sparingly
- Disable on low-end devices

✅ **Provide fallbacks:**

- Feature detect View Transitions API
- Implement CSS/JS fallbacks
- Respect prefers-reduced-motion

✅ **Test thoroughly:**

- Test on various devices
- Monitor transition performance
- Ensure accessibility

✅ **Use transitions purposefully:**

- Guide user attention
- Maintain spatial context
- Communicate state changes
