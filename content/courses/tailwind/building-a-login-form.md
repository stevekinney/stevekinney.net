---
title: Building a Centered Login Form
description: Let's build a professional centered login form step by step using Tailwind CSS flexbox utilities.
---

Let's start with our basic HTML structure for a simple login form.

```html tailwind
<div>
  <form>
    <h2>Sign in to your account</h2>
    <div>
      <label for="email" class="block text-sm font-medium">Email address</label>
      <input
        type="email"
        name="email"
        id="email"
        placeholder="you@example.com"
        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
      />
    </div>
    <div>
      <label for="password" class="block text-sm font-medium">Password</label>
      <input
        type="password"
        name="password"
        id="password"
        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
      />
    </div>
    <button
      type="submit"
      class="mt-4 w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
    >
      Sign in
    </button>
  </form>
</div>
```

It's a basic login form, but it's sitting in the top-left corner and looks quite plain. Let's transform it into a polished, centered login experience.

## Creating Full-Height Centering

First, let's center our form both horizontally and vertically on the page using Flexbox.

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form>
    <h2>Sign in to your account</h2>
    <div>
      <label for="email">Email address</label>
      <input type="email" name="email" id="email" placeholder="you@example.com" />
    </div>
    <div>
      <label for="password">Password</label>
      <input type="password" name="password" id="password" />
    </div>
    <button type="submit">Sign in</button>
  </form>
</div>
```

Centering utilities:

- `flex`: Transforms the container into a flex container (`display: flex`)
- `min-h-screen`: Sets minimum height to 100vh, ensuring the container fills the viewport
- `items-center`: Centers flex items vertically (`align-items: center`)
- `justify-center`: Centers flex items horizontally (`justify-content: center`)

This creates perfect center alignment both horizontally and vertically, regardless of screen size.

## Styling the Form Container

Now let's add proper constraints and visual styling to our form.

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form class="mx-auto w-full max-w-sm space-y-6">
    <h2>Sign in to your account</h2>
    <div>
      <label for="email">Email address</label>
      <input type="email" name="email" id="email" placeholder="you@example.com" />
    </div>
    <div>
      <label for="password">Password</label>
      <input type="password" name="password" id="password" />
    </div>
    <button type="submit">Sign in</button>
  </form>
</div>
```

Form container styling:

- `mx-auto`: Centers the form horizontally within its flex container (redundant here but good practice)
- `w-full`: Form takes full width of its container up to the max-width constraint
- `max-w-sm`: Constrains form to 384px maximum width for optimal readability
- `space-y-6`: Adds 24px vertical spacing between form elements automatically

The `space-y-6` utility is particularly useful for forms—it handles consistent spacing without manual margin management.

## Adding Form Typography

Let's style the heading to establish proper visual hierarchy.

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form class="mx-auto w-full max-w-sm space-y-6">
    <h2 class="text-center text-2xl font-bold tracking-tight text-slate-900">
      Sign in to your account
    </h2>
    <div>
      <label for="email">Email address</label>
      <input type="email" name="email" id="email" placeholder="you@example.com" />
    </div>
    <div>
      <label for="password">Password</label>
      <input type="password" name="password" id="password" />
    </div>
    <button type="submit">Sign in</button>
  </form>
</div>
```

Heading styles:

- `text-center`: Centers the heading text horizontally
- `text-2xl`: Sets font size to 24px with appropriate line height for prominence
- `font-bold`: Bold font weight (700) establishes clear hierarchy
- `tracking-tight`: Slightly tighter letter spacing for better visual density
- `text-slate-900`: Near-black color for maximum readability

## Styling Form Inputs

Let's apply the professional input styling we learned in our [form input tutorial](building-a-form-input.md).

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form class="mx-auto w-full max-w-sm space-y-6">
    <h2 class="text-center text-2xl font-bold tracking-tight text-slate-900">
      Sign in to your account
    </h2>
    <div>
      <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
      <div class="mt-2">
        <input
          type="email"
          name="email"
          id="email"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400"
          placeholder="you@example.com"
        />
      </div>
    </div>
    <div>
      <label for="password" class="block text-sm font-medium text-slate-900">Password</label>
      <div class="mt-2">
        <input
          type="password"
          name="password"
          id="password"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300"
        />
      </div>
    </div>
    <button type="submit">Sign in</button>
  </form>
</div>
```

We're applying the input patterns from our previous tutorial:

- Professional label styling with proper typography hierarchy
- Consistent spacing with `mt-2` between labels and inputs
- Full-width inputs with proper padding and border styling
- Accessible color contrast and placeholder styling

## Adding Button Styling

Now let's style our submit button using the techniques from our [button tutorial](building-a-button.md).

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form class="mx-auto w-full max-w-sm space-y-6">
    <h2 class="text-center text-2xl font-bold tracking-tight text-slate-900">
      Sign in to your account
    </h2>
    <div>
      <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
      <div class="mt-2">
        <input
          type="email"
          name="email"
          id="email"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400"
          placeholder="you@example.com"
        />
      </div>
    </div>
    <div>
      <label for="password" class="block text-sm font-medium text-slate-900">Password</label>
      <div class="mt-2">
        <input
          type="password"
          name="password"
          id="password"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300"
        />
      </div>
    </div>
    <button
      type="submit"
      class="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
    >
      Sign in
    </button>
  </form>
</div>
```

Button styling:

- `w-full`: Button spans the full width of the form for a cohesive, action-oriented design
- `bg-indigo-600`: Indigo primary color creates a professional, trustworthy appearance
- `shadow-xs`: Subtle shadow adds depth without distraction
- `hover:bg-indigo-500`: Lighter shade on hover provides clear interactive feedback

## Adding Accessible Focus States

Finally, let's add proper focus states using `focus-visible` for better keyboard navigation.

```html tailwind
<div class="flex min-h-screen items-center justify-center">
  <form class="mx-auto w-full max-w-sm space-y-6">
    <h2 class="text-center text-2xl font-bold tracking-tight text-slate-900">
      Sign in to your account
    </h2>
    <div>
      <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
      <div class="mt-2">
        <input
          type="email"
          name="email"
          id="email"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
          placeholder="you@example.com"
        />
      </div>
    </div>
    <div>
      <label for="password" class="block text-sm font-medium text-slate-900">Password</label>
      <div class="mt-2">
        <input
          type="password"
          name="password"
          id="password"
          class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
        />
      </div>
    </div>
    <button
      type="submit"
      class="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      Sign in
    </button>
  </form>
</div>
```

Focus-visible styling:

- `focus-visible:outline-2`: Creates a 2px outline when focused via keyboard (not mouse clicks)
- `focus-visible:-outline-offset-2`: Negative offset creates an inset ring for inputs
- `focus-visible:outline-offset-2`: Positive offset creates an outset ring for buttons
- `focus-visible:outline-indigo-600`: Brand color maintains visual consistency

The `focus-visible` pseudo-class is superior to `focus` because it only shows focus rings when users navigate with keyboards, providing better UX for mouse users while maintaining accessibility.

## Challenges

Try building these variations:

1. **Sign-up Form**: Add a "Confirm Password" field and a "Create Account" button
2. **Card-Style Form**: Wrap the form in a white card with padding and shadow using techniques from our [card tutorial](building-a-card.md)
