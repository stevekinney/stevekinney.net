---
title: Windowing and Virtualization
description: >-
  Render only what users see. Use react-window to make 10,000-row lists fast
  without sacrificing UX or accessibility.
date: 2025-09-06T21:56:05.091Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - virtualization
  - lists
---

Rendering 10,000 list items in React? Your browser will politely decline with a frozen UI and a memory leak. The solution isn't to throw more RAM at the problem—it's to be smarter about what you render. Windowing (also called virtualization) renders only the items visible in the viewport, keeping your UI snappy even with massive datasets. We'll explore how to implement this with `react-window`, handle edge cases, and keep accessibility in mind while turning sluggish lists into buttery-smooth experiences.

## What is Windowing?

Windowing is like looking through a window at a massive painting—you only see the part that fits in the frame. When you scroll, you reveal different sections, but the entire painting isn't loaded into your view all at once. That would be ridiculous (and expensive).

In the context of React applications, windowing means:

1. **Only render visible items**: If your viewport shows 10 rows, render maybe 15-20 to handle smooth scrolling
2. **Recycle DOM nodes**: As items scroll out of view, their DOM elements get reused for new items scrolling in
3. **Maintain scroll position**: Users should never know items are being added and removed

This technique transforms lists that would normally crash your browser into performant, responsive experiences.

## When You Need Windowing

Here are some Real World Use Cases™ where windowing becomes essential:

- **Data tables** with hundreds or thousands of rows
- **Chat applications** with long message histories
- **File explorers** with many items
- **Social media feeds** (though infinite scrolling often pairs with windowing)
- **Log viewers** displaying thousands of entries
- **Dropdown menus** with hundreds of options

The general rule: if you're rendering more than 50-100 similar items, consider windowing.

> [!TIP]
> Start measuring performance once you hit around 50 items. You might be surprised how quickly things slow down, especially on mobile devices.

## Installing react-window

We'll use `react-window`, the most popular windowing library for React. It's the successor to `react-virtualized` but with a smaller bundle size and simpler API.

```bash
npm install react-window
# If you're using TypeScript (and you should be):
npm install --save-dev @types/react-window
```

For more advanced use cases, you might also want:

```bash
# For dynamic item heights and additional features
npm install react-window-infinite-loader
npm install react-virtualized-auto-sizer
```

## Basic Fixed-Size List

Let's start with the simplest case: a list where every item has the same height.

```tsx
import { FixedSizeList as List } from 'react-window';

interface Item {
  id: string;
  name: string;
  email: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: Item[];
}

// Individual row component
const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const item = data[index];

  return (
    <div style={style} className="flex items-center border-b p-4">
      <div className="font-medium">{item.name}</div>
      <div className="ml-4 text-gray-600">{item.email}</div>
    </div>
  );
};

// Main list component
const UserList: React.FC<{ users: Item[] }> = ({ users }) => {
  return (
    <List
      height={400} // Container height
      itemCount={users.length}
      itemSize={60} // Height of each row
      itemData={users} // Data passed to each row
      width="100%"
    >
      {Row}
    </List>
  );
};
```

Key points about this implementation:

- **`style` prop**: Always apply this to your row's root element—it positions items correctly
- **`itemData`**: Pass your data through this prop rather than closure to avoid re-creating row components
- **Fixed dimensions**: `height` and `itemSize` must be known ahead of time

## Variable-Size Lists

Real-world data rarely fits into uniform boxes. Users have different name lengths, comments vary in size, and content is dynamic. For these cases, use `VariableSizeList`:

```tsx
import { VariableSizeList as List } from 'react-window';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: Comment[];
}

const CommentRow: React.FC<RowProps> = ({ index, style, data }) => {
  const comment = data[index];

  return (
    <div style={style} className="border-b p-4">
      <div className="text-sm font-medium text-gray-500">
        {comment.author} • {comment.timestamp.toLocaleDateString()}
      </div>
      <div className="mt-2">{comment.content}</div>
    </div>
  );
};

const CommentList: React.FC<{ comments: Comment[] }> = ({ comments }) => {
  // Calculate the height of each item
  const getItemSize = (index: number): number => {
    const comment = comments[index];
    // Base height + content height estimation
    const baseHeight = 60; // Author info + padding
    const contentHeight = Math.ceil(comment.content.length / 50) * 20;
    return baseHeight + contentHeight;
  };

  return (
    <List
      height={400}
      itemCount={comments.length}
      itemSize={getItemSize}
      itemData={comments}
      width="100%"
    >
      {CommentRow}
    </List>
  );
};
```

