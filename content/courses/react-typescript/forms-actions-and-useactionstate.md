---
title: 'Typed Forms, Actions, and useActionState'
description: >-
  Model form mutations in React 19—type Actions and useActionState for safe
  server and client flows.
date: 2025-09-06T22:04:44.913Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - forms
  - actions
  - use-action-state
  - react-19
---

React 19 introduces a powerful new pattern for handling form submissions and mutations: Actions and the `useActionState` hook. If you've ever found yourself wrestling with form validation, loading states, error handling, and the inevitable TypeScript gymnastics that come with it all, you're in for a treat. Actions let you encapsulate the entire flow of a form submission—from validation to server communication to state updates—in a type-safe, declarative way that actually makes sense.

In this deep dive, we'll explore how to leverage TypeScript to make your form handling bulletproof, scalable, and surprisingly pleasant to work with. We'll start with the basics of Actions, then progress through increasingly sophisticated patterns that you can actually ship in production.

## What Are Actions and Why Should You Care?

Think of Actions as TypeScript-aware functions that handle the entire lifecycle of a form mutation. Unlike traditional form handling where you're juggling `useState`, `useEffect`, and a handful of booleans to track loading states, Actions encapsulate everything in a single, predictable flow.

Here's the mental model: an Action is a function that takes form data, does something with it (validate, send to server, update local state), and returns a result that tells your UI what happened. The `useActionState` hook manages the execution and gives you back everything you need—current state, pending status, and the action dispatcher itself.

This pattern shines because it:

- **Centralizes mutation logic**: No more scattered state updates across multiple components
- **Provides automatic loading states**: `pending` is handled for you
- **Enables progressive enhancement**: Forms work without JavaScript
- **Plays nicely with TypeScript**: Full type inference from inputs to outputs

## Basic Action Setup

Let's start with a simple contact form to see how the pieces fit together. For comprehensive runtime validation patterns with Zod, see [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md).

```ts
// Define the shape of our form data
interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

// This represents the result of our action
type ContactFormResult = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};
```

Now for the Action itself. Actions receive the previous state (from `useActionState`) and the form data:

```ts
import { useActionState } from 'react';

async function submitContactForm(
  prevState: ContactFormResult,
  formData: FormData,
): Promise<ContactFormResult> {
  // Extract data from FormData
  const data: ContactFormData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    message: formData.get('message') as string,
  };

  // Basic validation
  const errors: Record<string, string[]> = {};
  if (!data.name) errors.name = ['Name is required'];
  if (!data.email || !data.email.includes('@')) errors.email = ['Invalid email address'];
  if (!data.message || data.message.length < 10)
    errors.message = ['Message must be at least 10 characters'];

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  try {
    // Simulate API call
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return {
      success: true,
      message: 'Thank you for your message!',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}
```

Finally, let's wire it up in our component:

```ts
function ContactForm() {
  const [state, action, isPending] = useActionState(submitContactForm, {
    success: false,
  });

  return (
    <form action={action}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          aria-invalid={state.errors?.name ? 'true' : 'false'}
        />
        {state.errors?.name && (
          <p className="error">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-invalid={state.errors?.email ? 'true' : 'false'}
        />
        {state.errors?.email && (
          <p className="error">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          required
          aria-invalid={state.errors?.message ? 'true' : 'false'}
        />
        {state.errors?.message && (
          <p className="error">{state.errors.message[0]}</p>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </button>

      {state.message && (
        <p className={state.success ? 'success' : 'error'}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

What's happening here? The `useActionState` hook returns three things:

1. **`state`**: The current result from your Action (initially your default value)
2. **`action`**: A function you can pass to a `<form>` element's `action` prop
3. **`isPending`**: A boolean that's `true` while the Action is running

> [!TIP]
> Notice how we're using HTML form attributes like `required` and proper `aria-invalid` values. This ensures your form works even if JavaScript fails to load—progressive enhancement at its finest.

## Advanced Type Safety with Generic Actions

The basic pattern works, but we can make it more reusable and type-safe. For runtime validation with Zod, see [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md). Here's a TypeScript-first approach using a generic Action creator:

```ts
type ActionResult<TData = unknown> = {
  success: boolean;
  data?: TData;
  errors?: Record<string, string[]>;
  message?: string;
};

