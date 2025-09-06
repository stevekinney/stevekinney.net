---
title: flushSync and Imperative DOM with Types
description: Coordinate with the DOM—type helpers that force sync updates for focus, measurement, and animations sparingly.
date: 2025-09-06T22:04:45.040Z
modified: 2025-09-06T22:04:45.040Z
published: true
tags: ['react', 'typescript', 'flush-sync', 'imperative-dom', 'refs', 'dom-manipulation']
---

React's declarative model is brilliant—until you need to coordinate with the DOM itself. Sometimes you need to measure elements, focus inputs, or time animations precisely. Enter `flushSync` and React's imperative DOM helpers, which let you step outside React's async world when the situation calls for it (and TypeScript helps ensure you do it safely).

`flushSync` forces React to flush updates synchronously instead of batching them, while imperative DOM patterns use refs to directly manipulate DOM elements. Both are escape hatches from React's declarative model—powerful tools that should be used sparingly and with good reason.

## Understanding React's Asynchronous Updates

Before we dive into `flushSync`, let's understand why React batches updates in the first place. React groups multiple state updates together to avoid unnecessary re-renders, which improves performance but can create timing challenges:

```tsx
function AsyncExample() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  const handleClick = () => {
    setCount(count + 1);
    setMessage(`Count is now ${count + 1}`);
    // Both updates are batched together
  };

  return (
    <div>
      <p>Count: {count}</p>
      <p>{message}</p>
      <button onClick={handleClick}>Update</button>
    </div>
  );
}
```

This batching is usually what you want, but sometimes you need updates to happen immediately—that's where `flushSync` comes in.

## When to Use flushSync

`flushSync` forces React to synchronously flush updates to the DOM. Use it sparingly for these specific scenarios:

- **Focus management**: Ensuring an element is rendered before focusing it
- **DOM measurements**: Getting accurate dimensions after state changes
- **Animation timing**: Coordinating with animation libraries
- **Scroll position**: Updating scroll position after content changes

> [!WARNING]
> `flushSync` can hurt performance by preventing React's optimizations. Only use it when you have a specific timing requirement.

## Basic flushSync Usage with Types

Here's how to use `flushSync` with proper TypeScript types:

```tsx
import { flushSync } from 'react-dom';
import { useState, useRef, type RefObject } from 'react';

interface ListItem {
  id: string;
  text: string;
}

function TodoList() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const inputRef: RefObject<HTMLInputElement> = useRef(null);
  const listRef: RefObject<HTMLUListElement> = useRef(null);

  const addItem = () => {
    if (!newItem.trim()) return;

    const item: ListItem = {
      id: crypto.randomUUID(),
      text: newItem,
    };

    // ✅ Good: Force sync update before measuring/focusing
    flushSync(() => {
      setItems((prev) => [...prev, item]);
      setNewItem('');
    });

    // Now we can safely interact with the DOM
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Scroll to show the new item
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  return (
    <div>
      <ul ref={listRef} style={{ maxHeight: '200px', overflow: 'auto' }}>
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
      <input
        ref={inputRef}
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addItem()}
      />
      <button onClick={addItem}>Add Item</button>
    </div>
  );
}
```

## Real-World Example: Modal Focus Management

Here's a practical example where `flushSync` ensures proper focus management in a modal:

```tsx
import { flushSync } from 'react-dom';
import { useState, useRef, useEffect, type RefObject } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef: RefObject<HTMLDialogElement> = useRef(null);
  const firstFocusableRef: RefObject<HTMLButtonElement> = useRef(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (isOpen) {
      // ✅ Good: Ensure modal is rendered before focusing
      flushSync(() => {
        modal.showModal();
      });

      // Now safely focus the first element
      if (firstFocusableRef.current) {
        firstFocusableRef.current.focus();
      }
    } else {
      modal.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog ref={modalRef} onClose={onClose}>
      <div>
        <header>
          <h2>{title}</h2>
          <button ref={firstFocusableRef} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </header>
        <main>{children}</main>
      </div>
    </dialog>
  );
}

// Usage with proper typing
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Open Modal</button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Settings">
        <p>Modal content here...</p>
      </Modal>
    </div>
  );
}
```

## Imperative DOM Patterns with Types

Sometimes you need to directly manipulate DOM elements. Here are common patterns with proper TypeScript types:

### Custom Input Focus Hook