> [!WARNING]
> Variable-size lists are trickier because `react-window` needs to know each item's height before rendering. Poor estimates can cause scroll jumping or incorrect scroll positions.

## Auto-Sizing the Container

Hardcoding container dimensions isn't always practical. `react-virtualized-auto-sizer` detects the parent container's size and passes it to your list:

```tsx
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

const ResponsiveUserList: React.FC<{ users: Item[] }> = ({ users }) => {
  return (
    <div className="h-full">
      {' '}
      {/* Parent container */}
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={users.length}
            itemSize={60}
            itemData={users}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};
```

This is particularly useful in responsive layouts where the list needs to fill available space.

## Adding Scrolling Controls

Sometimes you need programmatic scroll control—jumping to specific items, smooth scrolling, or restoring scroll position:

```tsx
import { useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

const ControllableList: React.FC<{ users: Item[] }> = ({ users }) => {
  const listRef = useRef<List>(null);

  const scrollToUser = useCallback(
    (userId: string) => {
      const index = users.findIndex((user) => user.id === userId);
      if (index !== -1 && listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      }
    },
    [users],
  );

  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start');
    }
  }, []);

  return (
    <div>
      <div className="mb-4 space-x-2">
        <button onClick={scrollToTop} className="rounded bg-blue-500 px-4 py-2 text-white">
          Scroll to Top
        </button>
        <button
          onClick={() => scrollToUser('user-100')}
          className="rounded bg-green-500 px-4 py-2 text-white"
        >
          Jump to User 100
        </button>
      </div>

      <List
        ref={listRef}
        height={400}
        itemCount={users.length}
        itemSize={60}
        itemData={users}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};
```

## Handling Loading States and Infinite Scroll

Real applications often load data incrementally. Combine windowing with infinite scrolling to handle truly massive datasets:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

interface InfiniteUserListProps {
  loadMoreUsers: (startIndex: number, stopIndex: number) => Promise<Item[]>;
}

const InfiniteUserList: React.FC<InfiniteUserListProps> = ({ loadMoreUsers }) => {
  const [users, setUsers] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Check if an item is loaded
  const isItemLoaded = useCallback(
    (index: number) => {
      return index < users.length;
    },
    [users.length],
  );

  // Load more items
  const loadMoreItems = useCallback(
    async (startIndex: number, stopIndex: number) => {
      if (isLoading) return;

      setIsLoading(true);
      try {
        const newUsers = await loadMoreUsers(startIndex, stopIndex);
        if (newUsers.length === 0) {
          setHasNextPage(false);
        } else {
          setUsers((prev) => [...prev, ...newUsers]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, loadMoreUsers],
  );

  // Row component that handles loading states
  const Row: React.FC<RowProps> = ({ index, style, data }) => {
    const user = data[index];

    // Show loading skeleton for unloaded items
    if (!user) {
      return (
        <div style={style} className="flex animate-pulse items-center border-b p-4">
          <div className="h-4 w-32 rounded bg-gray-300"></div>
          <div className="ml-4 h-4 w-48 rounded bg-gray-300"></div>
        </div>
      );
    }

    return (
      <div style={style} className="flex items-center border-b p-4">
        <div className="font-medium">{user.name}</div>
        <div className="ml-4 text-gray-600">{user.email}</div>
      </div>
    );
  };

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={hasNextPage ? users.length + 1 : users.length}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <List
          ref={ref}
          height={400}
          itemCount={hasNextPage ? users.length + 1 : users.length}
          itemSize={60}
          itemData={users}
          onItemsRendered={onItemsRendered}
          width="100%"
        >
          {Row}
        </List>
      )}
    </InfiniteLoader>
  );
};
```

## Performance Considerations

### Overscan Count

By default, `react-window` renders a few extra items outside the viewport to make scrolling smoother. You can tune this:

```tsx
<List
  // ... other props
  overscanCount={5} // Render 5 extra items above and below viewport
