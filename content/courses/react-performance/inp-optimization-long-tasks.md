---
title: INP Optimization & Long Tasks
description: >-
  Master Interaction to Next Paint (INP) by breaking up long tasks, using
  scheduler APIs, and optimizing React interactivity
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
status: published
tags:
  - React
  - Performance
  - INP
  - Core Web Vitals
  - Interactivity
---

Your React app _looks_ fast. The page loads quickly, the content appears instantly. Then a user clicks a button and… nothing. For 200 milliseconds, the UI is frozen. The click eventually processes, but that delay—that moment of uncertainty—just cost you a user's trust. Welcome to the world of **INP** (Interaction to Next Paint), where every millisecond of delay is a broken promise.

INP measures how quickly your app responds to user interactions throughout its entire lifecycle. Not just the first click, but every click, tap, and keypress. And here's the harsh reality: most React apps fail INP not because they're slow, but because they're doing too much work on the main thread at the wrong time.

Let's fix that. Let's break apart those long tasks, leverage modern scheduling APIs, and build React apps that respond instantly to every interaction.

## Understanding INP and Long Tasks

INP measures the latency of all interactions during a page visit:

```typescript
interface INPBreakdown {
  inputDelay: number; // Time until event handler starts
  processingTime: number; // Time to run event handlers
  presentationDelay: number; // Time to paint next frame
  totalINP: number; // Sum of all three
}

// Good INP: < 200ms
// Needs improvement: 200-500ms
// Poor INP: > 500ms

// Long task = any script execution > 50ms
interface LongTask {
  duration: number;
  startTime: number;
  attribution: TaskAttribution[];
}
```

## Breaking Up Long Tasks

### The Problem: Monolithic Event Handlers

```typescript
// ❌ Long task - blocks the main thread
const BadSearchComponent: React.FC = () => {
  const [results, setResults] = useState<Item[]>([]);

  const handleSearch = (query: string) => {
    // This blocks the main thread for 200ms+
    const filtered = hugeDataset.filter(item => {
      // Complex filtering logic
      return item.title.toLowerCase().includes(query) &&
             item.description.toLowerCase().includes(query) &&
             calculateRelevance(item, query) > 0.5;
    });

    const sorted = filtered.sort((a, b) => {
      return calculateScore(b, query) - calculateScore(a, query);
    });

    const highlighted = sorted.map(item => ({
      ...item,
      highlightedTitle: highlightText(item.title, query),
      highlightedDesc: highlightText(item.description, query)
    }));

    setResults(highlighted);
  };

  return <SearchInput onChange={handleSearch} />;
};
```

### Solution 1: Yielding to the Main Thread

```typescript
// ✅ Yield control back to the browser
const GoodSearchComponent: React.FC = () => {
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setIsSearching(true);

    // Break work into chunks
    const chunkSize = 100;
    const filtered: Item[] = [];

    for (let i = 0; i < hugeDataset.length; i += chunkSize) {
      const chunk = hugeDataset.slice(i, i + chunkSize);

      // Process chunk
      const chunkFiltered = chunk.filter(item => {
        return item.title.toLowerCase().includes(query) &&
               item.description.toLowerCase().includes(query);
      });

      filtered.push(...chunkFiltered);

      // Yield to main thread
      await yieldToMain();
    }

    // Sort in chunks
    const sorted = await chunkSort(filtered, (a, b) => {
      return calculateScore(b, query) - calculateScore(a, query);
    });

    setResults(sorted);
    setIsSearching(false);
  };

  return (
    <>
      <SearchInput onChange={handleSearch} />
      {isSearching && <SearchingIndicator />}
    </>
  );
};

// Utility to yield control
const yieldToMain = (): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};

// Sort in chunks
async function chunkSort<T>(
  array: T[],
  compareFn: (a: T, b: T) => number
): Promise<T[]> {
  // Use merge sort with yielding
  if (array.length <= 1) return array;

  const middle = Math.floor(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);

  await yieldToMain();

  const sortedLeft = await chunkSort(left, compareFn);
  const sortedRight = await chunkSort(right, compareFn);

  return merge(sortedLeft, sortedRight, compareFn);
}
```

### Solution 2: Using `requestIdleCallback`

