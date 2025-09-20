---
title: Virtual DOM & Fiber Architecture Deep Dive
description: >-
  Understand how React really works under the hood. Master the Fiber
  architecture, priority scheduling, and reconciliation to write truly optimized
  React apps.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - virtual-dom
  - fiber
  - architecture
---

You've heard it a thousand times: "React uses a Virtual DOM for performance." But when pressed for details, most developers hand-wave something about "diffing" and "batching updates." The truth is far more fascinating. React's Fiber architecture is a complete rewrite of React's core algorithm, introducing concepts like time-slicing, priority scheduling, and interruptible rendering that fundamentally change how we should think about React performance.

Understanding Fiber isn't just academic curiosity—it directly impacts how you write performant React code. When you know how React schedules work, prioritizes updates, and decides what to render when, you can structure your components and state updates to work with React's algorithm instead of against it. This deep dive reveals the inner workings that power every React application.

## The Virtual DOM: More Than Just a Diff

The Virtual DOM isn't just a performance optimization—it's a programming model that enables declarative UI:

```tsx
// What the Virtual DOM actually is
interface VirtualNode {
  type: string | ComponentType; // 'div' or MyComponent
  props: Record<string, any>; // Including children
  key: string | null; // For list reconciliation
  ref: any; // Ref attachments
}

// Simplified Virtual DOM creation
function createElement(
  type: string | ComponentType,
  props: Record<string, any> | null,
  ...children: any[]
): VirtualNode {
  return {
    type,
    props: {
      ...props,
      children: children.length === 1 ? children[0] : children,
    },
    key: props?.key || null,
    ref: props?.ref || null,
  };
}

// What JSX compiles to
const jsxElement = <div className="card">Hello</div>;

// Becomes:
const virtualElement = createElement('div', { className: 'card' }, 'Hello');

// Component Virtual DOM
const ComponentVDOM = createElement(
  MyComponent,
  { name: 'React' },
  createElement('span', null, 'Child'),
);
```

### The Reconciliation Process

```tsx
// Simplified reconciliation algorithm
class SimpleReconciler {
  reconcile(
    oldVNode: VirtualNode | null,
    newVNode: VirtualNode | null,
    container: HTMLElement,
  ): void {
    // Deletion
    if (oldVNode && !newVNode) {
      this.removeNode(oldVNode, container);
      return;
    }

    // Addition
    if (!oldVNode && newVNode) {
      this.createNode(newVNode, container);
      return;
    }

    // Update
    if (oldVNode && newVNode) {
      // Different types: replace entirely
      if (oldVNode.type !== newVNode.type) {
        this.removeNode(oldVNode, container);
        this.createNode(newVNode, container);
        return;
      }

      // Same type: update properties and recurse on children
      this.updateNode(oldVNode, newVNode, container);
      this.reconcileChildren(oldVNode, newVNode, container);
    }
  }

  private reconcileChildren(
    oldVNode: VirtualNode,
    newVNode: VirtualNode,
    container: HTMLElement,
  ): void {
    const oldChildren = Array.isArray(oldVNode.props.children)
      ? oldVNode.props.children
      : [oldVNode.props.children];

    const newChildren = Array.isArray(newVNode.props.children)
      ? newVNode.props.children
      : [newVNode.props.children];

    // Key-based reconciliation for lists
    if (this.hasKeys(newChildren)) {
      this.reconcileKeyedChildren(oldChildren, newChildren, container);
    } else {
      // Index-based reconciliation (less efficient)
      this.reconcileIndexedChildren(oldChildren, newChildren, container);
    }
  }

  private reconcileKeyedChildren(
    oldChildren: VirtualNode[],
    newChildren: VirtualNode[],
    container: HTMLElement,
  ): void {
    // Build key maps for efficient lookup
    const oldKeyMap = new Map<string, VirtualNode>();
    oldChildren.forEach((child) => {
      if (child.key) oldKeyMap.set(child.key, child);
    });

    newChildren.forEach((newChild, index) => {
      const oldChild = oldKeyMap.get(newChild.key!);

      if (oldChild) {
        // Reuse existing node
        this.updateNode(oldChild, newChild, container);
        oldKeyMap.delete(newChild.key!);
      } else {
        // Create new node
        this.createNode(newChild, container);
      }
    });

    // Remove unused old nodes
    oldKeyMap.forEach((oldChild) => {
      this.removeNode(oldChild, container);
    });
  }
}
```

## Fiber Architecture: The Game Changer

Fiber reimagines React's reconciliation algorithm as an incremental, interruptible process:

