---
title: Key Stability in Lists
description: >-
  Master keys to keep state, focus, and animations intact—no more mysterious
  remounts or janky list updates.
date: 2025-09-06T21:53:48.824Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - keys
  - lists
---

You've probably seen the warning: "Each child in a list should have a unique 'key' prop." Maybe you've even thrown in some `Math.random()` keys to make it go away (we've all been there). But keys aren't just about silencing warnings—they're about keeping your UI stable, performant, and predictable when lists change. Get them wrong, and you'll see mysterious component remounts, lost focus, broken animations, and performance issues that'll make you question your life choices.

Keys tell React which list items are which across renders. When your list changes—items added, removed, reordered—React uses keys to efficiently update the DOM and preserve component state where it should be preserved. Think of keys as React's way of saying "this TodoItem component represents the same todo as before, just update its props" instead of "tear down this component and create a brand new one."

## The Problem: Unstable Keys

Let's start with what **not** to do. Here's a seemingly innocent todo list that'll bite you:

```tsx
// ❌ Bad: Using array indices as keys
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}

// ❌ Worse: Random keys
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={Math.random()} todo={todo} />
      ))}
    </ul>
  );
}
```

What happens when you add an item to the beginning of this list? Let's trace through it:

**Before adding:**

- Item A has key `0`
- Item B has key `1`
- Item C has key `2`

**After adding Item D at the beginning:**

- Item D has key `0` (was Item A's key!)
- Item A has key `1` (was Item B's key!)
- Item B has key `2` (was Item C's key!)
- Item C has key `3` (new key)

React sees this and thinks "the item at position 0 changed from A to D, position 1 changed from B to A," and so on. Instead of recognizing that we just inserted one new item, it thinks we changed three existing items and added one new item. The result? Unnecessary re-renders, lost component state, and poor performance.

## Real-World Consequences

Here's a concrete example of where unstable keys cause Real World Problems™:

```tsx
function EditableTodoItem({ todo }: { todo: Todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.text);

  return (
    <li>
      {isEditing ? (
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
        />
      ) : (
        <span onClick={() => setIsEditing(true)}>{todo.text}</span>
      )}
    </li>
  );
}
```

With index-based keys:

1. User clicks on "Buy groceries" (index 2) to edit it
2. Component state: `isEditing: true`, `editValue: "Buy groceries"`
3. Another user adds "Walk the dog" at the beginning of the list
4. "Buy groceries" now has index 3, but React thinks index 2 is a different item
5. The editing state gets applied to the wrong todo item
6. User loses their edit progress and is now editing a completely different item

This isn't theoretical—it's the kind of bug that makes users think your app is broken.

## The Solution: Stable, Unique Keys

The fix is straightforward: use stable, unique identifiers as keys. If your data has IDs (and it should), use them:

```tsx
// ✅ Good: Using stable, unique IDs
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

Now when you add, remove, or reorder items:

- Each component keeps its identity
- State is preserved where it should be
- Focus remains on the correct element
- Animations work smoothly
- React can efficiently update only what actually changed

### When You Don't Have IDs

Sometimes your data doesn't come with unique IDs. Here are your options, ranked from best to worst:

```tsx
// ✅ Generate stable IDs when creating items
const [todos, setTodos] = useState<Todo[]>([]);

const addTodo = (text: string) => {
  const newTodo = {
    id: crypto.randomUUID(), // or Date.now(), or your favorite ID generator
    text,
    completed: false,
  };
  setTodos((prev) => [...prev, newTodo]);
};

// ⚠️ Acceptable: Use a stable property that's unique
function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.map((user) => (
        <UserItem key={user.email} user={user} /> // Only if email is unique!
      ))}
    </ul>
  );
}

// ⚠️ Sometimes necessary: Combine properties to ensure uniqueness
function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <ul>
      {comments.map((comment) => (
        <CommentItem key={`${comment.userId}-${comment.timestamp}`} comment={comment} />
      ))}
    </ul>
  );
}
```

## Keys and Component State Preservation

Keys control when React preserves component state and when it creates fresh instances. This is crucial for components with internal state:

```tsx
function TabPanel({ activeTab }: { activeTab: string }) {
  return (
    <div>
      {activeTab === 'profile' && <ProfileForm key="profile" />}
      {activeTab === 'settings' && <SettingsForm key="settings" />}
      {activeTab === 'billing' && <BillingForm key="billing" />}
    </div>
  );
}

function ProfileForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  // This state is preserved when switching tabs and coming back
  // because the key stays the same ('profile')

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Name"
      />
      {/* More form fields... */}
    </form>
  );
}
```

Without stable keys, switching tabs would reset form state every time. With stable keys, React knows to reuse the same component instance.

## Keys and Performance

Stable keys aren't just about correctness—they're a performance optimization. React's reconciliation algorithm uses keys to:

1. **Identify moved elements**: Instead of removing and recreating, React can move DOM nodes
2. **Minimize DOM mutations**: Only changed elements get updated
3. **Preserve expensive computations**: Component state and effects don't reset unnecessarily

Here's a performance comparison:

```tsx
// ❌ Bad: Index keys cause unnecessary work
function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <ExpensiveItem key={index} item={item} />
      ))}
    </ul>
  );
}

function ExpensiveItem({ item }: { item: Item }) {
  // Expensive computation that happens in useEffect
  const [processedData, setProcessedData] = useState(null);

  useEffect(() => {
    // This runs every time the component mounts
    const result = expensiveDataProcessing(item.data);
    setProcessedData(result);
  }, [item.data]);

  return <li>{/* Render processed data */}</li>;
}
```

With index keys, adding an item at the beginning causes every component to remount, re-running all the expensive computations. With stable keys, only the new item needs processing.

## Advanced Key Scenarios

### Nested Lists

When you have lists inside lists, each level needs its own stable keys:

```tsx
function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <div>
      {categories.map((category) => (
        <div key={category.id}>
          <h3>{category.name}</h3>
          <ul>
            {category.items.map((item) => (
              <li key={item.id}>{item.name}</li> // Different namespace
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

Keys only need to be unique among siblings, not globally. `item.id` can be the same across different categories.

### Dynamic Content Types

Sometimes your list contains different types of components:

```tsx
function FeedList({ posts }: { posts: Post[] }) {
  return (
    <div>
      {posts.map((post) => {
        // Key must be unique regardless of post type
        const key = post.id;

        switch (post.type) {
          case 'text':
            return <TextPost key={key} post={post} />;
          case 'image':
            return <ImagePost key={key} post={post} />;
          case 'video':
            return <VideoPost key={key} post={post} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
```

Even though the components are different types, they can share keys because they represent the same logical item.

### Conditional Rendering in Lists

Be careful with conditional rendering inside lists:

```tsx
// ❌ Bad: Key disappears when item.isVisible is false
function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (item.isVisible ? <ItemComponent key={item.id} item={item} /> : null))}
    </ul>
  );
}

// ✅ Better: Always render, control visibility with CSS/props
function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <ItemComponent key={item.id} item={item} hidden={!item.isVisible} />
      ))}
    </ul>
  );
}
```

When keys disappear and reappear, React treats them as new components, losing state and causing unnecessary remounts.

## Common Pitfalls and Solutions

### The "It Works on My Machine" Key

```tsx
// ❌ Dangerous: Works until you deploy to production
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <ul>
      {messages.map((message, index) => (
        <MessageItem key={`${message.userId}-${index}`} message={message} />
      ))}
    </ul>
  );
}
```

This looks fine, but what happens when messages get paginated or filtered? The same message could end up with different keys in different renders.

```tsx
// ✅ Solution: Use data that uniquely identifies the item
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <ul>
      {messages.map((message) => (
        <MessageItem
          key={message.id || `${message.userId}-${message.timestamp}`}
          message={message}
        />
      ))}
    </ul>
  );
}
```

### The Premature Optimization Key

```tsx
// ❌ Don't get too clever with keys
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((product, index) => (
        <ProductItem
          key={`${product.category}-${index}`} // Trying to be "smart"
          product={product}
        />
      ))}
    </ul>
  );
}
```

Just use the ID. Resist the urge to encode additional information into keys—that's what props are for.

## Testing Key Stability

You can catch key-related bugs with some targeted testing:

```tsx
// Test that demonstrates the importance of stable keys
test('preserves input focus when list items are reordered', async () => {
  const initialTodos = [
    { id: '1', text: 'First todo' },
    { id: '2', text: 'Second todo' },
    { id: '3', text: 'Third todo' },
  ];

  const { rerender } = render(<TodoList todos={initialTodos} />);

  // Focus on the second input
  const secondInput = screen.getByDisplayValue('Second todo');
  secondInput.focus();
  expect(secondInput).toHaveFocus();

  // Reorder the list
  const reorderedTodos = [
    { id: '2', text: 'Second todo' },
    { id: '1', text: 'First todo' },
    { id: '3', text: 'Third todo' },
  ];

  rerender(<TodoList todos={reorderedTodos} />);

  // Focus should remain on the same logical item
  const stillFocusedInput = screen.getByDisplayValue('Second todo');
  expect(stillFocusedInput).toHaveFocus();
});
```