```typescript
const useIdleProcessor = <T, R>(
  processor: (items: T[]) => R[],
  options?: IdleRequestOptions
) => {
  const [result, setResult] = useState<R[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const taskQueueRef = useRef<T[]>([]);

  const process = useCallback((items: T[]) => {
    taskQueueRef.current = [...items];
    setIsProcessing(true);

    const processQueue = (deadline: IdleDeadline) => {
      const results: R[] = [];

      // Process while we have time
      while (
        taskQueueRef.current.length > 0 &&
        (deadline.timeRemaining() > 0 || deadline.didTimeout)
      ) {
        const batch = taskQueueRef.current.splice(0, 10);
        results.push(...processor(batch));
      }

      setResult(prev => [...prev, ...results]);

      // Continue if more work
      if (taskQueueRef.current.length > 0) {
        requestIdleCallback(processQueue, options);
      } else {
        setIsProcessing(false);
      }
    };

    requestIdleCallback(processQueue, options);
  }, [processor, options]);

  return { process, result, isProcessing };
};

// Usage
const DataProcessor: React.FC = () => {
  const { process, result, isProcessing } = useIdleProcessor(
    (items: Data[]) => items.map(transform),
    { timeout: 2000 }
  );

  return (
    <div>
      <button onClick={() => process(largeDataset)}>
        Process Data
      </button>
      {isProcessing && <ProcessingIndicator />}
      <Results data={result} />
    </div>
  );
};
```

## Using the Scheduler API

### PostTask API for Priority Scheduling

```typescript
// Modern scheduler.postTask API
class TaskScheduler {
  private tasks = new Map<string, AbortController>();

  async scheduleTask<T>(
    id: string,
    task: () => T | Promise<T>,
    priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible'
  ): Promise<T> {
    // Cancel previous task with same ID
    this.cancelTask(id);

    const controller = new AbortController();
    this.tasks.set(id, controller);

    if ('scheduler' in window && 'postTask' in scheduler) {
      try {
        return await scheduler.postTask(task, {
          priority,
          signal: controller.signal
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`Task ${id} was cancelled`);
        }
        throw error;
      }
    } else {
      // Fallback for browsers without postTask
      return this.fallbackSchedule(task, priority);
    }
  }

  private async fallbackSchedule<T>(
    task: () => T | Promise<T>,
    priority: string
  ): Promise<T> {
    const delay = priority === 'user-blocking' ? 0 :
                  priority === 'user-visible' ? 50 : 100;

    await new Promise(resolve => setTimeout(resolve, delay));
    return task();
  }

  cancelTask(id: string) {
    const controller = this.tasks.get(id);
    if (controller) {
      controller.abort();
      this.tasks.delete(id);
    }
  }

  cancelAll() {
    this.tasks.forEach(controller => controller.abort());
    this.tasks.clear();
  }
}

// React hook for task scheduling
const useTaskScheduler = () => {
  const schedulerRef = useRef(new TaskScheduler());

  useEffect(() => {
    return () => {
      schedulerRef.current.cancelAll();
    };
  }, []);

  return schedulerRef.current;
};

// Usage in component
const InteractiveComponent: React.FC = () => {
  const scheduler = useTaskScheduler();
  const [data, setData] = useState<ProcessedData | null>(null);

  const handleClick = async () => {
    // High priority - user initiated
    const result = await scheduler.scheduleTask(
      'process-click',
      () => processUserInput(),
      'user-blocking'
    );

    setData(result);

    // Low priority - analytics
    scheduler.scheduleTask(
      'analytics',
      () => sendAnalytics(result),
      'background'
    );
  };

  return <button onClick={handleClick}>Process</button>;
};
```

## Optimizing React Rendering for INP

### Concurrent Features for Better INP

```typescript
// ✅ Use transitions for non-urgent updates
const SearchWithTransition: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    // Urgent - update input immediately
    setQuery(value);

    // Non-urgent - search can be interrupted
    startTransition(() => {
      const filtered = performExpensiveSearch(value);
      setResults(filtered);
    });
  };

  return (
    <>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className={isPending ? 'searching' : ''}
      />
      <SearchResults results={results} />
    </>
  );
};

// ✅ Use deferred values for expensive renders
const ExpensiveList: React.FC<{ items: Item[] }> = ({ items }) => {
  const deferredItems = useDeferredValue(items);
  const isStale = items !== deferredItems;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      {deferredItems.map(item => (
        <ExpensiveItem key={item.id} data={item} />
      ))}
    </div>
  );
};
```

### Event Delegation for Better Performance

