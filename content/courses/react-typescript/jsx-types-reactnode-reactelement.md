---
title: Typing Children and When to Use ReactNode
description: >-
  Children can be strings, elements, arrays—learn the correct types and helpers
  without guesswork.
date: 2025-09-06T22:23:57.264Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - children
  - reactnode
  - reactelement
  - jsx
---

Children in React can be almost anything: strings, numbers, JSX elements, arrays of elements, fragments, or even `null`. But when you're writing TypeScript, how do you type that `children` prop without breaking half your use cases or being overly permissive?

The secret lies in understanding three key types: `ReactNode`, `ReactElement`, and `JSX.Element`. They might look interchangeable, but choosing the wrong one will either break your component's flexibility or give consumers confusing type errors. Once you understand their hierarchy and purpose, you'll never second-guess children props again.

## The Big Picture

Before diving into the specifics, here's the mental model you need:

- **`ReactNode`**: Anything React can render (most permissive)
- **`ReactElement`**: The result of JSX expressions (middle ground)
- **`JSX.Element`**: TypeScript's specific representation of JSX (most restrictive)

Most of the time, you'll want `ReactNode` for children props and `ReactElement` or `JSX.Element` for component return types. But let's see why.

## ReactNode: The Swiss Army Knife

`ReactNode` is the most permissive type—it represents anything that React can render. This includes strings, numbers, elements, arrays, fragments, and even `null` or `undefined`.

```ts
type ReactNode =
  | ReactElement
  | string
  | number
  | Iterable<ReactNode>
  | ReactPortal
  | boolean
  | null
  | undefined;
```

This makes it perfect for typing `children` props, since parents often need to accept a wide variety of content:

```tsx
// ✅ Good: ReactNode accepts anything renderable
interface CardProps {
  children: ReactNode;
}

function Card({ children }: CardProps) {
  return <div className="card">{children}</div>;
}

// All of these work:
<Card>Hello world</Card>
<Card>{42}</Card>
<Card><Button>Click me</Button></Card>
<Card>{[<span key="1">Item 1</span>, <span key="2">Item 2</span>]}</Card>
<Card>{null}</Card>
```

Compare this with the more restrictive alternatives:

```tsx
// ❌ Too restrictive: only accepts JSX elements
interface CardProps {
  children: ReactElement;
}

function Card({ children }: CardProps) {
  return <div className="card">{children}</div>;
}

// Type errors!
<Card>Hello world</Card> // ❌ string not assignable to ReactElement
<Card>{42}</Card>         // ❌ number not assignable to ReactElement
<Card>{null}</Card>       // ❌ null not assignable to ReactElement
```

> [!TIP]
> When in doubt about children props, use `ReactNode`. It gives component consumers maximum flexibility while still ensuring type safety.

## Children Patterns in the Wild

Now that you understand `ReactNode`, let's look at the most common children patterns you'll encounter and how to type them properly.

### The Basic Container

Most wrapper components need to accept any renderable content:

```tsx
interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className }: CardProps) {
  return (
    <div className={`card ${className || ''}`}>
      {children}
    </div>
  );
}

// All of these just work:
<Card>Simple text</Card>
<Card><h1>Title</h1><p>Content</p></Card>
<Card>{user ? <Profile user={user} /> : 'Please log in'}</Card>
<Card>{items.map(item => <Item key={item.id} item={item} />)}</Card>
```

### Optional Children

Sometimes children are optional, and you want to conditionally render wrapper elements:

```tsx
interface SectionProps {
  title: string;
  children?: ReactNode; // Optional children
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h2>{title}</h2>
      {children && <div className="content">{children}</div>}
    </section>
  );
}

// Both of these work:
<Section title="Empty section" />
<Section title="With content">
  <p>Some content here</p>
</Section>
```

### Multiple Children Slots

Modern React patterns often use multiple "slots" for different types of content:

