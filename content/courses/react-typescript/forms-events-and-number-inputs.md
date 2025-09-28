---
title: "Forms, Events, and Number Inputs That Don't Lie"
description: >-
  Type form handlers once, reuse everywhere—and tame <input type="number">
  returning strings.
date: 2025-09-06T22:23:57.266Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - forms
  - events
  - input-types
  - validation
---

Building forms in React with TypeScript should be straightforward—define your state, handle events, render inputs. But then you hit the classic gotchas: event types that make no sense, `<input type="number">` that cheerfully returns strings anyway, and form handlers that need the same boilerplate everywhere. Let's fix all of that with some solid patterns that'll make your forms both type-safe and actually pleasant to work with.

## The Problem with Event Types

React's event system can feel like a maze of generic types. You start with a simple input handler and immediately get smacked with TypeScript errors that make you question your life choices:

```tsx
// ❌ What type is this supposed to be?
const handleChange = (e) => {
  setEmail(e.target.value);
};
```

The compiler helpfully tells you that `Parameter 'e' implicitly has an 'any' type`, which is about as useful as a chocolate teapot. Let's fix this once and for all.

## Generic Event Handlers That Actually Work

Here's the pattern I use for 90% of form inputs—a generic handler that infers the correct types:

```tsx
import { ChangeEvent } from 'react';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 0,
  });

  // ✅ One handler to rule them all
  const handleInputChange = <T extends HTMLInputElement | HTMLTextAreaElement>(
    e: ChangeEvent<T>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form>
      <input name="name" value={formData.name} onChange={handleInputChange} />
      <input name="email" type="email" value={formData.email} onChange={handleInputChange} />
      <textarea name="message" value={formData.message} onChange={handleInputChange} />
    </form>
  );
}
```

This generic approach works for inputs, textareas, and select elements. The `T extends HTMLInputElement | HTMLTextAreaElement` constraint ensures TypeScript knows what properties are available on `e.target`.

## The Great Number Input Deception

Here's where things get spicy. You'd think `<input type="number">` would give you numbers, right? Wrong! It gives you strings that happen to look like numbers, because HTML form controls always return string values through the DOM API.

```tsx
// ❌ This will bite you eventually
const [age, setAge] = useState<number>(0);

const handleAgeChange = (e: ChangeEvent<HTMLInputElement>) => {
  setAge(e.target.value); // Type error: string is not assignable to number
};
```

You have a few options here, and they all involve being explicit about the conversion:

### Option 1: Convert at the Handler Level

```tsx
const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value === '' ? 0 : Number(e.target.value);
  setAge(value);
};
```

### Option 2: Generic Number Handler with Validation

This is my preferred approach—a reusable handler that safely converts strings to numbers:

```tsx
const handleNumericInput = (e: ChangeEvent<HTMLInputElement>, setter: (value: number) => void) => {
  const { value } = e.target;

  // Handle empty string case
  if (value === '') {
    setter(0);
    return;
  }

  // Convert and validate
  const numValue = Number(value);
  if (!isNaN(numValue)) {
    setter(numValue);
  }
  // If NaN, ignore the input (keeps current state)
};

// Usage:
<input type="number" value={age} onChange={(e) => handleNumericInput(e, setAge)} />;
```

### Option 3: Custom Hook for Number Inputs

For the Real World Use Cases™, I usually wrap this logic in a custom hook:

```tsx
function useNumberInput(initialValue: number = 0) {
  const [value, setValue] = useState<number>(initialValue);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      setValue(0);
      return;
    }

    const numValue = Number(inputValue);
    if (!isNaN(numValue)) {
      setValue(numValue);
    }
  };

  return {
    value,
    onChange: handleChange,
    // Convenience setter if you need it
    setValue,
  };
}

// Usage becomes beautifully simple:
function PriceInput() {
  const price = useNumberInput(0);

  return <input type="number" min="0" step="0.01" {...price} />;
}
```

## Form Submission Without the Footguns

Form submission is another area where TypeScript can help prevent runtime errors. You'll want to validate your form data before submission—this is where runtime validation becomes essential.

For comprehensive coverage of runtime validation with Zod including form validation patterns, see [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md).

Here's a simple TypeScript-first approach for basic form submission:

```tsx
import { FormEvent } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  age: number;
}

function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    age: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    const fieldErrors: Record<string, string> = {};
    if (!formData.name) fieldErrors.name = 'Name is required';
    if (!formData.email.includes('@')) fieldErrors.email = 'Invalid email';
    if (formData.age < 0 || formData.age > 120) fieldErrors.age = 'Invalid age';

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    // Clear errors and submit
    setErrors({});
    submitForm(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your inputs here */}
      <button type="submit">Submit</button>
    </form>
  );
}
```

> [!TIP]
> For production applications, use a schema validation library like Zod for runtime type safety and consistent error messages. See [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md) for complete examples.

## Controlled vs Uncontrolled: Pick Your Poison

React gives you two ways to handle form inputs, and both have their place:

### Controlled Components (Most Common)

```tsx
function ControlledForm() {
  const [email, setEmail] = useState('');

  return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
}
```

**Pros**: Full React control, easy validation, predictable state
**Cons**: Re-renders on every keystroke, more verbose for simple forms

### Uncontrolled Components (Sometimes Better)

```tsx
import { useRef, FormEvent } from 'react';

function UncontrolledForm() {
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value;
    // Do something with email
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={emailRef} type="email" />
    </form>
  );
}
```

**Pros**: Less re-rendering, simpler for basic forms, works well with form libraries
**Cons**: Harder to validate in real-time, less "React-y"