```tsx
// Fiber node structure (simplified)
interface FiberNode {
  // Instance
  tag: WorkTag; // Component type (Function, Class, Host, etc.)
  type: any; // Component constructor or DOM tag
  stateNode: any; // DOM node or class instance

  // Props and state
  pendingProps: any; // New props
  memoizedProps: any; // Previous props
  memoizedState: any; // Current state
  updateQueue: UpdateQueue | null; // Pending state updates

  // Effects
  flags: Flags; // Side effects to perform
  subtreeFlags: Flags; // Aggregated flags from subtree
  deletions: FiberNode[] | null; // Children to delete

  // Tree structure
  return: FiberNode | null; // Parent fiber
  child: FiberNode | null; // First child
  sibling: FiberNode | null; // Next sibling
  index: number; // Position in parent

  // Work in progress
  alternate: FiberNode | null; // Double buffering

  // Time and priority
  lanes: Lanes; // Priority of this update
  childLanes: Lanes; // Priority of children
  expirationTime: number; // When this work expires
}

// Work tags identify fiber type
enum WorkTag {
  FunctionComponent = 0,
  ClassComponent = 1,
  HostRoot = 3, // Root of the tree
  HostComponent = 5, // DOM elements
  HostText = 6, // Text nodes
  Fragment = 7,
  Mode = 8,
  ContextConsumer = 9,
  ContextProvider = 10,
  ForwardRef = 11,
  Profiler = 12,
  SuspenseComponent = 13,
  MemoComponent = 14,
  SimpleMemoComponent = 15,
  LazyComponent = 16,
}

// Flags track side effects
enum Flags {
  NoFlags = 0b0000000000000000000,
  PerformedWork = 0b0000000000000000001,
  Placement = 0b0000000000000000010,
  Update = 0b0000000000000000100,
  Deletion = 0b0000000000000001000,
  ChildDeletion = 0b0000000000000010000,
  ContentReset = 0b0000000000000100000,
  Callback = 0b0000000000001000000,
  DidCapture = 0b0000000000010000000,
  Ref = 0b0000000000100000000,
  Snapshot = 0b0000000001000000000,
  Passive = 0b0000000010000000000,
  LayoutMask = Update | Callback | Ref | Snapshot,
  PassiveMask = Passive | ChildDeletion,
}
```

### The Fiber Work Loop

```tsx
// Simplified Fiber work loop
class FiberScheduler {
  private workInProgressRoot: FiberNode | null = null;
  private workInProgress: FiberNode | null = null;
  private remainingExpirationTime: number = NoWork;
  private nextUnitOfWork: FiberNode | null = null;

  // Main work loop - can be interrupted
  workLoop(deadline: IdleDeadline): void {
    while (this.nextUnitOfWork !== null && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
      this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork);
    }

    if (this.nextUnitOfWork === null) {
      // All work complete, commit to DOM
      this.completeRoot();
    } else {
      // More work to do, schedule continuation
      requestIdleCallback((deadline) => this.workLoop(deadline));
    }
  }

  // Process one fiber node
  private performUnitOfWork(fiber: FiberNode): FiberNode | null {
    // Phase 1: Begin work (traverse down)
    const next = this.beginWork(fiber);

    if (next !== null) {
      // Continue with child
      return next;
    }

    // No children, complete this fiber
    let completedWork: FiberNode | null = fiber;

    while (completedWork !== null) {
      // Phase 2: Complete work (traverse up)
      const returnFiber = completedWork.return;
      const siblingFiber = completedWork.sibling;

      this.completeWork(completedWork);

      if (siblingFiber !== null) {
        // Continue with sibling
        return siblingFiber;
      }

      // Continue completing parent
      completedWork = returnFiber;
    }

    return null;
  }

  private beginWork(fiber: FiberNode): FiberNode | null {
    switch (fiber.tag) {
      case WorkTag.FunctionComponent:
        return this.updateFunctionComponent(fiber);

      case WorkTag.ClassComponent:
        return this.updateClassComponent(fiber);

      case WorkTag.HostComponent:
        return this.updateHostComponent(fiber);

      case WorkTag.SuspenseComponent:
        return this.updateSuspenseComponent(fiber);

      default:
        return null;
    }
  }

  private updateFunctionComponent(fiber: FiberNode): FiberNode | null {
    const Component = fiber.type;
    const props = fiber.pendingProps;

    // Call the function component
    const children = Component(props);

    // Reconcile children
    return this.reconcileChildren(fiber, children);
  }

  private completeWork(fiber: FiberNode): void {
    // Mark effects that need to be applied
    if (fiber.flags & Flags.Update) {
      this.markUpdate(fiber);
    }

    if (fiber.flags & Flags.Placement) {
      this.markPlacement(fiber);
    }

    if (fiber.flags & Flags.Deletion) {
      this.markDeletion(fiber);
    }

    // Bubble up effects to parent
    if (fiber.return !== null) {
      fiber.return.flags |= fiber.flags;
      fiber.return.subtreeFlags |= fiber.subtreeFlags;
    }
  }

  // Commit phase - apply all effects to DOM
  private completeRoot(): void {
    const finishedWork = this.workInProgressRoot;
    if (finishedWork === null) return;

    // Commit all effects
    this.commitRoot(finishedWork);

    // Reset for next update
    this.workInProgressRoot = null;
    this.workInProgress = null;
  }

  private commitRoot(root: FiberNode): void {
    // Phase 1: Before mutation (getSnapshotBeforeUpdate)
    this.commitBeforeMutationEffects(root);

    // Phase 2: Mutation (DOM updates)
    this.commitMutationEffects(root);

    // Swap the tree
    root.current = root.alternate;

    // Phase 3: Layout (componentDidMount/Update)
    this.commitLayoutEffects(root);
  }
}
```

