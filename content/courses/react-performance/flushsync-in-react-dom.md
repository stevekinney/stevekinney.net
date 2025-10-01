---
title: Flushsync In React Dom
description: >-
  React's concurrent rendering is one of its most powerful features—it batches
  updates, prioritizes work, and keeps your app responsive by breaking rendering
  into chunks. But sometimes you need to tell React, "No, really, I need this
  updat...
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-06T17:49:18-06:00'
---

React's concurrent rendering is one of its most powerful features—it batches updates, prioritizes work, and keeps your app responsive by breaking rendering into chunks. But sometimes you need to tell React, "No, really, I need this update to happen right now." That's where `flushSync` comes in—a sharp tool that forces React to synchronously flush updates immediately.

Think of `flushSync` as the emergency brake of React's rendering system. It's incredibly useful when you need to coordinate with imperative APIs (like focusing elements, measuring DOM nodes, or triggering animations), but it comes with performance tradeoffs that make it something you should reach for sparingly and with intention.

## What is `flushSync`?

`flushSync` is a function from `react-dom` that forces React to flush any pending updates synchronously before continuing. When you wrap a state update in `flushSync`, React immediately applies that update to the DOM—no batching, no concurrent scheduling, no waiting around.

```tsx
import { flushSync } from 'react-dom';

function MyComponent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // This update happens immediately
    flushSync(() => {
      setCount(count + 1);
    });

    // By this point, the DOM has been updated
    console.log('DOM is now updated');
  };

  return <div onClick={handleClick}>{count}</div>;
}
```

The key difference is timing: normally, React batches updates and flushes them during the next render cycle. With `flushSync`, you're forcing that flush to happen immediately within the current synchronous execution.

## When You Actually Need `flushSync`

Most of the time, you don't need `flushSync`. React's default behavior of batching updates is usually what you want. But there are specific scenarios where synchronous updates become necessary:

### Coordinating with Focus Management

One of the most common legitimate uses is managing focus after DOM changes:

```tsx
function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      // We need the DOM to update before focusing
      flushSync(() => {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      });

      // Now we can safely focus the newly selected item
      const selectedItem = listRef.current?.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement;
      selectedItem?.focus();
    }
  };

  const filteredItems = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search items..."
      />
      <ul ref={listRef}>
        {filteredItems.map((item, index) => (
          <li
            key={item}
            data-index={index}
            tabIndex={-1}
            style={{
              backgroundColor: index === selectedIndex ? '#e0e0e0' : 'white',
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Without `flushSync`, the focus call might happen before React has updated the DOM, leading to focusing the wrong element or no element at all.

### Measuring DOM Elements After Updates

Sometimes you need to measure elements immediately after a state change:

```tsx
function CollapsiblePanel({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState<number | undefined>();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!isExpanded) {
      // Expand first, then measure
      flushSync(() => {
        setIsExpanded(true);
      });

      // Now we can measure the actual height
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    } else {
      setIsExpanded(false);
      setHeight(undefined);
    }
  };

  return (
    <div>
      <button onClick={handleToggle}>{isExpanded ? 'Collapse' : 'Expand'}</button>
      <div
        ref={contentRef}
        style={{
          height: isExpanded ? height : 0,
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

Here, we need the content to be rendered (expanded) before we can measure its natural height for the animation.

### Third-Party Library Integration

When integrating with libraries that expect immediate DOM updates:

```tsx
function ChartComponent({ data }: { data: ChartData[] }) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const handleChartTypeChange = (newType: 'bar' | 'line') => {
    // Update the state and flush immediately
    flushSync(() => {
      setChartType(newType);
    });

    // Now the DOM is updated, we can safely recreate the chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(chartRef.current!, {
      type: newType,
      data: data,
      // ... chart options
    });
  };

  return (
    <div>
      <select
        value={chartType}
        onChange={(e) => handleChartTypeChange(e.target.value as 'bar' | 'line')}
      >
        <option value="bar">Bar Chart</option>
        <option value="line">Line Chart</option>
      </select>
      <div ref={chartRef} />
    </div>
  );
}
```

The chart library needs the DOM to reflect the current state before it can properly initialize.

## The Performance Cost

`flushSync` comes with real performance implications that you should understand:

### Breaking React's Batching

React normally batches multiple state updates into a single render cycle. `flushSync` breaks this optimization:

```tsx
// ❌ Bad: Multiple flushSync calls
function BadExample() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);

  const handleSubmit = () => {
    flushSync(() => setName('John')); // Render 1
    flushSync(() => setEmail('john@')); // Render 2
    flushSync(() => setAge(30)); // Render 3
  };
}

// ✅ Better: Batch updates when possible
function GoodExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 0,
  });

  const handleSubmit = () => {
    // Single update, single render
    setFormData({
      name: 'John',
      email: 'john@example.com',
      age: 30,
    });
  };
}
```

### Blocking the Main Thread

`flushSync` forces synchronous work on the main thread, potentially causing jank:

```tsx
// ❌ Problematic: Large synchronous update
function ProblematicList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('');

  const handleUrgentFilter = (newFilter: string) => {
    // This could block the thread if items is large
    flushSync(() => {
      setFilter(newFilter);
    });

    // Some imperative work that needs the filtered DOM
    performDOMWork();
  };

  const filteredItems = items.filter((item) => item.name.includes(filter));

  return (
    <ul>
      {filteredItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

// ✅ Better: Consider if you really need synchronous updates
function BetterList({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('');

  const handleFilter = (newFilter: string) => {
    // Let React batch and prioritize normally
    setFilter(newFilter);

    // Use useLayoutEffect for DOM work after render
    // or consider if the work can be async
  };

  // ... rest of component
}
```

## Best Practices and Guidelines

### Use Sparingly and With Purpose

Only reach for `flushSync` when you have a specific coordination requirement:

```tsx
// ✅ Good: Clear coordination need
function Modal({ isOpen, onClose }: ModalProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    flushSync(() => {
      setIsOpen(true);
    });

    // Focus management requires immediate DOM update
    firstButtonRef.current?.focus();
  };
}

// ❌ Bad: No real coordination need
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    // Unnecessary - no imperative work after
    flushSync(() => {
      setCount((c) => c + 1);
    });
  };
}
```

### Prefer Alternatives When Possible

Often, React's built-in mechanisms can handle your needs without `flushSync`:

```tsx
// Instead of flushSync for DOM measurements, use useLayoutEffect
function MeasuredComponent({ content }: { content: string }) {
  const [height, setHeight] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Runs synchronously after DOM mutations
    if (ref.current) {
      setHeight(ref.current.offsetHeight);
    }
  }, [content]);

  return <div ref={ref}>{content}</div>;
}
```

### Bundle Multiple Updates

If you must use `flushSync`, bundle related updates together:

```tsx
// ✅ Good: Bundle related updates
const handleComplexUpdate = () => {
  flushSync(() => {
    setSelectedId(newId);
    setHighlighted(true);
    setScrollPosition(newPosition);
  });

  // Now perform imperative work
  performFocusWork();
};

// ❌ Bad: Multiple separate flushSync calls
const handleBadUpdate = () => {
  flushSync(() => setSelectedId(newId));
  flushSync(() => setHighlighted(true));
  flushSync(() => setScrollPosition(newPosition));
};
```

## React 18+ Considerations

With React 18's concurrent features, `flushSync` has some additional considerations:

### Interrupting Transitions

`flushSync` will interrupt any ongoing transitions:

```tsx
function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);

    // This transition might be interrupted by flushSync elsewhere
    startTransition(() => {
      setResults(performSearch(newQuery));
    });
  };

  const handleUrgentUpdate = () => {
    // This will interrupt the above transition
    flushSync(() => {
      setSomeUrgentState(newValue);
    });
  };
}
```

### Working with `Suspense`

`flushSync` doesn't play nicely with Suspense boundaries:

```tsx
// ❌ Problematic: flushSync with Suspense
function ProblematicComponent() {
  const [showSuspenseful, setShowSuspenseful] = useState(false);

  const handleShow = () => {
    // This might cause issues with Suspense
    flushSync(() => {
      setShowSuspenseful(true);
    });
  };

  return <Suspense fallback={<Loading />}>{showSuspenseful && <LazyComponent />}</Suspense>;
}
```

## Debugging `flushSync` Issues

When things go wrong with `flushSync`, here are common debugging approaches:

### React DevTools Profiler

The React DevTools Profiler can show you the performance impact:

```tsx
// Add labels to make profiling clearer
function ProfiledComponent() {
  const handleUpdate = () => {
    React.unstable_trace('urgent-update', performance.now(), () => {
      flushSync(() => {
        setUrgentState(newValue);
      });
    });
  };
}
```

### Console Timing

Measure the synchronous work:

```tsx
function TimedComponent() {
  const handleUpdate = () => {
    console.time('flushSync-update');
    flushSync(() => {
      setLargeState(newLargeValue);
    });
    console.timeEnd('flushSync-update');

    // Additional imperative work
    performDOMWork();
  };
}
```

## When NOT to Use `flushSync`

Here are some common anti-patterns to avoid:

### Form Validation

```tsx
// ❌ Don't use flushSync for form validation
function BadForm() {
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (data: FormData) => {
    const newErrors = validateForm(data);

    // Unnecessary - validation errors don't need immediate DOM updates
    flushSync(() => {
      setErrors(newErrors);
    });
  };
}
```

### Animation Triggers

```tsx
// ❌ Don't use flushSync for CSS animations
function BadAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = () => {
    // CSS animations don't need flushSync
    flushSync(() => {
      setIsAnimating(true);
    });
  };
}

// ✅ Better: Let React handle normally
function GoodAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = () => {
    setIsAnimating(true); // CSS will handle the animation
  };
}
```

### Data Fetching

```tsx
// ❌ Don't use flushSync for loading states
function BadDataFetching() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    // Loading states don't need immediate DOM updates
    flushSync(() => {
      setIsLoading(true);
    });

    const data = await api.getData();
    setData(data);
    setIsLoading(false);
  };
}
```

## Real-World Example: Modal Focus Management

Here's a complete example showing proper `flushSync` usage for modal focus management:

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // We need flushSync here because we need the modal
      // to be in the DOM before we can focus it
      flushSync(() => {
        // Modal is now rendered
      });

      // Focus the close button
      closeButtonRef.current?.focus();
    } else {
      // Restore previous focus
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }

    // Trap focus within modal
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Usage
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    // The flushSync happens inside the Modal component
    // when the DOM needs to be updated for focus management
    setIsModalOpen(true);
  };

  return (
    <div>
      <button onClick={openModal}>Open Modal</button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Example Modal">
        <p>This modal properly manages focus using flushSync where needed.</p>
        <button onClick={() => setIsModalOpen(false)}>Close from inside</button>
      </Modal>
    </div>
  );
}
```