```tsx
interface LayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

function Layout({ header, sidebar, children, footer }: LayoutProps) {
  return (
    <div className="layout">
      <header>{header}</header>
      <div className="main">
        <aside>{sidebar}</aside>
        <main>{children}</main>
      </div>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

// Usage allows maximum flexibility:
<Layout
  header={<Navigation />}
  sidebar="Simple text sidebar"
  footer={null} // Explicitly no footer
>
  <Article />
</Layout>;
```

### Render Props with Children

When you're building components that use render props, `ReactNode` keeps things flexible:

```tsx
interface DataFetcherProps {
  url: string;
  children: (data: any, loading: boolean) => ReactNode;
}

function DataFetcher({ url, children }: DataFetcherProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [url]);

  return <>{children(data, loading)}</>;
}

// The render function can return anything renderable:
<DataFetcher url="/api/users">
  {(users, loading) => {
    if (loading) return 'Loading...';
    if (!users) return null;
    return users.map((user) => <UserCard key={user.id} user={user} />);
  }}
</DataFetcher>;
```

### Conditional Children Rendering

One of the most common patterns is conditionally rendering children based on state:

```tsx
interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible">
      <button onClick={() => setIsOpen(!isOpen)}>
        {title} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

// Works with any content that might be conditionally hidden:
<Collapsible title="Advanced Options">
  <form>
    <input type="text" placeholder="Advanced setting" />
    <button type="submit">Save</button>
  </form>
</Collapsible>;
```

## Working with Children: React's Helper Functions

When you need to manipulate or inspect children, React provides several utility functions. Here's how to use them with proper TypeScript typing:

### React.Children.map

When you need to transform each child element:

```tsx
import { ReactNode, cloneElement, isValidElement } from 'react';

interface WrapperProps {
  children: ReactNode;
}

function AddClassToChildren({ children }: WrapperProps) {
  return (
    <div>
      {React.Children.map(children, (child, index) => {
        // Type guard to ensure we have a valid React element
        if (isValidElement(child)) {
          return cloneElement(child, {
            className: `${child.props.className || ''} wrapped-${index}`.trim(),
          });
        }
        // Return non-element children (strings, numbers) unchanged
        return child;
      })}
    </div>
  );
}
```

### React.Children.count

Count renderable children (ignores `null`, `undefined`, and booleans):

```tsx
interface ListProps {
  children: ReactNode;
  showCount?: boolean;
}

function List({ children, showCount }: ListProps) {
  const count = React.Children.count(children);

  return (
    <ul>
      {showCount && <li className="count">Total items: {count}</li>}
      {React.Children.map(children, (child, index) => (
        <li key={index}>{child}</li>
      ))}
    </ul>
  );
}
```

### React.Children.only

When you need exactly one child element:

```tsx
interface SingleChildProps {
  children: ReactNode;
}

function SingleChildWrapper({ children }: SingleChildProps) {
  // This will throw if children is not exactly one element
  const singleChild = React.Children.only(children);

  if (isValidElement(singleChild)) {
    return cloneElement(singleChild, {
      className: `${singleChild.props.className || ''} enhanced`.trim()
    });
  }

  return singleChild;
}

// ✅ Works:
<SingleChildWrapper>
  <Button>Click me</Button>
</SingleChildWrapper>

// ❌ Throws error (multiple children):
<SingleChildWrapper>
  <Button>One</Button>
  <Button>Two</Button>
</SingleChildWrapper>
```

### Type Guards for Children

Sometimes you need to differentiate between different types of children:

```tsx
function isReactElement(child: ReactNode): child is ReactElement {
  return isValidElement(child);
}

function isStringChild(child: ReactNode): child is string {
  return typeof child === 'string';
}

interface SmartListProps {
  children: ReactNode;
}

function SmartList({ children }: SmartListProps) {
  return (
    <ul>
      {React.Children.map(children, (child, index) => {
        if (isStringChild(child)) {
          return (
            <li key={index} className="text-item">
              {child}
            </li>
          );
        }

        if (isReactElement(child)) {
          return (
            <li key={index} className="element-item">
              {child}
            </li>
          );
        }

        // Handle other types (numbers, etc.)
        return (
          <li key={index} className="other-item">
            {String(child)}
          </li>
        );
      })}
    </ul>
  );
}
```