>
  {Row}
</List>
```

Higher values = smoother scrolling but more memory usage. Lower values = better memory usage but potential scroll jank.

### Memoization

Prevent unnecessary re-renders of your row components:

```tsx
import { memo } from 'react';

const Row = memo<RowProps>(({ index, style, data }) => {
  const item = data[index];

  return (
    <div style={style} className="flex items-center border-b p-4">
      <div className="font-medium">{item.name}</div>
      <div className="ml-4 text-gray-600">{item.email}</div>
    </div>
  );
});
```

### Avoid Inline Objects

Don't create objects in render—they'll cause every row to re-render:

```tsx
// ❌ Bad - creates new style object every render
<List itemData={{ users, theme: 'dark' }}>

// ✅ Good - stable reference
const itemData = useMemo(() => ({ users, theme }), [users, theme]);
<List itemData={itemData}>
```

## Accessibility Considerations

Windowing can break screen reader navigation since DOM elements are constantly being added and removed. Here's how to maintain accessibility:

```tsx
const AccessibleRow: React.FC<RowProps> = ({ index, style, data }) => {
  const item = data[index];

  return (
    <div
      style={style}
      className="flex items-center border-b p-4"
      role="listitem"
      aria-setsize={data.length}
      aria-posinset={index + 1}
      aria-label={`${item.name}, ${item.email}`}
    >
      <div className="font-medium">{item.name}</div>
      <div className="ml-4 text-gray-600">{item.email}</div>
    </div>
  );
};

const AccessibleUserList: React.FC<{ users: Item[] }> = ({ users }) => {
  return (
    <List
      height={400}
      itemCount={users.length}
      itemSize={60}
      itemData={users}
      width="100%"
      role="list"
      aria-label={`List of ${users.length} users`}
    >
      {AccessibleRow}
    </List>
  );
};
```

Key accessibility attributes:

- `role="list"` and `role="listitem"` for semantic structure
- `aria-setsize` and `aria-posinset` help screen readers understand position
- `aria-label` provides context for the entire list

## Common Pitfalls

### Incorrect Height Calculations

Variable-size lists are particularly sensitive to height miscalculations:

```tsx
// ❌ Bad - can cause scroll jumping
const getItemSize = (index: number) => {
  return Math.random() * 100; // Unpredictable heights
};

// ✅ Good - deterministic height calculation
const getItemSize = (index: number) => {
  const item = data[index];
  const baseHeight = 40;
  const contentLines = Math.ceil(item.content.length / CHARS_PER_LINE);
  return baseHeight + contentLines * LINE_HEIGHT;
};
```

### Forgetting the Style Prop

Every row component must apply the `style` prop:

```tsx
// ❌ Bad - missing style prop
const Row = ({ index, data }) => <div>{data[index].name}</div>;

// ✅ Good - style prop applied
const Row = ({ index, style, data }) => <div style={style}>{data[index].name}</div>;
```

### Memory Leaks in Row Components

Avoid creating event listeners or subscriptions in row components without cleanup:

```tsx
// ❌ Bad - potential memory leak
const Row = ({ index, style, data }) => {
  useEffect(() => {
    const subscription = subscribe(data[index].id);
    // Missing cleanup!
  }, []);

  return <div style={style}>{data[index].name}</div>;
};

// ✅ Good - proper cleanup
const Row = ({ index, style, data }) => {
  useEffect(() => {
    const subscription = subscribe(data[index].id);
    return () => subscription.unsubscribe();
  }, [data[index].id]);

  return <div style={style}>{data[index].name}</div>;
};
```

## When Not to Use Windowing

Windowing isn't always the right solution:

- **Small lists** (< 50 items): The complexity usually isn't worth it
- **Lists with complex interactions**: Drag-and-drop, multi-selection across large ranges
- **When you need all items in DOM**: Some third-party libraries expect all elements to be present
- **SEO-critical content**: Search engines can't index virtualized content

## Next Steps
