---
title: Story-Driven Development with TypeScript
description: Use Storybook as a type lab—derive controls from props, test edge cases, and publish typed stories.
date: 2025-09-06T22:04:45.042Z
modified: 2025-09-06T22:04:45.042Z
published: true
tags: ['react', 'typescript', 'storybook', 'story-driven-development', 'component-stories']
---

Storybook isn't just a component catalog—it's your TypeScript testing ground. When you pair Storybook with TypeScript, you get a powerful development environment where your types drive your component development, your stories validate edge cases, and your documentation stays perpetually in sync. Let's explore how to use Storybook as a "type lab" where your TypeScript definitions become living, interactive documentation.

## What Is Story-Driven Development?

Story-Driven Development is an approach where you write your Storybook stories alongside (or even before) your component implementation. Instead of building components in isolation and hoping they work together, you create stories that define the exact scenarios your components need to handle. When TypeScript enters the picture, your stories become type-safe contracts that ensure your components work correctly across all their intended use cases.

Think of it like test-driven development, but instead of writing tests first, you're writing interactive examples that serve as both documentation and validation. Your stories become executable specifications that are impossible to get out of sync with your actual component behavior.

## Setting Up the Foundation

Let's start with a typical React + TypeScript + Storybook setup. If you're starting fresh, Storybook's CLI will handle most of the heavy lifting:

```bash
npx storybook@latest init
```

This creates a `.storybook` folder with TypeScript-friendly defaults. The key file to pay attention to is `main.ts`:

```tsx
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: true, // Enable TypeScript checking
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript', // Extract prop types automatically
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};

export default config;
```

The `typescript.reactDocgen` setting is particularly important—it automatically extracts your TypeScript prop types and turns them into Storybook controls. No more manually defining what your component accepts!

## Creating Type-Safe Stories

Here's where things get interesting. Let's build a `Button` component and see how TypeScript makes our stories both more powerful and safer:

```tsx
// src/components/Button/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** The loading state of the button */
  isLoading?: boolean;
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <span className="mr-2 animate-spin">⏳</span>}
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

Now for the magic. Our story file becomes a type-safe exploration of every possible button state:

```tsx
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button, type ButtonProps } from './Button';

// This type ensures our meta configuration matches our component exactly
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  // These get auto-generated from our TypeScript props!
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
    isLoading: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    children: {
      control: { type: 'text' },
    },
  },
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;

// This ensures each story has the correct prop types
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Click me',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🚀</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  args: {
    leftIcon: '🚀',
    children: 'Launch',
    rightIcon: '→',
  },
};

export const LoadingStates: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button>Normal</Button>
      <Button isLoading>Loading...</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

// This story would cause a TypeScript error if we passed invalid props!
export const EdgeCases: Story = {
  render: () => (
    <div className="space-y-2">
      <Button variant="destructive" size="sm" disabled>
        Small Disabled Destructive
      </Button>
      <Button variant="ghost" isLoading leftIcon="⚠️">
        Loading Ghost with Icon
      </Button>
      <Button size="icon" variant="outline">
        👤
      </Button>
    </div>
  ),
};
```

Notice how TypeScript prevents us from creating stories with invalid prop combinations. Try to pass `variant="invalid"` and you'll get a compile error before you even load Storybook.

## Auto-Generated Controls from Types

Here's where the magic really happens. With `reactDocgen: 'react-docgen-typescript'` enabled, Storybook automatically creates controls for all your typed props. But we can make this even better by adding JSDoc comments to our props:

```tsx
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * The visual style variant of the button
   * @default "default"
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';

  /**
   * The size variant of the button
   * @default "default"
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';

  /**
   * Shows a loading spinner and disables the button
   * @default false
   */
  isLoading?: boolean;

  /**
   * Icon component to display before the button text
   * @example <Icon name="star" />
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon component to display after the button text
   * @example <Icon name="arrow-right" />
   */
  rightIcon?: React.ReactNode;
}
```

These JSDoc comments become documentation in Storybook's controls panel, and the `@default` values help Storybook understand your component's intended behavior.

## Testing Complex Component States

Real components often have complex interdependencies between props. Let's look at a more sophisticated example—a data table with TypeScript generics:

```tsx
// src/components/DataTable/DataTable.tsx
interface Column<T> {
  /** Unique identifier for the column */
  key: keyof T;
  /** Display header for the column */
  header: string;
  /** Custom render function for cell content */
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Column width as CSS value */
  width?: string;
}