> [!WARNING]
> Be careful with `React.Children.only`—it throws an error if you don't have exactly one child. Always use it when you specifically need that constraint, not as a general children handler.

## ReactElement: The JSX Result

`ReactElement` represents the objects that JSX expressions create—the virtual DOM nodes that React uses internally. It's more specific than `ReactNode` but more flexible than `JSX.Element`.

```ts
interface ReactElement<
  P = any,
  T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>,
> {
  type: T;
  props: P;
  key: Key | null;
}
```

You'll typically use `ReactElement` when you need to ensure you're getting an actual element (not a string or number), but you want to accept any kind of element:

```tsx
interface IconButtonProps {
  icon: ReactElement;
  label: string;
}

function IconButton({ icon, label }: IconButtonProps) {
  return (
    <button>
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ✅ Works with any JSX element
<IconButton icon={<HomeIcon />} label="Home" />
<IconButton icon={<div>📁</div>} label="Folder" />

// ❌ Doesn't work with strings or numbers
<IconButton icon="🏠" label="Home" /> // Type error
```

This is particularly useful for component slots or when you need to clone or manipulate elements:

```tsx
interface ModalProps {
  trigger: ReactElement;
  children: ReactNode;
}

function Modal({ trigger, children }: ModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // We can clone the trigger and add props because it's a ReactElement
  const triggerWithClick = cloneElement(trigger, {
    onClick: () => setIsOpen(true),
  });

  return (
    <>
      {triggerWithClick}
      {isOpen && (
        <div className="modal">
          {children}
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}

// Usage:
<Modal trigger={<Button>Open Modal</Button>}>
  <p>Modal content here</p>
</Modal>;
```

## ReactElement vs JSX.Element vs ReactNode: The Complete Picture

Now that you understand the basics, let's dive deeper into when and why you'd choose each type. These three types form a hierarchy, and knowing their exact differences will make you a TypeScript React power user.

### JSX.Element: TypeScript's Take

`JSX.Element` is TypeScript's specific type for JSX expressions. It's essentially an alias for `ReactElement<any, any>`, but it's what TypeScript infers when you write JSX:

```tsx
// TypeScript infers JSX.Element for these expressions:
const element1 = <div>Hello</div>; // JSX.Element
const element2 = <Button>Click</Button>; // JSX.Element
```

The key insight: `JSX.Element` is TypeScript's representation, while `ReactElement` is React's. They're nearly identical, but `JSX.Element` has a crucial limitation:

```tsx
// JSX.Element is always ReactElement<any, any>
type JSXElement = ReactElement<any, any>;

// This means JSX.Element loses generic type information:
function createTypedElement(): ReactElement<{ label: string }> {
  return <button>Click</button>; // Preserves prop types
}

function createJSXElement(): JSX.Element {
  return <button>Click</button>; // Props become 'any'
}
```

### ReactElement: The Middle Ground

`ReactElement` represents the objects that JSX expressions create—the virtual DOM nodes that React uses internally. It's more specific than `ReactNode` but more flexible than `JSX.Element`:

```tsx
interface ReactElement<
  P = any,
  T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>,
> {
  type: T;
  props: P;
  key: Key | null;
}

// ReactElement can preserve type information
const typedElement: ReactElement<ButtonProps> = <Button variant="primary">Click</Button>;

// You can extract props from a ReactElement
type ExtractedProps = typeof typedElement.props; // ButtonProps
```

### The Type Hierarchy

Here's the critical relationship to understand:

```tsx
// ReactNode is the superset of everything React can render
type ReactNode =
  | ReactElement // ← This includes JSX.Element
  | string
  | number
  | Iterable<ReactNode>
  | ReactPortal
  | boolean
  | null
  | undefined;

// JSX.Element is a specific ReactElement
type JSXElement = ReactElement<any, any>;

// The hierarchy:
// ReactNode > ReactElement > JSX.Element
```

### When to Use Each: A Decision Tree