## Priority and Scheduling

Fiber introduces priority-based scheduling to ensure high-priority updates (like user input) aren't blocked by low-priority work:

```tsx
// Priority levels in React
enum Lane {
  NoLane = 0b0000000000000000000000000000000,
  SyncLane = 0b0000000000000000000000000000001,
  InputContinuousLane = 0b0000000000000000000000000000100,
  DefaultLane = 0b0000000000000000000000000010000,
  TransitionLane1 = 0b0000000000000000000000001000000,
  TransitionLane2 = 0b0000000000000000000000010000000,
  IdleLane = 0b0100000000000000000000000000000,
  OffscreenLane = 0b1000000000000000000000000000000,
}

// Priority scheduler
class PriorityScheduler {
  private taskQueue: Task[] = [];
  private timerQueue: Task[] = [];
  private currentTask: Task | null = null;
  private isPerformingWork = false;

  scheduleCallback(priority: Priority, callback: () => void, options?: { delay?: number }): Task {
    const currentTime = performance.now();
    const startTime = currentTime + (options?.delay || 0);

    // Calculate timeout based on priority
    const timeout = this.timeoutForPriority(priority);
    const expirationTime = startTime + timeout;

    const task: Task = {
      id: this.nextTaskId++,
      callback,
      priority,
      startTime,
      expirationTime,
      sortIndex: -1,
    };

    if (startTime > currentTime) {
      // Delayed task
      task.sortIndex = startTime;
      this.push(this.timerQueue, task);

      if (this.taskQueue.length === 0 && task === this.peek(this.timerQueue)) {
        this.requestHostTimeout(this.handleTimeout, startTime - currentTime);
      }
    } else {
      // Immediate task
      task.sortIndex = expirationTime;
      this.push(this.taskQueue, task);

      if (!this.isPerformingWork) {
        this.isPerformingWork = true;
        this.requestHostCallback(this.flushWork);
      }
    }

    return task;
  }

  private timeoutForPriority(priority: Priority): number {
    switch (priority) {
      case Priority.Immediate:
        return -1; // IMMEDIATE_PRIORITY_TIMEOUT
      case Priority.UserBlocking:
        return 250; // USER_BLOCKING_PRIORITY_TIMEOUT
      case Priority.Normal:
        return 5000; // NORMAL_PRIORITY_TIMEOUT
      case Priority.Low:
        return 10000; // LOW_PRIORITY_TIMEOUT
      case Priority.Idle:
        return 1073741823; // IDLE_PRIORITY_TIMEOUT (never expires)
      default:
        return 5000;
    }
  }

  private flushWork(hasTimeRemaining: boolean, initialTime: number): boolean {
    this.isPerformingWork = true;

    try {
      return this.workLoop(hasTimeRemaining, initialTime);
    } finally {
      this.currentTask = null;
      this.isPerformingWork = false;
    }
  }

  private workLoop(hasTimeRemaining: boolean, initialTime: number): boolean {
    let currentTime = initialTime;
    this.advanceTimers(currentTime);

    this.currentTask = this.peek(this.taskQueue);

    while (this.currentTask !== null) {
      if (
        this.currentTask.expirationTime > currentTime &&
        (!hasTimeRemaining || this.shouldYieldToHost())
      ) {
        // This task hasn't expired, and we've run out of time
        break;
      }

      const callback = this.currentTask.callback;

      if (typeof callback === 'function') {
        this.currentTask.callback = null;
        const continuationCallback = callback();

        if (typeof continuationCallback === 'function') {
          // Task wants to continue
          this.currentTask.callback = continuationCallback;
        } else {
          // Task complete
          if (this.currentTask === this.peek(this.taskQueue)) {
            this.pop(this.taskQueue);
          }
        }
      } else {
        this.pop(this.taskQueue);
      }

      this.currentTask = this.peek(this.taskQueue);
      currentTime = performance.now();
    }

    // Return whether there's more work
    return this.currentTask !== null;
  }

  private shouldYieldToHost(): boolean {
    const currentTime = performance.now();
    return currentTime >= this.deadline;
  }

  // Min-heap operations for priority queue
  private push(heap: Task[], task: Task): void {
    const index = heap.length;
    heap.push(task);
    this.siftUp(heap, task, index);
  }

  private peek(heap: Task[]): Task | null {
    return heap.length === 0 ? null : heap[0];
  }

  private pop(heap: Task[]): Task | null {
    if (heap.length === 0) return null;

    const first = heap[0];
    const last = heap.pop()!;

    if (last !== first) {
      heap[0] = last;
      this.siftDown(heap, last, 0);
    }

    return first;
  }
}
```

