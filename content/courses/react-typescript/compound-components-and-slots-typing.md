---
title: Typing Compound Components and Slots
description: Model parent-child relationships—Menu, Tabs, and List components with typed items and slot props.
date: 2025-09-06T22:04:45.015Z
modified: 2025-09-06T22:04:45.015Z
published: true
tags: ['react', 'typescript', 'compound-components', 'slots', 'composition', 'patterns']
---

Compound components are one of React's most elegant patterns—they let you compose UIs where multiple components work together seamlessly (think `<select>` and `<option>`, but you get to design the API). When you add TypeScript to the mix, you can create type-safe relationships between parent and child components that prevent runtime errors and provide excellent developer experience. Let's explore how to build Menu, Tabs, and List components that are both flexible and bulletproof.

The key insight with compound components is that the parent component manages shared state while child components handle their own rendering logic. TypeScript helps us ensure that these relationships are correctly modeled and that data flows between components in predictable ways.

## Understanding Compound Components

Before diving into the TypeScript specifics, let's establish what makes a compound component. At its core, it's a group of components designed to work together, where:

- The parent component manages shared state and context
- Child components receive props and context to render appropriately
- The API feels intuitive and declarative to consumers

Here's a simple compound component pattern without TypeScript:

```jsx
// ❌ No type safety
function Menu({ children }) {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div role="menu">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          selectedId,
          onSelect: setSelectedId,
        }),
      )}
    </div>
  );
}

function MenuItem({ id, children, selectedId, onSelect }) {
  return (
    <button
      role="menuitem"
      className={selectedId === id ? 'selected' : ''}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}
```

This works, but there's no type safety. The parent could pass anything to children, children might not receive the props they expect, and we have no guarantees about the shape of our data. Let's fix that.

## Building a Type-Safe Menu Component

Let's start with a Menu component that demonstrates the core concepts. We want to ensure that MenuItem components receive the correct props and that the Menu can only contain valid children.

```ts
import React, { useState, createContext, useContext } from 'react';

// First, define the shape of our menu item data
interface MenuItemData {
  id: string;
  label: string;
  disabled?: boolean;
}

// Context for sharing state between Menu and MenuItem
interface MenuContextValue {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

// Custom hook to access menu context with proper error handling
function useMenuContext() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('MenuItem must be used within a Menu component');
  }
  return context;
}

// Props for the Menu component
interface MenuProps {
  children: React.ReactNode;
  onSelectionChange?: (selectedId: string | null) => void;
  defaultSelected?: string;
}

export function Menu({
  children,
  onSelectionChange,
  defaultSelected = null
}: MenuProps) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectionChange?.(id);
  };

  const contextValue: MenuContextValue = {
    selectedId,
    onSelect: handleSelect,
  };

  return (
    <MenuContext.Provider value={contextValue}>
      <div role="menu" className="menu">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

// Props for MenuItem - notice we don't need selectedId or onSelect
// because they come from context
interface MenuItemProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function MenuItem({ id, disabled = false, children }: MenuItemProps) {
  const { selectedId, onSelect } = useMenuContext();

  return (
    <button
      role="menuitem"
      disabled={disabled}
      className={`menu-item ${selectedId === id ? 'selected' : ''}`}
      onClick={() => !disabled && onSelect(id)}
    >
      {children}
    </button>
  );
}

// Attach MenuItem to Menu for dot notation access
Menu.Item = MenuItem;
```

Now we can use our type-safe Menu:

```tsx
function App() {
  return (
    <Menu onSelectionChange={(id) => console.log('Selected:', id)}>
      <Menu.Item id="file">File</Menu.Item>
      <Menu.Item id="edit">Edit</Menu.Item>
      <Menu.Item id="view" disabled>
        View
      </Menu.Item>
    </Menu>
  );
}
```

> [!NOTE]
> Using React Context eliminates the need for `React.cloneElement`, which can be problematic with TypeScript and doesn't preserve ref forwarding.

## Advanced Menu with Slot Props

Sometimes you want more control over rendering. Let's extend our Menu to support render props (also known as "slot props" in some frameworks):

```ts
// Extended MenuItem that supports custom rendering
interface MenuItemRenderProps {
  isSelected: boolean;
  isDisabled: boolean;
  select: () => void;
}

interface MenuItemSlotProps extends Omit<MenuItemProps, 'children'> {
  children: (props: MenuItemRenderProps) => React.ReactNode;
}

function MenuItemSlot({ id, disabled = false, children }: MenuItemSlotProps) {
  const { selectedId, onSelect } = useMenuContext();

  const renderProps: MenuItemRenderProps = {
    isSelected: selectedId === id,
    isDisabled: disabled,
    select: () => !disabled && onSelect(id),
  };

  return (
    <div className="menu-item-slot">
      {children(renderProps)}
    </div>
  );
}

Menu.ItemSlot = MenuItemSlot;
```