interface DataTableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column configuration */
  columns: Column<T>[];
  /** Current sort configuration */
  sortConfig?: {
    key: keyof T;
    direction: 'asc' | 'desc';
  };
  /** Callback when sort changes */
  onSort?: (key: keyof T) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortConfig,
  onSort,
  isLoading,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  // Component implementation...
}
```

Creating stories for generic components requires a bit more setup, but TypeScript ensures we get it right:

```tsx
// src/components/DataTable/DataTable.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './DataTable';

// Define our test data types
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  lastActive: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Create type-safe sample data
const sampleUsers: User[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
    lastActive: new Date('2024-01-15'),
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'user',
    lastActive: new Date('2024-01-10'),
  },
];

const sampleProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Headphones',
    price: 99.99,
    category: 'Electronics',
    inStock: true,
  },
  {
    id: 'prod-2',
    name: 'Coffee Mug',
    price: 14.99,
    category: 'Home & Kitchen',
    inStock: false,
  },
];

const meta: Meta<typeof DataTable> = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserTable: Story = {
  args: {
    data: sampleUsers,
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '60px' },
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email' },
      {
        key: 'role',
        header: 'Role',
        render: (value) => (
          <span className={`badge badge-${value}`}>{String(value).toUpperCase()}</span>
        ),
      },
      {
        key: 'lastActive',
        header: 'Last Active',
        render: (value) => new Date(value as Date).toLocaleDateString(),
      },
    ],
  },
};

export const ProductTable: Story = {
  args: {
    data: sampleProducts,
    columns: [
      { key: 'id', header: 'Product ID', width: '100px' },
      { key: 'name', header: 'Product Name', sortable: true },
      {
        key: 'price',
        header: 'Price',
        render: (value) => `$${Number(value).toFixed(2)}`,
        sortable: true,
      },
      { key: 'category', header: 'Category' },
      {
        key: 'inStock',
        header: 'Stock Status',
        render: (value) => (
          <span className={value ? 'text-green-600' : 'text-red-600'}>
            {value ? 'In Stock' : 'Out of Stock'}
          </span>
        ),
      },
    ],
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
    ],
    emptyMessage: 'No users found. Try adjusting your search criteria.',
  },
};

export const LoadingState: Story = {
  args: {
    data: [],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
    ],
    isLoading: true,
  },
};
```

## Advanced Story Patterns

### Using Args and Parameters Effectively

Storybook's `args` system becomes much more powerful with TypeScript. You can create reusable arg configurations:

```tsx
// Shared args for common scenarios
const commonButtonArgs = {
  children: 'Click me',
  disabled: false,
  isLoading: false,
} satisfies Partial<ButtonProps>;

export const PrimaryButton: Story = {
  args: {
    ...commonButtonArgs,
    variant: 'default',
  },
};

export const DestructiveButton: Story = {
  args: {
    ...commonButtonArgs,
    variant: 'destructive',
    children: 'Delete Account',
  },
};
```

### Creating Story Templates

For components with many similar variations, templates can reduce duplication:

```tsx
const Template: StoryObj<typeof Button> = {
  render: (args) => <Button {...args} />,
};

export const Small = {
  ...Template,
  args: {
    size: 'sm',
    children: 'Small Button',
  },
} satisfies Story;

export const Large = {
  ...Template,
  args: {
    size: 'lg',
    children: 'Large Button',
  },
} satisfies Story;
```

### Interactive Stories with Actions

TypeScript makes your action handlers type-safe too:

```tsx
import { action } from '@storybook/addon-actions';
import { fn } from '@storybook/test';