```typescript
// ❌ Many event listeners
const BadList: React.FC<{ items: Item[] }> = ({ items }) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => handleClick(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
};

// ✅ Single delegated listener
const GoodList: React.FC<{ items: Item[] }> = ({ items }) => {
  const handleListClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const li = target.closest('li');

    if (li) {
      const id = li.dataset.itemId;
      const item = items.find(i => i.id === id);
      if (item) handleClick(item);
    }
  };

  return (
    <ul onClick={handleListClick}>
      {items.map(item => (
        <li key={item.id} data-item-id={item.id}>
          {item.name}
        </li>
      ))}
    </ul>
  );
};
```

## Avoiding Layout Thrashing

### Batch DOM Reads and Writes

```typescript
// ❌ Layout thrashing - forces multiple reflows
const BadMeasurement: React.FC = () => {
  const measureElements = () => {
    const elements = document.querySelectorAll('.item');

    elements.forEach(el => {
      const height = el.clientHeight; // Read
      el.style.height = `${height * 2}px`; // Write - forces reflow
      const width = el.clientWidth; // Read - forces reflow again
      el.style.width = `${width * 2}px`; // Write
    });
  };

  return <button onClick={measureElements}>Measure</button>;
};

// ✅ Batched reads and writes
const GoodMeasurement: React.FC = () => {
  const measureElements = () => {
    const elements = document.querySelectorAll('.item');
    const measurements: Array<{ el: Element; height: number; width: number }> = [];

    // Batch all reads
    elements.forEach(el => {
      measurements.push({
        el,
        height: el.clientHeight,
        width: el.clientWidth
      });
    });

    // Batch all writes
    measurements.forEach(({ el, height, width }) => {
      (el as HTMLElement).style.height = `${height * 2}px`;
      (el as HTMLElement).style.width = `${width * 2}px`;
    });
  };

  return <button onClick={measureElements}>Measure</button>;
};

// Using requestAnimationFrame for DOM updates
const AnimatedComponent: React.FC = () => {
  const updatePositions = (elements: HTMLElement[]) => {
    // Read phase
    const positions = elements.map(el => ({
      el,
      current: el.getBoundingClientRect()
    }));

    // Write phase in next frame
    requestAnimationFrame(() => {
      positions.forEach(({ el, current }) => {
        el.style.transform = `translateY(${current.top + 100}px)`;
      });
    });
  };

  return <div>Animated content</div>;
};
```

## Input Responsiveness Optimization

### Debouncing vs Throttling for Inputs

```typescript
// Custom hook for optimized input handling
const useOptimizedInput = (
  callback: (value: string) => void,
  delay: number = 300
) => {
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Update input immediately (good INP)
    setValue(newValue);
    setIsPending(true);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the expensive operation
    timeoutRef.current = setTimeout(() => {
      // Use scheduler for non-blocking execution
      if ('scheduler' in window && 'postTask' in scheduler) {
        scheduler.postTask(() => {
          callbackRef.current(newValue);
          setIsPending(false);
        }, { priority: 'user-visible' });
      } else {
        callbackRef.current(newValue);
        setIsPending(false);
      }
    }, delay);
  }, [delay]);

  return { value, handleChange, isPending };
};

// Usage
const SearchInput: React.FC = () => {
  const { value, handleChange, isPending } = useOptimizedInput(
    (query) => performSearch(query),
    300
  );

  return (
    <div>
      <input
        value={value}
        onChange={handleChange}
        placeholder="Search..."
      />
      {isPending && <span>Searching...</span>}
    </div>
  );
};
```

### Optimizing Form Validation

```typescript
class ValidationScheduler {
  private validationQueue = new Map<string, () => Promise<ValidationResult>>();
  private results = new Map<string, ValidationResult>();

  async scheduleValidation(fieldName: string, validator: () => Promise<ValidationResult>) {
    this.validationQueue.set(fieldName, validator);

    // Use idle time for validation
    return new Promise<ValidationResult>((resolve) => {
      requestIdleCallback(async (deadline) => {
        if (deadline.timeRemaining() > 10) {
          const result = await validator();
          this.results.set(fieldName, result);
          this.validationQueue.delete(fieldName);
          resolve(result);
        } else {
          // Reschedule if not enough time
          this.scheduleValidation(fieldName, validator).then(resolve);
        }
      });
    });
  }

  getResult(fieldName: string): ValidationResult | undefined {
    return this.results.get(fieldName);
  }
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

const useFormValidation = () => {
  const schedulerRef = useRef(new ValidationScheduler());
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const validateField = useCallback(
    async (name: string, value: string, rules: ValidationRule[]) => {
      const result = await schedulerRef.current.scheduleValidation(name, async () => {
        // Run validation rules
        const errors: string[] = [];
        for (const rule of rules) {
          if (!rule.test(value)) {
            errors.push(rule.message);
          }
        }
        return { valid: errors.length === 0, errors };
      });

      setErrors((prev) => ({
        ...prev,
        [name]: result.errors || [],
      }));
    },
    [],
  );

  return { validateField, errors };
};

interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}
```