Now you can use render props for complete control:

```tsx
<Menu>
  <Menu.ItemSlot id="custom">
    {({ isSelected, isDisabled, select }) => (
      <div className={`custom-item ${isSelected ? 'active' : ''}`} onClick={select}>
        <Icon name="star" />
        Custom Item
        {isSelected && <Badge>Selected</Badge>}
      </div>
    )}
  </Menu.ItemSlot>
</Menu>
```

## Building Type-Safe Tab Components

Tabs are another excellent use case for compound components. Let's build a flexible Tab system:

```ts
interface TabData {
  id: string;
  title: string;
  disabled?: boolean;
}

interface TabContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  tabs: TabData[];
  registerTab: (tab: TabData) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('Tab components must be used within a TabContainer');
  }
  return context;
}

interface TabContainerProps {
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
}

export function TabContainer({
  defaultTab,
  onTabChange,
  children
}: TabContainerProps) {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTab, setActiveTab] = useState<string>(defaultTab || '');

  const registerTab = (tab: TabData) => {
    setTabs(current => {
      const exists = current.some(t => t.id === tab.id);
      if (exists) return current;
      return [...current, tab];
    });

    // Set as active if it's the first tab or matches defaultTab
    if (!activeTab || tab.id === defaultTab) {
      setActiveTab(tab.id);
    }
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    onTabChange?.(id);
  };

  const contextValue: TabContextValue = {
    activeTab,
    setActiveTab: handleTabChange,
    tabs,
    registerTab,
  };

  return (
    <TabContext.Provider value={contextValue}>
      <div className="tab-container">
        {children}
      </div>
    </TabContext.Provider>
  );
}

// TabList renders the actual tab buttons
function TabList() {
  const { tabs, activeTab, setActiveTab } = useTabContext();

  return (
    <div className="tab-list" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          disabled={tab.disabled}
          aria-selected={activeTab === tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => !tab.disabled && setActiveTab(tab.id)}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function TabPanel({ id, title, disabled = false, children }: TabPanelProps) {
  const { activeTab, registerTab } = useTabContext();

  // Register this tab on mount
  React.useEffect(() => {
    registerTab({ id, title, disabled });
  }, [id, title, disabled, registerTab]);

  if (activeTab !== id) return null;

  return (
    <div role="tabpanel" className="tab-panel" aria-labelledby={id}>
      {children}
    </div>
  );
}

TabContainer.List = TabList;
TabContainer.Panel = TabPanel;
```

Usage is clean and declarative:

```tsx
function App() {
  return (
    <TabContainer defaultTab="profile" onTabChange={(id) => console.log(id)}>
      <TabContainer.List />

      <TabContainer.Panel id="profile" title="Profile">
        <ProfileForm />
      </TabContainer.Panel>

      <TabContainer.Panel id="settings" title="Settings">
        <SettingsPanel />
      </TabContainer.Panel>

      <TabContainer.Panel id="billing" title="Billing" disabled>
        <BillingInfo />
      </TabContainer.Panel>
    </TabContainer>
  );
}
```

> [!TIP]
> Notice how TabPanel automatically registers itself with the container. This prevents the common issue of forgetting to add a tab to the tab list.

## Generic List Components with Item Constraints

For our final example, let's build a generic List component that can work with any type of data while maintaining type safety:

```ts
// Generic interface for list items
interface ListItem {
  id: string;
}

interface ListContextValue<T extends ListItem> {
  items: T[];
  selectedIds: Set<string>;
  onToggleItem: (id: string) => void;
  multiSelect: boolean;
}

const ListContext = createContext<ListContextValue<any> | null>(null);

function useListContext<T extends ListItem>() {
  const context = useContext(ListContext) as ListContextValue<T> | null;
  if (!context) {
    throw new Error('List items must be used within a List component');
  }
  return context;
}

interface ListProps<T extends ListItem> {
  items: T[];
  multiSelect?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  children: (item: T) => React.ReactNode;
}

export function List<T extends ListItem>({
  items,
  multiSelect = false,
  onSelectionChange,
  children
}: ListProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const onToggleItem = (id: string) => {
    setSelectedIds(current => {
      const newSet = new Set(current);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!multiSelect) {
          newSet.clear();
        }
        newSet.add(id);
      }

      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  };

  const contextValue: ListContextValue<T> = {
    items,
    selectedIds,
    onToggleItem,
    multiSelect,
  };

  return (
    <ListContext.Provider value={contextValue}>
      <div className="list">
        {items.map((item) => (
          <div key={item.id} className="list-item-wrapper">
            {children(item)}
          </div>
        ))}
      </div>
    </ListContext.Provider>
  );
}

// Reusable ListItem component that works with any item type
interface ListItemProps<T extends ListItem> {
  item: T;
  children: (props: {
    item: T;
    isSelected: boolean;
    onToggle: () => void;
  }) => React.ReactNode;
}

function ListItem<T extends ListItem>({ item, children }: ListItemProps<T>) {
  const { selectedIds, onToggleItem } = useListContext<T>();

  return (
    <>
      {children({
        item,
        isSelected: selectedIds.has(item.id),
        onToggle: () => onToggleItem(item.id),
      })}
    </>
  );
}

List.Item = ListItem;
```

