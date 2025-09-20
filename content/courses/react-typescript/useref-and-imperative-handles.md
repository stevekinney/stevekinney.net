---
title: 'useRef, Callback Refs, and Imperative Handles'
description: >-
  Type refs to DOM nodes and components—safely expose imperative APIs with
  forwardRef and useImperativeHandle.
date: 2025-09-06T22:04:44.910Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - refs
  - useref
  - imperative-handle
  - dom
---

Sometimes React's declarative model isn't quite enough—you need to imperatively focus an input, measure a DOM node, or call a method on a third-party library. Enter refs: React's escape hatch for direct DOM access and component imperative APIs. We'll explore how to type refs properly in TypeScript, understand when callback refs shine over `useRef`, and build clean imperative interfaces with `forwardRef` and `useImperativeHandle`.

If you've ever found yourself muttering "just let me grab that DOM element," then refs are your friend. But like any power tool, they come with sharp edges—especially in TypeScript where you need to wrangle types for DOM elements, mutable ref objects, and component interfaces.

## The `useRef` Playground

Let's start with the most common ref pattern: `useRef` for accessing DOM elements. TypeScript needs to know what you're storing, and DOM elements have specific types.

```ts
import { useRef, useEffect } from 'react';

export function InputFocus() {
  // ✅ Explicitly type the ref for HTMLInputElement
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // TypeScript knows this could be null
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="Auto-focused input" />;
}
```

The magic happens with that generic parameter: `useRef<HTMLInputElement>(null)`. This tells TypeScript you're storing a reference to an input element, and the initial value is `null` (because React hasn't rendered yet).

Here's a more comprehensive example showing different DOM element types:

```ts
import { useRef } from 'react';

export function DOMReferences() {
  const divRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleMeasure = () => {
    if (divRef.current) {
      const { width, height } = divRef.current.getBoundingClientRect();
      console.log(`Div dimensions: ${width}x${height}`);
    }
  };

  const handleCanvasSetup = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.fillRect(0, 0, 100, 100);
    }
  };

  return (
    <div>
      <div ref={divRef} className="measured-div">
        Measure me!
      </div>
      <button ref={buttonRef} onClick={handleMeasure}>
        Measure Div
      </button>
      <canvas ref={canvasRef} width={200} height={200} onClick={handleCanvasSetup} />
    </div>
  );
}
```

## Storing Values with `useRef`

`useRef` isn't just for DOM elements—it's also perfect for storing mutable values that persist across renders without triggering re-renders. Think of it as a "box" you can put anything into.

```ts
import { useRef, useEffect, useState } from 'react';

export function TimerComponent() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // ✅ Store the timer ID - number or undefined
  const timerRef = useRef<number | undefined>();

  // ✅ Track previous count value
  const prevCountRef = useRef<number>();

  useEffect(() => {
    prevCountRef.current = count;
  });

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      // Store the timer ID in the ref
      timerRef.current = window.setInterval(() => {
        setCount(c => c + 1);
      }, 100);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
      setIsRunning(false);
    }
  };

  const prevCount = prevCountRef.current;

  return (
    <div>
      <p>Count: {count}</p>
      <p>Previous: {prevCount}</p>
      <button onClick={startTimer} disabled={isRunning}>
        Start
      </button>
      <button onClick={stopTimer} disabled={!isRunning}>
        Stop
      </button>
    </div>
  );
}
```

> [!TIP]
> When storing non-DOM values in refs, always type them explicitly. `useRef<number>()` without an initial value creates `MutableRefObject<number | undefined>`, which is usually what you want for timer IDs or other optional values.

## Callback Refs: When `useRef` Isn't Enough

Sometimes `useRef` feels clunky—like when you need to run code immediately when a DOM element becomes available, or when you're working with dynamic elements. Callback refs let you pass a function instead of a ref object, and React calls it with the element.

```ts
import { useState, useCallback } from 'react';

export function CallbackRefExample() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // ✅ Callback ref - receives the element directly
  const measuredRef = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const { width, height } = element.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  return (
    <div>
      <div
        ref={measuredRef}
        style={{
          width: '50%',
          height: '200px',
          backgroundColor: '#f0f0f0',
          padding: '20px'
        }}
      >
        This div measures itself!
      </div>
      {dimensions && (
        <p>Dimensions: {dimensions.width.toFixed(0)}px × {dimensions.height.toFixed(0)}px</p>
      )}
    </div>
  );
}
```

Callback refs really shine when you need to handle dynamic lists or conditionally rendered elements:

```ts
import { useState, useCallback } from 'react';

interface Item {
  id: string;
  name: string;
}

export function DynamicListRefs() {
  const [items] = useState<Item[]>([
    { id: '1', name: 'First item' },
    { id: '2', name: 'Second item' },
    { id: '3', name: 'Third item' },
  ]);

  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});

  // ✅ Callback ref factory - creates a ref callback for each item
  const createItemRef = useCallback((itemId: string) =>
    (element: HTMLLIElement | null) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        setItemHeights(prev => ({ ...prev, [itemId]: height }));
      }
    }, []);

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id} ref={createItemRef(item.id)} style={{ padding: '10px' }}>
            {item.name}
            {itemHeights[item.id] && (
              <span style={{ color: '#666', marginLeft: '10px' }}>
                ({itemHeights[item.id].toFixed(0)}px tall)
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Forwarding Refs: Passing the Buck

When you create reusable components, you often want parent components to access the underlying DOM elements. `forwardRef` lets you "forward" a ref through your component to the element inside.

```ts
import { forwardRef, useRef, useImperativeHandle } from 'react';

interface CustomInputProps {
  label: string;
  placeholder?: string;
}

// ✅ forwardRef with proper typing
export const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ label, placeholder }, ref) => {
    return (
      <div className="custom-input">
        <label>
          {label}
          <input
            ref={ref}
            placeholder={placeholder}
            style={{
              marginLeft: '10px',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </label>
      </div>
    );
  }
);

// Don't forget the display name for debugging
CustomInput.displayName = 'CustomInput';
```

Now parent components can get direct access to the input element:

```ts
import { useRef } from 'react';

export function ParentWithForwardedRef() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div>
      <CustomInput ref={inputRef} label="Name:" placeholder="Enter your name" />
      <div style={{ marginTop: '10px' }}>
        <button onClick={focusInput}>Focus Input</button>
        <button onClick={clearInput} style={{ marginLeft: '10px' }}>
          Clear & Focus
        </button>
      </div>
    </div>
  );
}
```

> [!WARNING]
> When using `forwardRef`, the component function receives `props` first, then `ref` second. This is different from the usual pattern where `ref` is part of props.

## Imperative Handles: Curated APIs

Sometimes you don't want to expose the entire DOM element—you want to create a curated imperative API. `useImperativeHandle` lets you customize what gets exposed when a parent component accesses your ref.

```ts
import { forwardRef, useRef, useImperativeHandle, useState } from 'react';

interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ src, onTimeUpdate }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // ✅ Expose only specific methods via useImperativeHandle
    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play();
        setIsPlaying(true);
      },
      pause: () => {
        videoRef.current?.pause();
        setIsPlaying(false);
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime ?? 0;
      },
      getDuration: () => {
        return videoRef.current?.duration ?? 0;
      },
    }), []);

    return (
      <div className="video-player">
        <video
          ref={videoRef}
          src={src}
          onTimeUpdate={() => {
            if (videoRef.current && onTimeUpdate) {
              onTimeUpdate(videoRef.current.currentTime);
            }
          }}
          style={{ width: '100%', maxWidth: '500px' }}
        />
        <div style={{ marginTop: '10px' }}>
          Status: {isPlaying ? 'Playing' : 'Paused'}
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
```

Now parent components get a clean, controlled API instead of the entire video element:

```ts
import { useRef, useState } from 'react';

export function VideoController() {
  const videoRef = useRef<VideoPlayerHandle>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePlay = () => videoRef.current?.play();
  const handlePause = () => videoRef.current?.pause();
  const handleSeek = (time: number) => videoRef.current?.seek(time);

  return (
    <div>
      <VideoPlayer
        ref={videoRef}
        src="/sample-video.mp4"
        onTimeUpdate={setCurrentTime}
      />

      <div style={{ marginTop: '20px' }}>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause} style={{ marginLeft: '10px' }}>
          Pause
        </button>
        <button onClick={() => handleSeek(30)} style={{ marginLeft: '10px' }}>
          Skip to 30s
        </button>

        <p>Current time: {currentTime.toFixed(2)}s</p>
      </div>
    </div>
  );
}
```

## Common Patterns and Pitfalls

### The Null Check Dance

DOM refs start as `null`, so you'll be doing null checks constantly. Here are some patterns to make it less painful:

```ts
import { useRef, useCallback } from 'react';