type ActionHandler<TInput, TOutput = unknown> = (input: TInput) => Promise<ActionResult<TOutput>>;
type Validator<T> = (
  data: unknown,
) => { valid: true; data: T } | { valid: false; errors: Record<string, string[]> };

function createAction<TInput, TOutput = unknown>(
  validator: Validator<TInput>,
  handler: ActionHandler<TInput, TOutput>,
) {
  return async function action(
    prevState: ActionResult<TOutput>,
    formData: FormData,
  ): Promise<ActionResult<TOutput>> {
    // Generic form data extraction
    const rawData = Object.fromEntries(formData);

    // Validate input
    const result = validator(rawData);

    if (!result.valid) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    // Execute the handler
    try {
      return await handler(result.data);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  };
}
```

Now we can create type-safe Actions with much less boilerplate:

```ts
// Define our types and validators
interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
}

const validateLogin: Validator<LoginData> = (data: unknown) => {
  const d = data as any;
  const errors: Record<string, string[]> = {};

  if (!d.email || !d.email.includes('@')) errors.email = ['Invalid email'];
  if (!d.password || d.password.length < 6)
    errors.password = ['Password must be at least 6 characters'];

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: d as LoginData };
};

const validateSignup: Validator<SignupData> = (data: unknown) => {
  const d = data as any;
  const errors: Record<string, string[]> = {};

  if (!d.email || !d.email.includes('@')) errors.email = ['Invalid email'];
  if (!d.password || d.password.length < 8)
    errors.password = ['Password must be at least 8 characters'];
  if (d.password !== d.confirmPassword) errors.confirmPassword = ["Passwords don't match"];

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: d as SignupData };
};

// Create typed Actions
const loginAction = createAction(validateLogin, async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  const user = await response.json();

  return {
    success: true,
    data: user,
    message: 'Welcome back!',
  };
});

const signupAction = createAction(validateSignup, async (userData) => {
  // Remove confirmPassword before sending to API
  const { confirmPassword, ...signupData } = userData;

  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Signup failed');
  }

  const user = await response.json();

  return {
    success: true,
    data: user,
    message: 'Account created successfully!',
  };
});
```

This approach gives us several benefits:

- **Type inference**: TypeScript knows exactly what shape your form data will have
- **Reusable validation**: The schema handles both client and server-side validation
- **Consistent error handling**: All Actions follow the same error/success pattern
- **Less repetition**: No more copying validation logic between components

## Handling Complex Form States

Real-world forms often need more sophisticated state management. Let's look at a multi-step wizard with dependent fields and optimistic updates:

```ts
type WizardStep = 'personal' | 'billing' | 'confirmation';