## Concurrent Mode Features

Concurrent Mode leverages Fiber's architecture to enable powerful features:

```tsx
// Time Slicing Example
function TimeSlicingDemo() {
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState('');
  const [list, setList] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // High priority - immediate update
    setInputValue(e.target.value);

    // Low priority - can be interrupted
    startTransition(() => {
      const newList = [];
      for (let i = 0; i < 20000; i++) {
        newList.push(e.target.value);
      }
      setList(newList);
    });
  };

  return (
    <div>
      <input value={inputValue} onChange={handleChange} />
      {isPending && <span>Updating list...</span>}
      <ul>
        {list.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Suspense with Fiber
function SuspenseWithFiber() {
  // Fiber can pause rendering when a promise is thrown
  return (
    <Suspense fallback={<Loading />}>
      <AsyncComponent />
    </Suspense>
  );
}

function AsyncComponent() {
  const data = use(fetchData()); // Throws promise if not ready

  // Fiber will:
  // 1. Catch the promise
  // 2. Show fallback
  // 3. Resume rendering when promise resolves
  return <div>{data}</div>;
}
```

## How Fiber Impacts Performance

### Batching and Auto-batching

```tsx
// React 18+ automatic batching
function AutoBatchingExample() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // Before React 18: 2 renders
  // React 18+: 1 render (automatic batching)
  const handleClick = () => {
    setCount((c) => c + 1);
    setFlag((f) => !f);
    // Both updates batched automatically
  };

  // Even in async code!
  const handleAsyncClick = async () => {
    const data = await fetchData();

    // Still batched in React 18+
    setCount(data.count);
    setFlag(data.flag);
  };

  // Opt out of batching when needed
  const handleImmediateUpdate = () => {
    flushSync(() => {
      setCount((c) => c + 1);
    }); // Forces immediate render

    // This runs after count is updated
    setFlag((f) => !f);
  };

  return (
    <div>
      <p>
        Count: {count}, Flag: {flag.toString()}
      </p>
      <button onClick={handleClick}>Update Both</button>
    </div>
  );
}
```

### Optimizing for Fiber's Algorithm

```tsx
// Component structured for Fiber optimization
function FiberOptimizedComponent({ data }: { data: Item[] }) {
  // 1. Stable keys for efficient reconciliation
  const items = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        key: item.id, // Stable key
      })),
    [data],
  );

  // 2. Priority-aware updates
  const [search, setSearch] = useState('');
  const [deferredSearch] = useDeferredValue(search);

  // 3. Interrupt-friendly expensive computation
  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(deferredSearch.toLowerCase())),
    [items, deferredSearch],
  );

  // 4. Leverage suspense for data fetching
  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search (high priority)"
      />

      <Suspense fallback={<Skeleton />}>
        <ItemList items={filtered} />
      </Suspense>
    </div>
  );
}

// Understanding bailout optimization
function BailoutOptimization({ value }: { value: number }) {
  console.log('Parent render');

  // Fiber can skip rendering children if props haven't changed
  return (
    <>
      <ExpensiveChild /> {/* Skipped if no props change */}
      <CheapChild value={value} />
    </>
  );
}

const ExpensiveChild = memo(() => {
  console.log('ExpensiveChild render');
  // Complex computation...
  return <div>Expensive</div>;
});
```

## Debugging Fiber Internals