For most cases, I stick with controlled components. But if you have a large form where performance matters, uncontrolled components with a library like [React Hook Form](https://react-hook-form.com/) can be a game-changer.

## Advanced: Type-Safe Form Builder

For a more robust approach with runtime validation, see the Zod examples in [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md). Here's a TypeScript-focused pattern that creates type-safe form builders:

```tsx
type FormFieldConfig<T> = {
  [K in keyof T]: {
    type: 'text' | 'email' | 'number' | 'textarea';
    label: string;
    validation?: (value: T[K]) => string | null;
  };
};

function createFormBuilder<T extends Record<string, any>>(
  initialData: T,
  fieldConfig: FormFieldConfig<T>,
) {
  return function FormBuilder({ onSubmit }: { onSubmit: (data: T) => void }) {
    const [data, setData] = useState<T>(initialData);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

    const updateField = <K extends keyof T>(field: K, value: T[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();

      const newErrors: Partial<Record<keyof T, string>> = {};
      let hasErrors = false;

      // Run validations
      (Object.keys(fieldConfig) as Array<keyof T>).forEach((field) => {
        const config = fieldConfig[field];
        if (config.validation) {
          const error = config.validation(data[field]);
          if (error) {
            newErrors[field] = error;
            hasErrors = true;
          }
        }
      });

      if (hasErrors) {
        setErrors(newErrors);
        return;
      }

      onSubmit(data);
    };

    return (
      <form onSubmit={handleSubmit}>
        {(Object.keys(fieldConfig) as Array<keyof T>).map((field) => {
          const config = fieldConfig[field];
          const error = errors[field];

          if (config.type === 'textarea') {
            return (
              <div key={String(field)}>
                <label>{config.label}</label>
                <textarea
                  value={String(data[field])}
                  onChange={(e) => updateField(field, e.target.value as T[typeof field])}
                />
                {error && <span style={{ color: 'red' }}>{error}</span>}
              </div>
            );
          }

          return (
            <div key={String(field)}>
              <label>{config.label}</label>
              <input
                type={config.type}
                value={String(data[field])}
                onChange={(e) => {
                  const value =
                    config.type === 'number'
                      ? (Number(e.target.value) as T[typeof field])
                      : (e.target.value as T[typeof field]);
                  updateField(field, value);
                }}
              />
              {error && <span style={{ color: 'red' }}>{error}</span>}
            </div>
          );
        })}
        <button type="submit">Submit</button>
      </form>
    );
  };
}

// Usage:
const UserFormBuilder = createFormBuilder(
  { name: '', email: '', age: 0 },
  {
    name: {
      type: 'text',
      label: 'Full Name',
      validation: (value) => (value.length < 1 ? 'Name is required' : null),
    },
    email: {
      type: 'email',
      label: 'Email Address',
      validation: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email'),
    },
    age: {
      type: 'number',
      label: 'Age',
      validation: (value) => (value < 0 || value > 120 ? 'Invalid age' : null),
    },
  },
);
```

This pattern gives you type safety, reusable validation, and consistent error handling across forms. It's definitely more complex than you need for simple cases, but it scales well when you have dozens of forms to build.

## Common Pitfalls and How to Avoid Them

### Fighting the DOM API

Remember: HTML inputs always return strings. Don't fight it, convert it:

```tsx
// ❌ Trying to force the DOM to be different than it is
const age: number = e.target.value; // Type error

// ✅ Accept reality and convert safely
const age: number = Number(e.target.value) || 0;
```

### Overly Complex Event Types

You don't need to memorize every React event type. Start simple:

```tsx
// ✅ This covers 90% of cases
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  // ...
};
```

### Not Handling Edge Cases

Empty strings, NaN values, and null refs are real—handle them:

```tsx
// ✅ Defensive programming
const value = inputRef.current?.value || '';
const numValue = value === '' ? 0 : Number(value);
if (!isNaN(numValue)) {
  setValue(numValue);
}
```

## Performance Considerations

Form inputs can cause a lot of re-renders, especially in controlled components. Here are a few strategies to keep things snappy:

### Debounce Expensive Operations

```tsx
import { useMemo } from 'react';

function SearchForm() {
  const [query, setQuery] = useState('');

  // Debounce expensive searches
  const debouncedQuery = useMemo(() => {
    const timeoutId = setTimeout(() => query, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />;
}
```

### Split Large Forms

Instead of one giant form component, split into smaller, focused components that only re-render when their specific fields change.

## When to Use Form Libraries

For simple forms (2-5 fields), the patterns above are usually sufficient. But when you hit forms with 10+ fields, complex validation, or dynamic field generation, consider reaching for a library:

- **[React Hook Form](https://react-hook-form.com/)**: Minimal re-renders, great TypeScript support
- **[Formik](https://formik.org/)**: More traditional, well-established
- **[React Final Form](https://final-form.org/react)**: Subscription-based updates, very performant

## Wrapping Up

Forms in React don't have to be a source of endless TypeScript frustration. With the right patterns—generic event handlers, safe number conversion, and runtime validation—you can build forms that are both type-safe and maintainable.

The key takeaways:

1. Use generic event handlers to reduce boilerplate
2. Always convert number input values explicitly
3. Add proper TypeScript types to all event handlers
4. Consider performance implications for large forms
5. Don't over-engineer simple cases

Start with the simple patterns and add complexity only when you need it. Your future self will thank you when you're debugging forms at 2 AM and everything just works as expected.

## See Also

- [Forms, Actions, and useActionState](forms-actions-and-useactionstate.md) - React 19 form patterns with Actions
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md) - Comprehensive Zod validation patterns
- [Typing DOM and React Events](typing-dom-and-react-events.md) - Deep dive into event types