export function NullCheckPatterns() {
  const elementRef = useRef<HTMLDivElement>(null);

  // ✅ Early return pattern
  const handleMeasure = useCallback(() => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    console.log('Dimensions:', rect.width, rect.height);
  }, []);

  // ✅ Optional chaining for simple operations
  const handleFocus = useCallback(() => {
    elementRef.current?.focus();
  }, []);

  // ✅ Helper function for common operations
  const withElement = useCallback((callback: (el: HTMLDivElement) => void) => {
    if (elementRef.current) {
      callback(elementRef.current);
    }
  }, []);

  const handleComplexOperation = useCallback(() => {
    withElement((el) => {
      el.style.backgroundColor = 'lightblue';
      el.scrollIntoView({ behavior: 'smooth' });
      // More complex operations without null checks
    });
  }, [withElement]);

  return (
    <div ref={elementRef} tabIndex={0}>
      <button onClick={handleMeasure}>Measure</button>
      <button onClick={handleFocus}>Focus</button>
      <button onClick={handleComplexOperation}>Complex Operation</button>
    </div>
  );
}
```

### Ref Timing Gotchas

Refs aren't available during the first render—they're set during the commit phase. If you need to run code when the ref becomes available, use `useEffect`:

```ts
import { useRef, useEffect } from 'react';

export function RefTimingExample() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ❌ This won't work - ref is null during first render
  // const ctx = canvasRef.current?.getContext('2d');

  useEffect(() => {
    // ✅ This works - ref is available after commit
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(10, 10, 100, 100);
      }
    }
  }, []); // Empty dependency array - run once after mount

  return <canvas ref={canvasRef} width={200} height={200} />;
}
```

### Combining Multiple Refs

Sometimes you need to use both a forwarded ref and your own internal ref. Here's how to handle that:

```ts
import { forwardRef, useRef, useImperativeHandle } from 'react';

interface EnhancedButtonHandle {
  focus: () => void;
  click: () => void;
}

interface EnhancedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const EnhancedButton = forwardRef<EnhancedButtonHandle, EnhancedButtonProps>(
  ({ children, onClick }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => buttonRef.current?.focus(),
      click: () => buttonRef.current?.click(),
    }), []);

    return (
      <button
        ref={buttonRef}
        onClick={onClick}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        {children}
      </button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';
```

## When to Use What

Here's a quick decision tree for choosing the right ref approach:

- **Need to access a DOM element?** → `useRef<HTMLElementType>(null)`
- **Need to store a mutable value across renders?** → `useRef<ValueType>(initialValue)`
- **Need to run code when an element appears?** → Callback ref
- **Working with dynamic lists?** → Callback refs with factories
- **Building a reusable component that should expose its element?** → `forwardRef`
- **Want to expose a curated API instead of the raw element?** → `forwardRef` + `useImperativeHandle`

## Real World Use Cases™

### Focus Management

```ts
import { useRef, useEffect } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
}

export function FocusTrap({ children, active }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    // Focus the container
    containerRef.current.focus();

    // Return focus when deactivating
    return () => {
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{
        outline: active ? '2px solid blue' : 'none',
        padding: '20px',
        border: '1px solid #ccc'
      }}
    >
      {children}
    </div>
  );
}
```

### Form Field Coordination

```ts
import { forwardRef, useImperativeHandle, useRef } from 'react';

interface FormFieldHandle {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
}

interface FormFieldProps {
  label: string;
  type?: string;
  required?: boolean;
}

export const FormField = forwardRef<FormFieldHandle, FormFieldProps>(
  ({ label, type = 'text', required }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
          inputRef.current.focus();
        }
      },
      getValue: () => inputRef.current?.value ?? '',
    }), []);

    return (
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
        <input
          ref={inputRef}
          type={type}
          required={required}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '100%'
          }}
        />
      </div>
    );
  }
);

FormField.displayName = 'FormField';
```

## Wrapping Up

Refs bridge React's declarative world with the imperative DOM APIs you sometimes need. TypeScript makes them safer by catching type mismatches at compile time, but you still need to handle the runtime reality of null refs and proper lifecycle management.

The key takeaways:

- Always type your refs explicitly—`useRef<HTMLInputElement>(null)` beats `useRef(null)`
- Use callback refs for dynamic scenarios and immediate DOM access
- `forwardRef` + `useImperativeHandle` creates clean component APIs without exposing implementation details
- Remember that refs are `null` until after the first render

Refs are your escape hatch when React's normal data flow isn't enough. Use them judiciously, type them properly, and your future self will thank you when debugging DOM interactions at 2 AM.