Now you can create type-safe lists for any data:

```tsx
interface User extends ListItem {
  id: string;
  name: string;
  email: string;
}

interface Product extends ListItem {
  id: string;
  title: string;
  price: number;
}

function UserList({ users }: { users: User[] }) {
  return (
    <List items={users} multiSelect>
      {(user) => (
        <List.Item item={user}>
          {({ item, isSelected, onToggle }) => (
            <div className={`user-card ${isSelected ? 'selected' : ''}`} onClick={onToggle}>
              <h3>{item.name}</h3>
              <p>{item.email}</p>
            </div>
          )}
        </List.Item>
      )}
    </List>
  );
}
```

> [!WARNING]
> Be careful with generic context. TypeScript can sometimes struggle with inference across component boundaries, so explicit type annotations might be needed.

## Common Pitfalls and Solutions

### Pitfall: Context Type Assertion Gone Wrong

```ts
// ❌ Bad: Unsafe type assertion
const context = useContext(SomeContext) as SomeContextValue;

// ✅ Good: Proper error handling
function useSomeContext() {
  const context = useContext(SomeContext);
  if (!context) {
    throw new Error('useSomeContext must be used within SomeProvider');
  }
  return context;
}
```

### Pitfall: Generic Components with Poor Inference

```ts
// ❌ Bad: TypeScript can't infer the type
<List items={products}>
  {(item) => <div>{item.title}</div>} // 'title' might not exist
</List>

// ✅ Good: Explicit type parameter when needed
<List<Product> items={products}>
  {(item) => <div>{item.title}</div>} // TypeScript knows item is Product
</List>
```

### Pitfall: Forgetting readonly for Props

```ts
// ❌ Bad: Arrays are mutable
interface ListProps<T> {
  items: T[];
}

// ✅ Good: Readonly arrays prevent accidental mutations
interface ListProps<T> {
  items: readonly T[];
}
```

## Performance Considerations

Compound components can sometimes create unnecessary re-renders. Here are some optimization strategies:

```ts
// ✅ Memoize context value to prevent unnecessary re-renders
export function Menu({ children, onSelectionChange }: MenuProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contextValue = useMemo((): MenuContextValue => ({
    selectedId,
    onSelect: (id: string) => {
      setSelectedId(id);
      onSelectionChange?.(id);
    },
  }), [selectedId, onSelectionChange]);

  return (
    <MenuContext.Provider value={contextValue}>
      {children}
    </MenuContext.Provider>
  );
}

// ✅ Memoize expensive child components
const MenuItem = memo(({ id, disabled = false, children }: MenuItemProps) => {
  const { selectedId, onSelect } = useMenuContext();
  // ... component logic
});
```

## Real-World Use Cases™

The patterns we've explored work particularly well for:

1. **Design System Components**: Building libraries where components need to work together seamlessly
2. **Form Builders**: Creating dynamic forms where field components share validation state
3. **Data Tables**: Where header, body, and pagination components need to coordinate
4. **Navigation Components**: Breadcrumbs, sidebars, and multi-level menus
5. **Modal Systems**: Where trigger, content, and action components work together

## Next Steps

You now have the tools to build robust compound components with TypeScript. Some areas to explore further:

- **Ref forwarding** with compound components using `forwardRef` and `useImperativeHandle`
- **Accessibility patterns** like managing focus and ARIA relationships
- **Advanced generic constraints** using mapped types and conditional types
- **Testing strategies** for compound components (hint: test behavior, not implementation)

Compound components with TypeScript give you the best of both worlds: flexible, reusable APIs that prevent runtime errors and provide excellent developer experience. Start with these patterns and adapt them to your specific use cases—your future self (and your teammates) will thank you.
