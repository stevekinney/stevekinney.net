---
title: Animation Performance in React
description: >-
  Build silky smooth 60fps animations. Master hardware acceleration, avoid
  layout thrashing, and create performant micro-interactions.
date: 2025-09-07T01:15:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - animations
---

Smooth animations separate professional React apps from amateur ones. A janky fade-in, stuttering carousel, or laggy modal transition immediately signals poor performance to users. But creating 60fps animations in React requires understanding the browser's rendering pipeline, choosing the right properties to animate, and avoiding common pitfalls that block the main thread.

The challenge isn't just making things move—it's making them move smoothly while maintaining React's declarative paradigm. Every animation is a series of rapid state changes that can trigger expensive re-renders, layout recalculations, and style updates. Master animation performance, and you'll create interfaces that feel fluid and responsive even on budget devices.

## Understanding the Browser Rendering Pipeline

Before optimizing animations, understand what happens when the browser renders a frame:

```tsx
// Browser rendering pipeline for each frame (16.67ms for 60fps)
interface RenderingPipeline {
  // 1. JavaScript (1-2ms budget)
  javascript: {
    reactRender: 'Component updates and reconciliation';
    eventHandlers: 'User interaction processing';
    animationCallbacks: 'requestAnimationFrame callbacks';
  };

  // 2. Style Calculation (1-2ms budget)
  style: {
    cssRecalculation: 'Which rules apply to which elements';
    inheritance: 'Cascading and computed styles';
    mediaQueries: 'Responsive breakpoint calculations';
  };

  // 3. Layout/Reflow (2-3ms budget)
  layout: {
    elementPositions: 'Where each element goes';
    elementSizes: 'How big each element should be';
    textWrapping: 'How text flows in containers';
  };

  // 4. Paint (2-3ms budget)
  paint: {
    fillPixels: 'Draw pixels for each element';
    textRasterization: 'Convert text to pixels';
    imageDecoding: 'Process image data';
  };

  // 5. Composite (1ms budget)
  composite: {
    layerCombination: 'Combine painted layers';
    transformations: 'Apply 3D transforms';
    opacity: 'Alpha blending';
  };
}

// Animation performance hierarchy (fastest to slowest)
const animationCosts = {
  // ✅ Composite-only changes (GPU accelerated)
  fastest: ['transform', 'opacity'],

  // ⚠️ Paint-only changes (requires repaint)
  moderate: ['color', 'background-color', 'box-shadow', 'border-radius'],

  // ❌ Layout changes (full pipeline)
  slowest: ['width', 'height', 'left', 'top', 'margin', 'padding', 'border'],
};
```

The golden rule: animate properties that only trigger compositing. Transform and opacity changes happen on the GPU and bypass most of the rendering pipeline.

## CSS Transform-Based Animations

### Hardware-Accelerated Transitions