```tsx
import { useRef, useCallback, type RefObject } from 'react';

// ✅ Good: Generic hook with proper constraints
function useFocusableRef<T extends HTMLElement>(): [RefObject<T>, () => void] {
  const ref: RefObject<T> = useRef(null);

  const focus = useCallback(() => {
    if (ref.current && 'focus' in ref.current) {
      (ref.current as HTMLElement & { focus(): void }).focus();
    }
  }, []);

  return [ref, focus];
}

// Better: Type-safe version for specific elements
function useInputFocus(): [RefObject<HTMLInputElement>, () => void] {
  const ref: RefObject<HTMLInputElement> = useRef(null);

  const focus = useCallback(() => {
    ref.current?.focus();
  }, []);

  return [ref, focus];
}

// Usage
function SearchForm() {
  const [inputRef, focusInput] = useInputFocus();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', query);

    // Focus input after search (maybe for next query)
    flushSync(() => {
      setQuery('');
    });
    focusInput();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

### DOM Measurement with Types

```tsx
import { useState, useRef, useCallback, type RefObject } from 'react';
import { flushSync } from 'react-dom';

interface ElementDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
}

function useElementDimensions<T extends HTMLElement>(): [
  RefObject<T>,
  ElementDimensions | null,
  () => void,
] {
  const ref: RefObject<T> = useRef(null);
  const [dimensions, setDimensions] = useState<ElementDimensions | null>(null);

  const measure = useCallback(() => {
    if (!ref.current) {
      setDimensions(null);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    setDimensions({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
    });
  }, []);

  return [ref, dimensions, measure];
}

// Usage example
function ResizableBox() {
  const [content, setContent] = useState('Short content');
  const [boxRef, dimensions, measureBox] = useElementDimensions<HTMLDivElement>();

  const addContent = () => {
    // ✅ Good: Ensure content is rendered before measuring
    flushSync(() => {
      setContent((prev) => prev + '\nMore content here...');
    });
    measureBox();
  };

  return (
    <div>
      <div
        ref={boxRef}
        style={{
          border: '1px solid #ccc',
          padding: '16px',
          whiteSpace: 'pre-line',
        }}
      >
        {content}
      </div>
      <button onClick={addContent}>Add Content</button>
      <button onClick={measureBox}>Measure Box</button>
      {dimensions && (
        <p>
          Size: {Math.round(dimensions.width)}×{Math.round(dimensions.height)}px
        </p>
      )}
    </div>
  );
}
```

## Animation Coordination Example

Here's how to coordinate React state changes with animation libraries:

```tsx
import { useState, useRef, useCallback, type RefObject } from 'react';
import { flushSync } from 'react-dom';

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function AnimatedList<T>({ items, renderItem, keyExtractor }: AnimatedListProps<T>) {
  const listRef: RefObject<HTMLUListElement> = useRef(null);
  const [animatingItems, setAnimatingItems] = useState(new Set<string>());

  const animateItemRemoval = useCallback((itemKey: string) => {
    const listElement = listRef.current;
    if (!listElement) return;

    const itemElement = listElement.querySelector(`[data-key="${itemKey}"]`);
    if (!itemElement) return;

    // Mark item as animating
    flushSync(() => {
      setAnimatingItems((prev) => new Set(prev).add(itemKey));
    });

    // Start animation
    itemElement
      .animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: 'translateX(-100%)' },
        ],
        {
          duration: 300,
          easing: 'ease-out',
        },
      )
      .addEventListener('finish', () => {
        // Clean up after animation
        setAnimatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      });
  }, []);

  return (
    <ul ref={listRef}>
      {items.map((item, index) => {
        const key = keyExtractor(item);
        const isAnimating = animatingItems.has(key);

        return (
          <li
            key={key}
            data-key={key}
            style={{
              opacity: isAnimating ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
            onClick={() => animateItemRemoval(key)}
          >
            {renderItem(item, index)}
          </li>
        );
      })}
    </ul>
  );
}

// Usage
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Learn React', completed: false },
    { id: '2', text: 'Master TypeScript', completed: true },
  ]);

  return (
    <AnimatedList
      items={todos}
      keyExtractor={(todo) => todo.id}
      renderItem={(todo) => (
        <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
          {todo.text}
        </span>
      )}
    />
  );
}
```

## Common Pitfalls and Best Practices

### ❌ Bad: Overusing flushSync

```tsx
// Don't do this - unnecessary flushSync usage
function BadCounter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    flushSync(() => {
      setCount(count + 1);
    });
    // No reason for flushSync here!
  };

  return <button onClick={increment}>{count}</button>;
}
```

### ✅ Good: Strategic flushSync usage

```tsx
// Do this - flushSync only when you need DOM coordination
function GoodInfiniteScroll() {
  const [items, setItems] = useState<string[]>([]);
  const scrollRef: RefObject<HTMLDivElement> = useRef(null);

  const loadMore = useCallback(() => {
    const newItems = Array.from({ length: 10 }, (_, i) => `Item ${items.length + i + 1}`);

    // Only use flushSync when you need to measure/scroll after update
    flushSync(() => {
      setItems((prev) => [...prev, ...newItems]);
    });

    // Now safely scroll to new content
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

      if (wasAtBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [items.length]);

  return (
    <div ref={scrollRef} style={{ height: '300px', overflow: 'auto' }}>
      {items.map((item) => (
        <div key={item} style={{ padding: '8px' }}>
          {item}
        </div>
      ))}
      <button onClick={loadMore}>Load More</button>
    </div>
  );
}
```

### Type Safety Tips

1. **Use specific element types**: `RefObject<HTMLInputElement>` instead of `RefObject<HTMLElement>`
2. **Check for null**: Always check `ref.current` before using it
3. **Type animation callbacks**: Use proper event types for animation events
4. **Generic constraints**: Use constraints like `T extends HTMLElement` for reusable hooks

## Performance Considerations

`flushSync` bypasses React's performance optimizations, so use it judiciously:

- **Profile first**: Measure if you actually have a timing problem
- **Batch operations**: Group multiple state updates inside one `flushSync` call
- **Avoid in loops**: Don't call `flushSync` repeatedly in tight loops
- **Consider alternatives**: Sometimes `useLayoutEffect` is a better choice

```tsx
// ✅ Good: Batch multiple updates
flushSync(() => {
  setItems(newItems);
  setLoading(false);
  setError(null);
});

// ❌ Bad: Multiple flushSync calls
flushSync(() => setItems(newItems));
flushSync(() => setLoading(false));
flushSync(() => setError(null));
```

## When to Use useLayoutEffect Instead

Sometimes `useLayoutEffect` is a better choice than `flushSync`:

```tsx
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

function AutoResizeTextarea() {
  const textareaRef: RefObject<HTMLTextAreaElement> = useRef(null);
  const [value, setValue] = useState('');

  // ✅ Good: useLayoutEffect for DOM measurements
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
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

## Real World Use Cases™

Here are some practical scenarios where these patterns shine:

### 1. Form Validation with Focus

```tsx
interface FormError {
  field: string;
  message: string;
}

function ValidatedForm() {
  const [errors, setErrors] = useState<FormError[]>([]);
  const fieldsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const validateAndFocus = (formData: FormData) => {
    const newErrors: FormError[] = [];

    // Validate fields...
    if (!formData.get('email')) {
      newErrors.push({ field: 'email', message: 'Email is required' });
    }

    if (newErrors.length > 0) {
      // ✅ Good: Update errors first, then focus
      flushSync(() => {
        setErrors(newErrors);
      });

      // Focus first error field
      const firstErrorField = newErrors[0].field;
      fieldsRef.current[firstErrorField]?.focus();
    }

    return newErrors.length === 0;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (validateAndFocus(formData)) {
          console.log('Form submitted!');
        }
      }}
    >
      <input
        name="email"
        type="email"
        ref={(el) => (fieldsRef.current.email = el)}
        placeholder="Email"
      />
      {errors.find((e) => e.field === 'email') && <p style={{ color: 'red' }}>Email is required</p>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 2. Dynamic Content with Scroll Preservation

```tsx
function ChatMessages() {
  const [messages, setMessages] = useState<Array<{ id: string; text: string }>>([]);
  const messagesRef: RefObject<HTMLDivElement> = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const addMessage = (text: string) => {
    const container = messagesRef.current;
    if (!container) return;

    // Check if user was at bottom before adding message
    const wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;

    const newMessage = {
      id: crypto.randomUUID(),
      text,
    };

    // ✅ Good: Add message, then decide whether to scroll
    flushSync(() => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Only auto-scroll if user was already at bottom
    if (wasAtBottom || shouldScrollToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  };

  return (
    <div>
      <div
        ref={messagesRef}
        style={{
          height: '300px',
          overflow: 'auto',
          border: '1px solid #ccc',
        }}
      >
        {messages.map((message) => (
          <div key={message.id} style={{ padding: '8px' }}>
            {message.text}
          </div>
        ))}
      </div>
      <button onClick={() => addMessage(`Message ${messages.length + 1}`)}>Add Message</button>
    </div>
  );
}
```

## Wrapping Up

`flushSync` and imperative DOM patterns are powerful escape hatches from React's declarative model. Use them when you need precise timing for focus management, DOM measurements, or animation coordination—but always measure the performance impact and consider whether declarative alternatives might work just as well.

Remember: React's async nature is usually a feature, not a bug. When you do need to step outside that model, TypeScript's type system helps ensure you're doing it safely by catching null reference errors and providing proper element types for your DOM manipulations.

The key is knowing when these tools are genuinely necessary versus when you're fighting against React's natural patterns. When in doubt, start with the declarative approach and reach for `flushSync` only when you have a specific timing requirement that can't be solved otherwise.