export const Interactive: Story = {
  args: {
    onClick: fn(action('button-clicked')),
    children: 'Click me to see action',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);

    // TypeScript ensures args.onClick exists and is callable
    expect(args.onClick).toHaveBeenCalled();
  },
};
```

## Real-World Use Cases™

### Design System Documentation

Your stories become living documentation for your design system. Each story demonstrates a specific use case with type safety:

```tsx
export const DesignSystemShowcase: Story = {
  render: () => (
    <div className="space-y-8">
      <section>
        <h3>Primary Actions</h3>
        <div className="flex gap-2">
          <Button variant="default">Save Changes</Button>
          <Button variant="default" leftIcon="📁">
            Save Draft
          </Button>
        </div>
      </section>

      <section>
        <h3>Destructive Actions</h3>
        <div className="flex gap-2">
          <Button variant="destructive">Delete</Button>
          <Button variant="destructive" size="sm">
            Remove
          </Button>
        </div>
      </section>

      <section>
        <h3>Loading States</h3>
        <div className="flex gap-2">
          <Button isLoading>Processing...</Button>
          <Button isLoading variant="destructive">
            Deleting...
          </Button>
        </div>
      </section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common button patterns used throughout the application.',
      },
    },
  },
};
```

### Edge Case Testing

Stories are perfect for documenting and testing edge cases that might be hard to reproduce:

```tsx
export const EdgeCases: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <Button className="w-full">Very Very Very Long Button Text That Might Wrap</Button>

      <Button leftIcon="🌟" rightIcon="→" size="sm">
        Tiny with Both Icons
      </Button>

      <Button variant="ghost" isLoading disabled>
        Loading Disabled Ghost (should this be possible?)
      </Button>
    </div>
  ),
};
```

## Performance and Bundle Considerations

> [!TIP]
> Stories don't get included in your production bundle, so you can be generous with examples and test cases.

Since stories are only loaded in development, you can create comprehensive test suites without worrying about bundle size:

```tsx
// This won't affect your production bundle
export const ComprehensiveTest: Story = {
  render: () => {
    const allVariants: ButtonProps['variant'][] = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
    ];
    const allSizes: ButtonProps['size'][] = ['sm', 'default', 'lg', 'icon'];

    return (
      <div className="grid grid-cols-4 gap-2">
        {allVariants.flatMap((variant) =>
          allSizes.map((size) => (
            <Button key={`${variant}-${size}`} variant={variant} size={size}>
              {size === 'icon' ? '🚀' : `${variant} ${size}`}
            </Button>
          )),
        )}
      </div>
    );
  },
};
```

## Common Pitfalls and How to Avoid Them

### Type Assertion Traps

Avoid using `as any` in your stories—it defeats the purpose of type safety:

```tsx
// ❌ Bad - loses type safety
export const BadExample: Story = {
  args: {
    variant: 'invalid-variant' as any,
  },
};

// ✅ Good - TypeScript will catch this error
export const GoodExample: Story = {
  args: {
    variant: 'default', // Only valid variants allowed
  },
};
```

### Generic Component Stories

When working with generic components, be explicit about your types:

```tsx
// ❌ Hard to maintain and understand
export const GenericTable: Story = {
  args: {
    data: [{ id: 1, name: 'John' }],
    columns: [{ key: 'id' as any, header: 'ID' }],
  },
};

// ✅ Clear and type-safe
interface StoryUser {
  id: number;
  name: string;
}

export const UserDataTable: StoryObj<typeof DataTable<StoryUser>> = {
  args: {
    data: [{ id: 1, name: 'John Doe' }],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
    ],
  },
};
```

### Overcomplicating Args

Keep your args focused on the story's purpose:

```tsx
// ❌ Too much configuration for a simple story
export const SimpleButton: Story = {
  args: {
    variant: 'default',
    size: 'default',
    disabled: false,
    isLoading: false,
    leftIcon: undefined,
    rightIcon: undefined,
    className: '',
    children: 'Button',
  },
};

// ✅ Only specify what's relevant
export const SimpleButton: Story = {
  args: {
    children: 'Button',
  },
};
```

## Next Steps

Story-Driven Development with TypeScript transforms how you build components. Your stories become executable specifications that are impossible to get out of sync with your code. Start small—pick one component and create comprehensive stories for it. You'll quickly see how this approach catches edge cases, improves your component APIs, and creates better documentation.

The combination of TypeScript's compile-time safety with Storybook's runtime examples creates a powerful feedback loop that makes your components more robust and your development workflow more confident. Your future self (and your teammates) will thank you for the clear, type-safe examples that show exactly how each component should behave.