```tsx
// Question 1: Are you typing children props?
// → Use ReactNode (99% of cases)
interface ContainerProps {
  children: ReactNode; // ✅ Maximum flexibility
}

// Question 2: Do you need to clone or inspect the element?
// → Use ReactElement
interface ModalProps {
  trigger: ReactElement; // ✅ Can clone and add props
  children: ReactNode; // ✅ Just rendering
}

function Modal({ trigger, children }: ModalProps) {
  // Can safely clone because trigger is ReactElement
  const enhancedTrigger = cloneElement(trigger, {
    onClick: () => setOpen(true),
  });

  return (
    <>
      {enhancedTrigger}
      {children}
    </>
  );
}

// Question 3: Are you constraining return types?
// → Let TypeScript infer or use ReactNode for conditionals
function ConditionalComponent({ show }: { show: boolean }): ReactNode {
  if (!show) return null; // ✅ ReactNode allows null
  return <div>Content</div>;
}

// Question 4: Do you need specific prop types preserved?
// → Use ReactElement with generics
function processElement(element: ReactElement<{ className?: string }>) {
  // TypeScript knows element.props has className
  const className = element.props.className || 'default';
  return cloneElement(element, { className: `${className} processed` });
}
```

### Real-World Example: Type-Safe Component Slots

Here's a pattern that shows the practical differences:

````tsx
interface LayoutProps {
  // ReactNode: Just render as-is
  header: ReactNode;
  footer: ReactNode;

  // ReactElement: Need to manipulate
  sidebar: ReactElement;

  // Specific ReactElement: Type-safe props
  navigation: ReactElement<{ isActive?: boolean }>;

  // Main content
  children: ReactNode;
}

function Layout({ header, footer, sidebar, navigation, children }: LayoutProps) {
  // Can render ReactNode directly
  const headerContent = header; // Could be string, element, null, etc.

  // Can clone and enhance ReactElement
  const enhancedSidebar = cloneElement(sidebar, {
    className: 'layout-sidebar'
  });

  // Can access specific props on typed ReactElement
  const navWithHighlight = cloneElement(navigation, {
    isActive: true,
    className: navigation.props.isActive ? 'nav-active' : 'nav'
  });

  return (
    <div>
      <header>{headerContent}</header>
      <nav>{navWithHighlight}</nav>
      <aside>{enhancedSidebar}</aside>
      <main>{children}</main>
      <footer>{footer}</footer>
    </div>
  );
}

## The Building Blocks: ReactChild, ReactFragment, and ReactPortal

While `ReactNode` is the umbrella type for everything React can render, it's actually composed of several more specific types. Understanding these building blocks helps you write more precise types when needed and debug type errors more effectively.

### ReactChild: The Simple Renderable

`ReactChild` represents the simplest things React can render—individual primitive values or elements:

```tsx
// ReactChild is a union of the basic renderable units
type ReactChild = ReactElement | string | number;

// These are all valid ReactChild values:
const textChild: ReactChild = "Hello World";
const numberChild: ReactChild = 42;
const elementChild: ReactChild = <div>Content</div>;

// But these are NOT ReactChild:
const nullChild: ReactChild = null;        // ❌ Not included
const arrayChild: ReactChild = [1, 2, 3];  // ❌ Arrays not included
const boolChild: ReactChild = true;        // ❌ Booleans not included
````

> [!NOTE]
> `ReactChild` is deprecated in newer React types. You should use `ReactNode` or be more specific with `ReactElement | string | number` instead.

### ReactFragment: Arrays and Keyed Children

`ReactFragment` represents React's ability to render multiple children without a wrapper element:

```tsx
// ReactFragment represents grouped children
type ReactFragment = Iterable<ReactNode>;

// Using fragments in practice
function ItemList({ items }: { items: string[] }) {
  // Explicit fragment with key
  return (
    <>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <dt>{item}</dt>
          <dd>Description of {item}</dd>
        </React.Fragment>
      ))}
    </>
  );
}

// ReactFragment in component props
interface ListProps {
  // When you specifically need an array of nodes
  items: ReactFragment;
  // vs ReactNode which could be a single item
  header: ReactNode;
}