type WizardState = {
  currentStep: WizardStep;
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  billingInfo?: {
    address: string;
    city: string;
    zipCode: string;
    paymentMethod: 'card' | 'paypal';
  };
  isComplete: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// For runtime validation with Zod, see Data Fetching and Runtime Validation guide
const validatePersonalInfo = (data: any): { valid: boolean; errors?: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  if (!data.firstName) errors.firstName = ['First name is required'];
  if (!data.lastName) errors.lastName = ['Last name is required'];
  if (!data.email || !data.email.includes('@')) errors.email = ['Invalid email'];
  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
};

const validateBillingInfo = (data: any): { valid: boolean; errors?: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  if (!data.address) errors.address = ['Address is required'];
  if (!data.city) errors.city = ['City is required'];
  if (!data.zipCode || !/^\d{5}$/.test(data.zipCode)) errors.zipCode = ['Invalid ZIP code'];
  if (!['card', 'paypal'].includes(data.paymentMethod))
    errors.paymentMethod = ['Invalid payment method'];
  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
};

function createWizardAction() {
  return async function wizardAction(
    prevState: WizardState,
    formData: FormData,
  ): Promise<WizardState> {
    const step = formData.get('step') as WizardStep;
    const action = formData.get('action') as 'next' | 'previous' | 'submit';

    switch (action) {
      case 'previous': {
        const stepOrder: WizardStep[] = ['personal', 'billing', 'confirmation'];
        const currentIndex = stepOrder.indexOf(prevState.currentStep);
        const previousStep = stepOrder[Math.max(0, currentIndex - 1)];

        return {
          ...prevState,
          currentStep: previousStep,
          errors: undefined,
        };
      }

      case 'next': {
        if (step === 'personal') {
          const data = Object.fromEntries(formData);
          const result = validatePersonalInfo(data);

          if (!result.valid) {
            return {
              ...prevState,
              errors: result.errors,
            };
          }

          return {
            ...prevState,
            currentStep: 'billing',
            personalInfo: data as any,
            errors: undefined,
          };
        }

        if (step === 'billing') {
          const data = Object.fromEntries(formData);
          const result = validateBillingInfo(data);

          if (!result.valid) {
            return {
              ...prevState,
              errors: result.errors,
            };
          }

          return {
            ...prevState,
            currentStep: 'confirmation',
            billingInfo: data as any,
            errors: undefined,
          };
        }

        return prevState;
      }

      case 'submit': {
        if (!prevState.personalInfo || !prevState.billingInfo) {
          return {
            ...prevState,
            message: 'Please complete all steps',
          };
        }

        try {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personal: prevState.personalInfo,
              billing: prevState.billingInfo,
            }),
          });

          return {
            ...prevState,
            isComplete: true,
            message: 'Order submitted successfully!',
          };
        } catch (error) {
          return {
            ...prevState,
            message: 'Failed to submit order. Please try again.',
          };
        }
      }

      default:
        return prevState;
    }
  };
}
```

The wizard component can then use this Action to manage the entire flow:

```ts
function OrderWizard() {
  const [state, action, isPending] = useActionState(createWizardAction(), {
    currentStep: 'personal' as WizardStep,
    isComplete: false,
  });

  if (state.isComplete) {
    return (
      <div className="success">
        <h2>Order Complete!</h2>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="wizard-steps">
        <div className={`step ${state.currentStep === 'personal' ? 'active' : 'completed'}`}>
          Personal Info
        </div>
        <div className={`step ${state.currentStep === 'billing' ? 'active' : ''}`}>
          Billing
        </div>
        <div className={`step ${state.currentStep === 'confirmation' ? 'active' : ''}`}>
          Confirmation
        </div>
      </div>

      {state.currentStep === 'personal' && (
        <PersonalInfoStep
          data={state.personalInfo}
          errors={state.errors}
        />
      )}

      {state.currentStep === 'billing' && (
        <BillingInfoStep
          data={state.billingInfo}
          errors={state.errors}
        />
      )}

      {state.currentStep === 'confirmation' && (
        <ConfirmationStep
          personalInfo={state.personalInfo!}
          billingInfo={state.billingInfo!}
        />
      )}

      <div className="wizard-actions">
        {state.currentStep !== 'personal' && (
          <button
            type="submit"
            name="action"
            value="previous"
            disabled={isPending}
          >
            Previous
          </button>
        )}

        {state.currentStep !== 'confirmation' && (
          <button
            type="submit"
            name="action"
            value="next"
            name="step"
            value={state.currentStep}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : 'Next'}
          </button>
        )}

        {state.currentStep === 'confirmation' && (
          <button
            type="submit"
            name="action"
            value="submit"
            disabled={isPending}
          >
            {isPending ? 'Submitting...' : 'Complete Order'}
          </button>
        )}
      </div>

      {state.message && (
        <p className="message">{state.message}</p>
      )}
    </form>
  );
}
```

> [!NOTE]
> Notice how we're using hidden inputs and button values to pass step information to our Action. This ensures the form still works without JavaScript—the server can process the same FormData.

## Optimistic Updates and Real-Time Feedback

Sometimes you want to show immediate feedback while an Action is running. Here's how to implement optimistic updates with proper rollback:

```ts
type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  optimistic?: boolean; // Mark items as optimistically updated
};

type TodoState = {
  todos: TodoItem[];
  errors?: Record<string, string[]>;
  message?: string;
};

// See Data Fetching and Runtime Validation guide for Zod validation patterns
const validateAddTodo = (data: any): { valid: boolean; errors?: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  if (!data.text || data.text.length === 0) errors.text = ['Todo text is required'];
  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
};

const validateToggleTodo = (data: any): { valid: boolean; errors?: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  if (!data.todoId) errors.todoId = ['Todo ID is required'];
  return Object.keys(errors).length > 0 ? { valid: false, errors } : { valid: true };
};