## Monitoring INP in Production

```typescript
class INPMonitor {
  private observer: PerformanceObserver | null = null;
  private interactions: InteractionEntry[] = [];
  private inp = 0;

  startMonitoring() {
    if (!('PerformanceObserver' in window)) return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'event' || entry.entryType === 'first-input') {
          this.processInteraction(entry as InteractionEntry);
        }
      }
    });

    this.observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 0,
    });
  }

  private processInteraction(entry: InteractionEntry) {
    // Only consider interactions with duration
    if (entry.duration === 0) return;

    this.interactions.push(entry);

    // Calculate INP (98th percentile of interactions)
    this.calculateINP();

    // Report slow interactions
    if (entry.duration > 200) {
      this.reportSlowInteraction(entry);
    }
  }

  private calculateINP() {
    if (this.interactions.length === 0) return;

    const sorted = [...this.interactions].sort((a, b) => b.duration - a.duration);
    const index = Math.floor(sorted.length * 0.98);
    this.inp = sorted[index].duration;
  }

  private reportSlowInteraction(entry: InteractionEntry) {
    const report = {
      type: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      target: entry.target,
      inp: this.inp,
      url: window.location.href,
      timestamp: Date.now(),
    };

    // Send to analytics
    navigator.sendBeacon('/api/metrics/inp', JSON.stringify(report));
  }

  getINP(): number {
    return this.inp;
  }

  getInteractions(): InteractionEntry[] {
    return this.interactions;
  }
}

interface InteractionEntry extends PerformanceEntry {
  duration: number;
  interactionId?: number;
  target?: Node;
}

// React hook for INP monitoring
const useINPMonitoring = () => {
  const monitorRef = useRef<INPMonitor | null>(null);
  const [inp, setINP] = useState(0);

  useEffect(() => {
    monitorRef.current = new INPMonitor();
    monitorRef.current.startMonitoring();

    const interval = setInterval(() => {
      if (monitorRef.current) {
        setINP(monitorRef.current.getINP());
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return { inp };
};
```

## Best Practices Checklist

### Break up long tasks

- Yield to main thread every 50ms
- Use requestIdleCallback for non-urgent work
- Implement task scheduling with priorities

### Optimize event handlers

- Debounce expensive operations
- Use event delegation
- Process in chunks with yielding

### Avoid layout thrashing

- Batch DOM reads and writes
- Use requestAnimationFrame for updates
- Cache layout measurements

### Use React concurrent features

- Mark non-urgent updates with transitions
- Defer expensive renders
- Use Suspense for data fetching

### Monitor INP

- Track all user interactions
- Identify slow interactions
- Report metrics to analytics

## Related Topics

- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Comprehensive guide to INP and other Core Web Vitals
- **[Concurrent React Scheduling](./concurrent-react-scheduling.md)** - Use React's scheduler to optimize interactions
- **[Web Workers with React](./web-workers-with-react.md)** - Offload heavy computation to keep interactions responsive
- **[Debugging Performance Issues](./debugging-performance-issues.md)** - Debug slow interactions and long tasks
- **[Production Performance Monitoring](./production-performance-monitoring.md)** - Monitor INP in production

## Conclusion

INP isn't just another metric—it's a promise to your users that every interaction matters. Every click should feel instant. Every keypress should respond immediately. Every gesture should trigger visible feedback within 200 milliseconds.

The techniques we've covered—breaking up long tasks, using scheduler APIs, optimizing React rendering—aren't just performance optimizations. They're about respecting your users' time and maintaining the illusion of instantaneous response that makes apps feel native.

Remember: users don't care about your complex state management or your sophisticated algorithms. They care that when they click a button, something happens immediately. Make that happen, and you've won the performance game.