```tsx
// Accessing Fiber internals (development only)
function FiberDebugger({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Access fiber node
      const fiberNode =
        (ref.current as any)?._reactInternalFiber || (ref.current as any)?._reactInternalInstance;

      if (fiberNode) {
        console.group('Fiber Node Structure');
        console.log('Type:', fiberNode.type);
        console.log('Tag:', fiberNode.tag);
        console.log('Props:', fiberNode.memoizedProps);
        console.log('State:', fiberNode.memoizedState);
        console.log('Effects:', fiberNode.flags);
        console.log('Priority:', fiberNode.lanes);
        console.groupEnd();

        // Traverse fiber tree
        traverseFiberTree(fiberNode);
      }
    }
  }, []);

  return <div ref={ref}>{children}</div>;
}

function traverseFiberTree(fiber: any, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${fiber.type?.name || fiber.type || 'Unknown'}`);

  // Traverse children
  let child = fiber.child;
  while (child) {
    traverseFiberTree(child, depth + 1);
    child = child.sibling;
  }
}

// Performance marks for Fiber phases
function measureFiberPhases() {
  if (typeof window !== 'undefined' && window.performance) {
    // React adds marks during rendering
    const marks = performance.getEntriesByType('mark');
    const reactMarks = marks.filter(
      (mark) => mark.name.startsWith('⚛') || mark.name.includes('React'),
    );

    console.table(
      reactMarks.map((mark) => ({
        name: mark.name,
        startTime: mark.startTime,
        duration: mark.duration,
      })),
    );
  }
}
```

## Practical Fiber Optimizations

```tsx
// 1. Structure components for efficient reconciliation
function EfficientList({ items }: { items: Item[] }) {
  return (
    <div>
      {items.map((item) => (
        // Stable key = efficient reconciliation
        <Item key={item.id} {...item} />
      ))}
    </div>
  );
}

// 2. Use lanes for priority
function PriorityAwareComponent() {
  const [urgent, setUrgent] = useState('');
  const [deferred, setDeferred] = useState('');

  return (
    <div>
      <input
        value={urgent}
        onChange={(e) => {
          // Sync lane - highest priority
          setUrgent(e.target.value);
        }}
      />

      <button
        onClick={() => {
          // Transition lane - lower priority
          startTransition(() => {
            setDeferred(processData(urgent));
          });
        }}
      >
        Process
      </button>
    </div>
  );
}

// 3. Minimize fiber tree depth
// ❌ Deep nesting = more fiber nodes
function DeepNesting() {
  return (
    <div>
      <div>
        <div>
          <div>
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Flat structure = fewer fiber nodes
function FlatStructure() {
  return (
    <div className="container">
      <Content />
    </div>
  );
}

// 4. Leverage Suspense boundaries
function SuspenseBoundaries() {
  return (
    <div>
      {/* Each boundary can work independently */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <Suspense fallback={<ContentSkeleton />}>
        <Content />
      </Suspense>

      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </div>
  );
}
```

## Wrapping Up

The Virtual DOM and Fiber architecture are the beating heart of React's performance story. The Virtual DOM provides the declarative programming model we love, while Fiber transforms that model into an efficient, interruptible, priority-aware rendering machine. Understanding these internals isn't just academic—it directly informs how you structure components, manage state, and optimize performance.

The key insights: React can interrupt and resume work, different updates have different priorities, and the reconciliation algorithm rewards stable keys and shallow component trees. Write your React code with these principles in mind, and you're working with the framework's natural grain rather than against it.

## Related Topics

- **[Understanding Reconciliation React 19](./understanding-reconciliation-react-19.md)** - React 19 updates to reconciliation
- **[Concurrent React Scheduling](./concurrent-react-scheduling.md)** - Deep dive into scheduling and prioritization
- **[useTransition and startTransition](./usetransition-and-starttransition.md)** - Practical concurrent features
- **[React 19 Compiler Guide](./react-19-compiler-guide.md)** - How compiler optimizes at Fiber level

## Prerequisites

- Solid understanding of React fundamentals
- Knowledge of browser event loop and main thread
- Experience with React performance optimization concepts
- Basic understanding of computer science algorithms

## Practical Examples

Architecture knowledge applied to real scenarios:

- **Large data tables** - Efficient reconciliation with stable keys
- **Animation-heavy UIs** - Priority scheduling for smooth interactions
- **Progressive web apps** - Time-slicing for responsive loading
- **Real-time dashboards** - Concurrent updates without blocking

Master Fiber's mental model, and you'll write React applications that aren't just fast—they're predictably fast, gracefully handling everything from smooth animations to massive lists without breaking a sweat.