function createTodoActions() {
  const addTodo = async (prevState: TodoState, formData: FormData): Promise<TodoState> => {
    const data = Object.fromEntries(formData);
    const result = validateAddTodo(data);

    if (!result.valid) {
      return {
        ...prevState,
        errors: result.errors,
      };
    }

    // Optimistic update - add the todo immediately
    const optimisticTodo: TodoItem = {
      id: crypto.randomUUID(),
      text: data.text as string,
      completed: false,
      optimistic: true,
    };

    const optimisticState = {
      ...prevState,
      todos: [...prevState.todos, optimisticTodo],
      errors: undefined,
    };

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) throw new Error('Failed to add todo');

      const newTodo = await response.json();

      // Replace optimistic todo with real one
      return {
        ...optimisticState,
        todos: optimisticState.todos.map((todo) =>
          todo.id === optimisticTodo.id ? { ...newTodo, optimistic: false } : todo,
        ),
        message: 'Todo added successfully!',
      };
    } catch (error) {
      // Rollback optimistic update
      return {
        ...prevState,
        message: 'Failed to add todo',
      };
    }
  };

  const toggleTodo = async (prevState: TodoState, formData: FormData): Promise<TodoState> => {
    const todoId = formData.get('todoId') as string;
    const completed = formData.get('completed') === 'true';

    // Optimistic update
    const optimisticState = {
      ...prevState,
      todos: prevState.todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !completed, optimistic: true } : todo,
      ),
    };

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (!response.ok) throw new Error('Failed to toggle todo');

      const updatedTodo = await response.json();

      return {
        ...optimisticState,
        todos: optimisticState.todos.map((todo) =>
          todo.id === todoId ? { ...updatedTodo, optimistic: false } : todo,
        ),
      };
    } catch (error) {
      // Rollback optimistic update
      return prevState;
    }
  };

  return { addTodo, toggleTodo };
}
```

The component can then provide immediate feedback:

```ts
function TodoApp() {
  const { addTodo, toggleTodo } = createTodoActions();
  const [state, addAction, isAddPending] = useActionState(addTodo, {
    todos: [],
  });
  const [, toggleAction, isTogglePending] = useActionState(toggleTodo, state);

  return (
    <div>
      <form action={addAction}>
        <input
          name="text"
          placeholder="Add a todo..."
          required
        />
        <button type="submit" disabled={isAddPending}>
          {isAddPending ? 'Adding...' : 'Add'}
        </button>
        {state.errors?.text && (
          <p className="error">{state.errors.text[0]}</p>
        )}
      </form>

      <ul>
        {state.todos.map((todo) => (
          <li
            key={todo.id}
            className={todo.optimistic ? 'optimistic' : ''}
          >
            <form action={toggleAction}>
              <input type="hidden" name="todoId" value={todo.id} />
              <input type="hidden" name="completed" value={String(todo.completed)} />
              <button
                type="submit"
                disabled={isTogglePending}
                className={`toggle ${todo.completed ? 'completed' : ''}`}
              >
                {todo.completed ? '✓' : '○'}
              </button>
            </form>

            <span className={todo.completed ? 'completed' : ''}>
              {todo.text}
            </span>

            {todo.optimistic && (
              <span className="loading">⏳</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Error Handling and Recovery Patterns

Production forms need robust error handling. Here's a pattern for handling different types of errors with appropriate user feedback:

```ts
enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

type FormError = {
  type: ErrorType;
  message: string;
  field?: string;
  retryable?: boolean;
};

type RobustFormState = {
  success: boolean;
  data?: unknown;
  errors: FormError[];
  fieldErrors: Record<string, string[]>;
  retryCount: number;
  isRetrying: boolean;
};

// For runtime validation with Zod, see Data Fetching and Runtime Validation guide
type Validator<T> = (
  data: unknown,
) => { valid: true; data: T } | { valid: false; errors: Record<string, string[]> };

function createRobustAction<TInput>(
  validator: Validator<TInput>,
  handler: (input: TInput) => Promise<unknown>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
  } = {},
) {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  return async function robustAction(
    prevState: RobustFormState,
    formData: FormData,
  ): Promise<RobustFormState> {
    // Handle retry attempts
    if (formData.get('_action') === 'retry') {
      if (prevState.retryCount >= maxRetries) {
        return {
          ...prevState,
          errors: [
            ...prevState.errors,
            {
              type: ErrorType.UNKNOWN,
              message: 'Maximum retry attempts reached',
              retryable: false,
            },
          ],
        };
      }

      // Simulate retry delay
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      return {
        ...prevState,
        retryCount: prevState.retryCount + 1,
        isRetrying: true,
        errors: [],
      };
    }

    // Validate input
    const data = Object.fromEntries(formData);
    const result = validator(data);

    if (!result.valid) {
      const fieldErrors = result.errors;
      const errors: FormError[] = Object.entries(fieldErrors).map(([field, messages]) => ({
        type: ErrorType.VALIDATION,
        field,
        message: messages[0],
        retryable: false,
      }));

      return {
        success: false,
        errors,
        fieldErrors,
        retryCount: 0,
        isRetrying: false,
      };
    }

    try {
      const responseData = await handler(result.data);

      return {
        success: true,
        data: responseData,
        errors: [],
        fieldErrors: {},
        retryCount: 0,
        isRetrying: false,
      };
    } catch (error) {
      let errorType = ErrorType.UNKNOWN;
      let message = 'An unexpected error occurred';
      let retryable = false;

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorType = ErrorType.NETWORK;
        message = 'Network error. Please check your connection.';
        retryable = true;
      } else if (error instanceof Error) {
        if (error.message.includes('500')) {
          errorType = ErrorType.SERVER;
          message = 'Server error. Please try again.';
          retryable = true;
        } else if (error.message.includes('400')) {
          errorType = ErrorType.VALIDATION;
          message = 'Invalid request. Please check your input.';
          retryable = false;
        } else {
          message = error.message;
        }
      }

      return {
        success: false,
        errors: [{ type: errorType, message, retryable }],
        fieldErrors: {},
        retryCount: prevState.retryCount,
        isRetrying: false,
      };
    }
  };
}
```

And here's how to use it in a component with proper error display and retry functionality:

```ts
function RobustForm() {
  const submitAction = createRobustAction(
    ContactFormSchema,
    async (data) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    { maxRetries: 3, retryDelay: 2000 }
  );

  const [state, action, isPending] = useActionState(submitAction, {
    success: false,
    errors: [],
    fieldErrors: {},
    retryCount: 0,
    isRetrying: false,
  });

  const networkErrors = state.errors.filter(e => e.type === ErrorType.NETWORK);
  const serverErrors = state.errors.filter(e => e.type === ErrorType.SERVER);
  const hasRetryableErrors = state.errors.some(e => e.retryable);

  return (
    <form action={action}>
      {/* Global error display */}
      {networkErrors.length > 0 && (
        <div className="error network-error">
          <h4>Connection Problem</h4>
          <p>{networkErrors[0].message}</p>
          {hasRetryableErrors && (
            <button
              type="submit"
              name="_action"
              value="retry"
              disabled={isPending}
            >
              {state.isRetrying ? 'Retrying...' : `Retry (${state.retryCount}/${3})`}
            </button>
          )}
        </div>
      )}

      {serverErrors.length > 0 && (
        <div className="error server-error">
          <h4>Server Error</h4>
          <p>{serverErrors[0].message}</p>
          <p className="help-text">
            If this problem persists, please contact support.
          </p>
        </div>
      )}

      {/* Regular form fields with validation errors */}
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          required
          aria-invalid={state.fieldErrors.name ? 'true' : 'false'}
        />
        {state.fieldErrors.name && (
          <p className="field-error">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* ... other fields ... */}

      <button type="submit" disabled={isPending || state.isRetrying}>
        {isPending ? 'Submitting...' :
         state.isRetrying ? 'Retrying...' :
         'Submit'}
      </button>
    </form>
  );
}
```

> [!WARNING]
> Be careful with automatic retries for mutations. You usually only want to retry safe operations like fetching data, not operations that might have side effects like creating records or processing payments.

## Performance Considerations and Best Practices

As your form handling gets more sophisticated, here are some patterns to keep your app performant:

### Debounced Validation

For real-time validation without overwhelming the server:

```ts
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// For runtime validation with Zod, see Data Fetching and Runtime Validation guide
type FieldValidator = (value: string) => string | null;

function createDebouncedValidation(
  validator: FieldValidator,
  asyncValidator?: (value: string) => Promise<string | null>
) {
  return function DebouncedField({
    name,
    value,
    onChange,
    ...props
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) {
    const [errors, setErrors] = useState<string[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const debouncedValue = useDebounced(value, 300);

    useEffect(() => {
      if (!debouncedValue) {
        setErrors([]);
        return;
      }

      const validate = async () => {
        setIsValidating(true);

        // Local validation first
        const localError = validator(debouncedValue);

        if (localError) {
          setErrors([localError]);
          setIsValidating(false);
          return;
        }

        // Async validation if provided
        if (asyncValidator) {
          try {
            const asyncError = await asyncValidator(debouncedValue);
            setErrors(asyncError ? [asyncError] : []);
          } catch (error) {
            setErrors(['Validation failed']);
          }
        } else {
          setErrors([]);
        }

        setIsValidating(false);
      };

      validate();
    }, [debouncedValue, validator, asyncValidator]);

    return (
      <div className="field-wrapper">
        <input
          {...props}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={errors.length > 0 ? 'true' : 'false'}
          className={`${props.className || ''} ${
            isValidating ? 'validating' : ''
          } ${errors.length > 0 ? 'error' : ''}`}
        />

        {isValidating && (
          <span className="validation-indicator">Validating...</span>
        )}

        {errors.map((error, index) => (
          <p key={index} className="field-error">{error}</p>
        ))}
      </div>
    );
  };
}
```

### Memoizing Action Results

Prevent unnecessary re-renders when Action state hasn't meaningfully changed:

```ts
function useStableActionState<TState>(
  action: (prevState: TState, formData: FormData) => Promise<TState>,
  initialState: TState,
  equalityFn?: (a: TState, b: TState) => boolean,
) {
  const [state, dispatch, isPending] = useActionState(action, initialState);

  const stableState = useMemo(
    () => state,
    [
      equalityFn ? state : JSON.stringify(state), // Simple deep comparison fallback
    ],
  );

  return [stableState, dispatch, isPending] as const;
}

// Usage with custom equality
const [state, action, isPending] = useStableActionState(
  myAction,
  initialState,
  (a, b) => a.errors === b.errors && a.message === b.message,
);
```

### Code Splitting Actions

For large applications, consider lazy-loading Action implementations:

```ts
const LazyContactAction = lazy(() =>
  import('./actions/contact-action').then(module => ({
    default: module.contactAction
  }))
);

function ContactForm() {
  const [action, setAction] = useState<typeof contactAction | null>(null);
  const [state, dispatch, isPending] = useActionState(
    action || (async (prev) => prev),
    { success: false }
  );

  useEffect(() => {
    import('./actions/contact-action').then(module => {
      setAction(() => module.contactAction);
    });
  }, []);

  if (!action) {
    return <div>Loading form...</div>;
  }

  return (
    <form action={dispatch}>
      {/* Form fields */}
    </form>
  );
}
```

## Next Steps and Real-World Usage

The patterns we've covered here scale from simple contact forms to complex multi-step wizards and everything in between. Here are some areas to explore further:

1. **Server Actions**: If you're using React Server Components, Actions can run directly on the server
2. **Streaming Updates**: Combine Actions with Suspense for progressive loading
3. **Form Libraries**: Libraries like React Hook Form now have Action adapters
4. **Testing**: Actions are just functions, making them easy to unit test

The key insight is that Actions + `useActionState` give you a declarative way to model the entire lifecycle of form mutations. Combined with TypeScript's type inference, you get both safety and developer experience that actually makes form handling enjoyable.

Rather than fighting with scattered state and imperative event handlers, you're describing what should happen when forms are submitted—and React handles the rest. Your forms become more predictable, your error handling becomes more consistent, and your users get better experiences with proper loading states and progressive enhancement.

The future of form handling in React is typed, declarative, and surprisingly pleasant to work with. Give these patterns a try in your next project—you might find yourself actually looking forward to implementing that next form.

## See Also

- [Forms, Events, and Number Inputs](forms-events-and-number-inputs.md) - TypeScript patterns for event handlers and input types
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md) - Comprehensive Zod validation patterns
- [The `use` Hook and Suspense Typing](the-use-hook-and-suspense-typing.md) - Async patterns in React 19