```tsx
// Performant modal animation using transforms
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function PerformantModal({ isOpen, onClose, children }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Force layout before animating
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`modal-overlay ${isVisible ? 'modal-overlay--visible' : ''}`} onClick={onClose}>
      <div
        className={`modal-content ${isVisible ? 'modal-content--visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// CSS using transform for hardware acceleration
const modalStyles = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0);

  /* Hardware acceleration - Force GPU layer */
  transform: translateZ(0);

  transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.modal-overlay--visible {
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: 90vw;
  max-height: 90vh;
  background: white;
  border-radius: 8px;

  /* Use transform instead of changing top/left */
  transform: translate(-50%, -50%) scale(0.9);

  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-content--visible {
  transform: translate(-50%, -50%) scale(1);
}
`;
```

### List Animation with Transforms

```tsx
// Performant list animations avoiding layout thrashing
interface AnimatedListItem {
  id: string;
  content: React.ReactNode;
  isNew?: boolean;
  isRemoving?: boolean;
}

function AnimatedList({ items }: { items: AnimatedListItem[] }) {
  const [displayItems, setDisplayItems] = useState<AnimatedListItem[]>([]);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const previousPositions = new Map<string, DOMRect>();

    // Store current positions
    itemRefs.current.forEach((element, id) => {
      if (element) {
        previousPositions.set(id, element.getBoundingClientRect());
      }
    });

    // Update items
    setDisplayItems(items);

    // Apply FLIP animation technique
    requestAnimationFrame(() => {
      itemRefs.current.forEach((element, id) => {
        if (element && previousPositions.has(id)) {
          const previousRect = previousPositions.get(id)!;
          const currentRect = element.getBoundingClientRect();

          const deltaX = previousRect.left - currentRect.left;
          const deltaY = previousRect.top - currentRect.top;

          if (deltaX !== 0 || deltaY !== 0) {
            // Move element to previous position without transition
            element.style.transition = 'none';
            element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // Animate to current position
            requestAnimationFrame(() => {
              element.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
              element.style.transform = 'translate(0, 0)';
            });
          }
        }
      });
    });
  }, [items]);

  return (
    <div className="animated-list">
      {displayItems.map((item) => (
        <div
          key={item.id}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(item.id, el);
            }
          }}
          className={`list-item ${
            item.isNew ? 'list-item--entering' : ''
          } ${item.isRemoving ? 'list-item--leaving' : ''}`}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

// CSS for enter/leave animations
const listAnimationStyles = `
.list-item {
  /* Hardware acceleration */
  transform: translateZ(0);
}

.list-item--entering {
  animation: itemEnter 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.list-item--leaving {
  animation: itemLeave 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes itemEnter {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes itemLeave {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}
`;
```

## React Spring for Complex Animations

### Physics-Based Animations

```tsx
// High-performance spring animations with react-spring
import { useSpring, animated, useTransition, config } from '@react-spring/web';

interface SpringCardProps {
  isHovered: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function SpringCard({ isHovered, onClick, children }: SpringCardProps) {
  // Spring animation with optimized config
  const springProps = useSpring({
    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0px) scale(1)',
    boxShadow: isHovered ? '0 20px 40px rgba(0, 0, 0, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.1)',

    // Optimized spring config for performance
    config: {
      tension: 300, // Stiffness of spring
      friction: 30, // Damping
      mass: 1, // Mass of object
    },

    // Optimize by skipping intermediate values
    immediate: false,
  });

  return (
    <animated.div style={springProps} onClick={onClick} className="spring-card">
      {children}
    </animated.div>
  );
}

// List transitions with staggered animations
interface ListTransitionProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
}

function StaggeredListTransition<T>({ items, renderItem, getKey }: ListTransitionProps<T>) {
  const transitions = useTransition(items, {
    from: {
      opacity: 0,
      transform: 'translateX(-100px) scale(0.8)',
    },
    enter: (item, index) => async (next) => {
      // Stagger animations by index
      await new Promise((resolve) => setTimeout(resolve, index * 50));
      await next({
        opacity: 1,
        transform: 'translateX(0px) scale(1)',
      });
    },
    leave: {
      opacity: 0,
      transform: 'translateX(100px) scale(0.8)',
    },
    keys: getKey,

    // Performance optimizations
    config: config.gentle,
    trail: 50, // Delay between items
  });

  return (
    <div className="staggered-list">
      {transitions((style, item) => (
        <animated.div style={style} className="staggered-item">
          {renderItem(item)}
        </animated.div>
      ))}
    </div>
  );
}

// Gesture-based interactions
import { useDrag } from '@use-gesture/react';

function DraggableCard({ onDismiss }: { onDismiss: () => void }) {
  const [{ x, rotate, scale, opacity }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
    config: config.wobbly,
  }));

  const bind = useDrag(({ active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    const trigger = vx > 0.2 || (Math.abs(mx) > 100 && !active);

    if (trigger) {
      // Animate off screen
      api.start({
        x: (200 + window.innerWidth) * xDir,
        rotate: xDir * 10,
        scale: 0.8,
        opacity: 0,
        config: config.default,
        onResolve: onDismiss,
      });
    } else {
      // Return to center
      api.start({
        x: active ? mx : 0,
        rotate: active ? (mx / 100) * 5 : 0,
        scale: active ? 1.05 : 1,
        opacity: 1,
        immediate: active,
        config: active ? { tension: 800, friction: 50 } : config.wobbly,
      });
    }
  });

  return (
    <animated.div
      {...bind()}
      style={{
        x,
        rotate,
        scale,
        opacity,
        touchAction: 'none', // Prevent scrolling during drag
      }}
      className="draggable-card"
    >
      Swipe me!
    </animated.div>
  );
}
```

## Frame Rate Monitoring and Optimization

### Performance Monitoring for Animations

```tsx
// Animation performance monitor
class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private frameRates: number[] = [];
  private isMonitoring = false;
  private onSlowFrame?: (fps: number) => void;

  constructor(
    private config: {
      targetFPS?: number;
      warningThreshold?: number;
      sampleSize?: number;
    } = {},
  ) {
    this.config.targetFPS = config.targetFPS || 60;
    this.config.warningThreshold = config.warningThreshold || 45;
    this.config.sampleSize = config.sampleSize || 120; // 2 seconds at 60fps
  }

  startMonitoring(onSlowFrame?: (fps: number) => void): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.onSlowFrame = onSlowFrame;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameRates = [];

    this.measureFrame();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private measureFrame = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const frameDuration = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Calculate instantaneous FPS
    const fps = 1000 / frameDuration;
    this.frameRates.push(fps);

    // Keep only recent samples
    if (this.frameRates.length > this.config.sampleSize!) {
      this.frameRates.shift();
    }

    // Check for slow frames
    if (fps < this.config.warningThreshold! && this.onSlowFrame) {
      this.onSlowFrame(fps);
    }

    this.frameCount++;
    requestAnimationFrame(this.measureFrame);
  };

  getAverageFPS(): number {
    if (this.frameRates.length === 0) return 0;
    return this.frameRates.reduce((sum, fps) => sum + fps, 0) / this.frameRates.length;
  }

  getPercentile(percentile: number): number {
    if (this.frameRates.length === 0) return 0;

    const sorted = [...this.frameRates].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }

  getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const avgFPS = this.getAverageFPS();
    const p1FPS = this.getPercentile(1); // Worst 1% of frames

    if (avgFPS >= 55 && p1FPS >= 30) return 'A';
    if (avgFPS >= 45 && p1FPS >= 25) return 'B';
    if (avgFPS >= 35 && p1FPS >= 20) return 'C';
    if (avgFPS >= 25 && p1FPS >= 15) return 'D';
    return 'F';
  }
}

// React hook for animation performance monitoring
function useAnimationPerformance() {
  const monitor = useRef(new AnimationPerformanceMonitor());
  const [metrics, setMetrics] = useState({
    averageFPS: 0,
    grade: 'A' as const,
    slowFrameCount: 0,
  });

  const startMonitoring = useCallback(() => {
    let slowFrameCount = 0;

    monitor.current.startMonitoring((fps) => {
      slowFrameCount++;
      console.warn(`⚠️ Slow animation frame: ${fps.toFixed(1)} FPS`);
    });

    // Update metrics every second
    const interval = setInterval(() => {
      setMetrics({
        averageFPS: monitor.current.getAverageFPS(),
        grade: monitor.current.getPerformanceGrade(),
        slowFrameCount,
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      monitor.current.stopMonitoring();
    };
  }, []);

  return {
    startMonitoring,
    metrics,
    monitor: monitor.current,
  };
}

// Performance-aware animation component
function MonitoredAnimation({ children }: { children: React.ReactNode }) {
  const { startMonitoring, metrics } = useAnimationPerformance();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [startMonitoring]);

  useEffect(() => {
    // Show warning for poor performance
    if (metrics.grade === 'D' || metrics.grade === 'F') {
      setShowWarning(true);
      const timer = setTimeout(() => setShowWarning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [metrics.grade]);

  return (
    <div className="monitored-animation">
      {children}

      {process.env.NODE_ENV === 'development' && (
        <div className="animation-metrics">
          <div>FPS: {metrics.averageFPS.toFixed(1)}</div>
          <div>Grade: {metrics.grade}</div>
        </div>
      )}

      {showWarning && (
        <div className="performance-warning">
          ⚠️ Animation performance is poor (Grade: {metrics.grade})
        </div>
      )}
    </div>
  );
}
```

### Frame Budget Management

```tsx
// Frame budget manager for complex animations
class FrameBudgetManager {
  private taskQueue: Array<() => Promise<void> | void> = [];
  private isProcessing = false;
  private frameStart = 0;
  private readonly frameDeadline = 16; // 16ms for 60fps
  private readonly safetyMargin = 2; // 2ms safety margin

  scheduleTask(
    task: () => Promise<void> | void,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ): void {
    if (priority === 'high') {
      this.taskQueue.unshift(task);
    } else {
      this.taskQueue.push(task);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue = async (): Promise<void> => {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;
    this.frameStart = performance.now();

    while (this.taskQueue.length > 0 && this.hasTimeRemaining()) {
      const task = this.taskQueue.shift()!;

      try {
        await task();
      } catch (error) {
        console.error('Frame budget task error:', error);
      }
    }

    this.isProcessing = false;

    // Continue processing in next frame if tasks remain
    if (this.taskQueue.length > 0) {
      requestAnimationFrame(this.processQueue);
    }
  };

  private hasTimeRemaining(): boolean {
    const elapsed = performance.now() - this.frameStart;
    return elapsed < this.frameDeadline - this.safetyMargin;
  }

  getRemainingTime(): number {
    const elapsed = performance.now() - this.frameStart;
    return Math.max(0, this.frameDeadline - this.safetyMargin - elapsed);
  }
}

// React hook for frame budget management
function useFrameBudget() {
  const budgetManager = useRef(new FrameBudgetManager());

  const scheduleAnimation = useCallback(
    (animationFn: () => Promise<void> | void, priority: 'high' | 'normal' | 'low' = 'normal') => {
      budgetManager.current.scheduleTask(animationFn, priority);
    },
    [],
  );

  return { scheduleAnimation };
}

// Example usage in complex animation
function ComplexAnimationComponent() {
  const { scheduleAnimation } = useFrameBudget();
  const [items, setItems] = useState<Item[]>([]);

  const animateItems = useCallback(async () => {
    // High priority: Update visible items first
    scheduleAnimation(() => {
      setItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          isVisible: true,
        })),
      );
    }, 'high');

    // Normal priority: Apply transforms
    scheduleAnimation(async () => {
      const elements = document.querySelectorAll('.animated-item');
      for (const element of elements) {
        (element as HTMLElement).style.transform = 'scale(1.05)';
        // Yield control if we're running out of time
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });

    // Low priority: Update analytics
    scheduleAnimation(() => {
      // Track animation completion
      analytics.track('animation_completed', {
        itemCount: items.length,
      });
    }, 'low');
  }, [items, scheduleAnimation]);

  return (
    <div>
      <button onClick={animateItems}>Animate Items</button>
      {items.map((item) => (
        <div key={item.id} className="animated-item">
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

## Common Animation Anti-Patterns

### Avoiding Layout Thrashing

```tsx
// ❌ Bad: Animating layout properties
function BadSlider({ items }: { items: Item[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // This causes layout recalculation on every frame
  const slideStyle = {
    left: `-${currentIndex * 100}%`, // ❌ Animates 'left' property
    transition: 'left 0.3s ease',
  };

  return (
    <div className="slider-container">
      <div className="slider-track" style={slideStyle}>
        {items.map((item, index) => (
          <div key={index} className="slide">
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ Good: Using transforms for hardware acceleration
function GoodSlider({ items }: { items: Item[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Transform only triggers compositing
  const slideStyle = {
    transform: `translateX(-${currentIndex * 100}%)`, // ✅ Uses transform
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform', // Hint to browser for optimization
  };

  return (
    <div className="slider-container">
      <div className="slider-track" style={slideStyle}>
        {items.map((item, index) => (
          <div key={index} className="slide">
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// ❌ Bad: Animating dimensions
function BadAccordion({ isExpanded }: { isExpanded: boolean }) {
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // ❌ Reading scrollHeight causes layout
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(isExpanded ? scrollHeight : 0);
    }
  }, [isExpanded]);

  return (
    <div
      className="accordion-content"
      style={{
        height, // ❌ Animating height causes layout thrashing
        transition: 'height 0.3s ease',
        overflow: 'hidden',
      }}
      ref={contentRef}
    >
      <div>Content that might be very long...</div>
    </div>
  );
}

// ✅ Good: Using transforms with fixed heights
function GoodAccordion({ isExpanded }: { isExpanded: boolean }) {
  const [maxHeight, setMaxHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && maxHeight === 0) {
      // Measure once during mount
      const rect = contentRef.current.getBoundingClientRect();
      setMaxHeight(rect.height);
    }
  }, [maxHeight]);

  return (
    <div
      className="accordion-container"
      style={{
        height: maxHeight,
        overflow: 'hidden',
      }}
    >
      <div
        ref={contentRef}
        className="accordion-content"
        style={{
          transform: isExpanded ? 'translateY(0)' : `translateY(-${maxHeight}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        <div>Content that might be very long...</div>
      </div>
    </div>
  );
}
```

### Preventing Animation Blocking

```tsx
// ❌ Bad: Synchronous state updates during animation
function BadAnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const animate = () => {
      setCount((prevCount) => {
        const newCount = prevCount + 1;

        // ❌ Synchronous DOM update blocks animation
        document.title = `Count: ${newCount}`;

        if (newCount < target) {
          // ❌ requestAnimationFrame with state update on every frame
          requestAnimationFrame(animate);
        }

        return newCount;
      });
    };

    animate();
  }, [target]);

  return <div className="counter">{count}</div>;
}

// ✅ Good: Optimized animation with minimal state updates
function GoodAnimatedCounter({ target }: { target: number }) {
  const [displayCount, setDisplayCount] = useState(0);
  const countRef = useRef(0);
  const startTime = useRef(0);
  const duration = 2000; // 2 seconds

  useEffect(() => {
    startTime.current = performance.now();
    countRef.current = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.round(easedProgress * target);

      // Only update state when count actually changes
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setDisplayCount(currentCount);

        // ✅ Defer non-critical updates
        if (currentCount % 10 === 0) {
          setTimeout(() => {
            document.title = `Count: ${currentCount}`;
          }, 0);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  return <div className="counter">{displayCount}</div>;
}

// ✅ Better: CSS-based counter animation
function CSSAnimatedCounter({ target }: { target: number }) {
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (counterRef.current) {
      // Use CSS custom properties for animation
      counterRef.current.style.setProperty('--target', target.toString());
      counterRef.current.style.setProperty('--start', '0');
    }
  }, [target]);

  return (
    <div
      ref={counterRef}
      className="css-counter"
      style={{
        // CSS counter animation (hardware accelerated)
        counterReset: 'counter calc(var(--start) * 1)',
        animation: 'countUp 2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      &lt;style>{`
        @keyframes countUp {
          to {
            counter-reset: counter calc(var(--target) * 1);
          }
        }

        .css-counter::after {
          content: counter(counter);
        }
      `}&lt;/style>
    </div>
  );
}
```

## Advanced Techniques

For more sophisticated animation patterns, including Intersection Observer optimization, Web Animations API integration, and comprehensive performance testing strategies, see [Advanced Animation Performance Techniques](./animation-performance-advanced.md).

Key advanced topics covered:

- **Intersection Observer**: Trigger animations only when elements are visible for better performance
- **Web Animations API**: Lower-level control for complex animation sequences
- **Performance Testing**: Automated testing frameworks for animation performance validation
- **Advanced Optimization**: GPU layer management and composite optimization

## Related Topics

- **Advanced Animation Techniques**: Take your animations to the next level with [Advanced Animation Performance Techniques](./animation-performance-advanced.md)
- **View Transitions**: For page transitions and DOM state changes, see [View Transitions API](./view-transitions-api.md)
- **GPU Optimization**: For detailed GPU acceleration techniques including `will-change` management and compositing layers, see [GPU Acceleration Patterns](./gpu-acceleration-patterns.md)
- **Performance Monitoring**: Learn to measure animation performance in production with [Performance Testing Strategy](./performance-testing-strategy.md)
- **Real-Time Animations**: For animations with live data updates, see [Real-Time Data Performance](./real-time-data-performance.md)

## Next Steps

Animation performance is crucial for user experience:

1. **Use transform and opacity** - These properties are hardware accelerated
2. **Avoid animating layout properties** - width, height, left, top cause expensive reflows
3. **Monitor frame rates** - Especially during complex interactions
4. **Test on low-end devices** - Your MacBook Pro isn't representative

Remember: smooth animations create the perception of a fast, responsive app even when other operations are slow. Users judge performance more by how animations feel than by raw loading times.

The key is balancing visual richness with performance—every animation should serve a purpose and run at 60fps on your target devices.