function List({ items, header }: ListProps) {
  return (
    <div>
      <h2>{header}</h2>
      <ul>
        {React.Children.map(items, (item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

The key difference: `ReactFragment` is specifically for collections, while `ReactNode` can be a single item or a collection:

```tsx
// ReactNode: Single item OR array
const node1: ReactNode = 'Single string';
const node2: ReactNode = ['Array', 'of', 'strings'];

// ReactFragment: Always represents a collection
const fragment1: ReactFragment = ['Array', 'of', 'items'];
const fragment2: ReactFragment = new Set([1, 2, 3]); // Any iterable works
```

### ReactPortal: Rendering Outside the Tree

`ReactPortal` is the type returned by `ReactDOM.createPortal`, allowing you to render children into a different DOM subtree:

```tsx
import { createPortal } from 'react-dom';
import type { ReactPortal, ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
}

function Modal({ children, isOpen }: ModalProps): ReactPortal | null {
  if (!isOpen) return null;

  // createPortal returns a ReactPortal
  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content">{children}</div>
    </div>,
    document.getElementById('modal-root')!,
  );
}

// When you need to type portal-specific behavior
function PortalManager({ portals }: { portals: ReactPortal[] }) {
  // ReactPortal has specific properties
  return (
    <>
      {portals.map((portal) => {
        // Each portal has key, children, containerInfo
        console.log('Portal container:', portal.containerInfo);
        return portal;
      })}
    </>
  );
}
```

### Understanding the Complete ReactNode Union

Now you can see how `ReactNode` is built from these pieces:

```tsx
// The full ReactNode type decomposed
type ReactNode =
  | ReactElement     // JSX elements
  | string          // Text nodes
  | number          // Numeric values
  | Iterable<ReactNode>  // Arrays and fragments (includes ReactFragment)
  | ReactPortal     // Portal nodes
  | boolean         // Conditionals (rendered as nothing)
  | null            // Absence of content
  | undefined;      // Undefined values

// This is why ReactNode is so flexible:
function FlexibleComponent({ content }: { content: ReactNode }) {
  // content could be ANY of the above types
  return <div>{content}</div>;
}

// All of these work:
<FlexibleComponent content="text" />
<FlexibleComponent content={42} />
<FlexibleComponent content={<span>element</span>} />
<FlexibleComponent content={[1, 2, 3]} />
<FlexibleComponent content={createPortal(<div />, document.body)} />
<FlexibleComponent content={null} />
<FlexibleComponent content={true && <div>Conditional</div>} />
```

### When to Use These Specific Types

While you'll use `ReactNode` 95% of the time, knowing these specific types helps in certain scenarios:

```tsx
// When you're building a table and need pairs
interface TableRowProps {
  // Ensures we get an array, not a single element
  cells: ReactFragment;
}

// When handling portal-specific logic
interface OverlayManagerProps {
  // Specifically portal elements
  overlays: ReactPortal[];
  // Regular children
  children: ReactNode;
}

// When you need to exclude certain types
type TextOnly = Extract<ReactNode, string | number>;

interface TextDisplayProps {
  // Only accepts text or numbers, not elements
  content: TextOnly;
}

function TextDisplay({ content }: TextDisplayProps) {
  // TypeScript knows content is string | number
  return <span className="text-only">{String(content)}</span>;
}
```

> [!TIP]
> In practice, stick with `ReactNode` unless you have a specific reason to be more restrictive. The specific types are mainly useful for library authors or when building highly specialized components.

## Real-World Guidelines

Here's how to choose between these types in common scenarios:

### Children Props: Almost Always ReactNode

```tsx
// ✅ Good: Flexible children prop
interface Props {
  children: ReactNode;
}

// ❌ Too restrictive for most use cases
interface Props {
  children: ReactElement;
}
```

### Render Props: Usually ReactNode

```tsx
interface Props {
  renderHeader: () => ReactNode; // ✅ Flexible
  renderFooter: () => JSX.Element; // ❌ Too restrictive
}

function Layout({ renderHeader, renderFooter }: Props) {
  return (
    <div>
      <header>{renderHeader()}</header>
      <main>Content</main>
      <footer>{renderFooter()}</footer>
    </div>
  );
}

// With ReactNode, both of these work:
<Layout
  renderHeader={() => 'Simple string header'}
  renderFooter={() => <div>Complex footer</div>}
/>;
```

### Element Props: ReactElement When You Need Manipulation

```tsx
interface Props {
  // Use ReactElement when you need to clone or inspect the element
  trigger: ReactElement;
  // Use ReactNode when you just need to render it
  icon: ReactNode;
}

function Dropdown({ trigger, icon }: Props) {
  // Can clone trigger because it's guaranteed to be an element
  const enhancedTrigger = cloneElement(trigger, {
    'aria-expanded': isOpen,
  });

  return (
    <div>
      {icon} {/* Just render the icon */}
      {enhancedTrigger}
    </div>
  );
}
```

### Component Return Types: Let TypeScript Infer

```tsx
// ✅ Let TypeScript infer JSX.Element
function Button() {
  return <button>Click me</button>;
}

// ⚠️ Explicit typing usually unnecessary
function Button(): JSX.Element {
  return <button>Click me</button>;
}

// ✅ Explicit typing when returning conditional content
function ConditionalButton({ show }: { show: boolean }): ReactNode {
  if (!show) return null;
  return <button>Click me</button>;
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Using ReactElement for Children

```tsx
// ❌ This breaks with strings, numbers, arrays
interface Props {
  children: ReactElement;
}

// ✅ Use ReactNode instead
interface Props {
  children: ReactNode;
}
```

### Pitfall 2: Forgetting About Conditional Rendering

```tsx
// ❌ This can return null, but JSX.Element doesn't allow it
function ConditionalComponent({ show }: { show: boolean }): JSX.Element {
  if (!show) return null; // Type error!
  return <div>Visible</div>;
}

// ✅ Use ReactNode for conditional rendering
function ConditionalComponent({ show }: { show: boolean }): ReactNode {
  if (!show) return null;
  return <div>Visible</div>;
}
```

### Pitfall 3: Over-Constraining Render Functions

```tsx
// ❌ Too restrictive—breaks with conditional rendering
interface Props {
  renderItem: (item: Item) => JSX.Element;
}

// ✅ More flexible
interface Props {
  renderItem: (item: Item) => ReactNode;
}
```

## The Children Typing Decision Tree

Here's your go-to guide for typing children and related props:

**For children props (95% of cases):**

```tsx
// ✅ Almost always correct
interface Props {
  children: ReactNode;
}
```

**When children are optional:**

```tsx
// ✅ Use optional ReactNode
interface Props {
  children?: ReactNode;
}
```

**When you need to manipulate children:**

```tsx
// ✅ Use ReactNode, then type-guard with isValidElement
interface Props {
  children: ReactNode;
}

function MyComponent({ children }: Props) {
  return React.Children.map(children, (child) => {
    if (isValidElement(child)) {
      // Now you can safely use cloneElement, etc.
      return cloneElement(child, {
        /* additional props */
      });
    }
    return child;
  });
}
```

**For render prop functions:**

```tsx
// ✅ Return ReactNode for maximum flexibility
interface Props {
  render: (data: Data) => ReactNode;
}
```

**For element-specific props (rare):**

```tsx
// ✅ Only when you specifically need an element
interface Props {
  trigger: ReactElement; // Will be cloned/enhanced
  children: ReactNode; // Will be rendered as-is
}
```

## The Bottom Line

When typing children, think in this order:

1. **Start with `ReactNode`** — it handles 95% of use cases correctly
2. **Consider `ReactElement`** only when you need to manipulate the element (clone, inspect props, etc.)
3. **Avoid `JSX.Element`** for children — it's too restrictive and doesn't add value

The React ecosystem is built on flexibility and composition. Your typing should reflect that philosophy. When you use `ReactNode` for children, you're allowing consumers to pass strings, elements, arrays, conditional content, or even `null`—exactly what React was designed to handle.

Don't overthink it: if it's called `children` and goes between JSX tags, type it as `ReactNode`. Your future self (and your component's users) will thank you for the flexibility.
