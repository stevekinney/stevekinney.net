---
title: Button Exemplars
description: Fully built-out buttons in Tailwind.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

## Light Mode

### Primary Variant

```html tailwind
<button
  class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400 disabled:hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400 dark:disabled:bg-indigo-600/50"
>
  Primary
</button>
```

### Secondary Variant

```html tailwind
<button
  class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-xs ring-1 ring-slate-300 transition-colors duration-200 ring-inset hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-500"
>
  Secondary
</button>
```

### Danger Variant

```html tailwind
<button
  class="rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-red-400 disabled:hover:bg-red-400 dark:bg-red-500 dark:hover:bg-red-400 dark:focus:ring-red-400 dark:disabled:bg-red-600/50"
>
  Danger
</button>
```

### Ghost Variant

```html tailwind
<button
  class="rounded-md bg-transparent px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-none transition-colors duration-200 hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
>
  Ghost
</button>
```

## Dark Mode

For dark mode, wrap buttons in a container with the `dark` class:

```html tailwind
<div class="dark">
  <!-- Any button from above will automatically use dark mode styles -->
  <button
    class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400 disabled:hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400 dark:disabled:bg-indigo-600/50"
  >
    Primary Dark
  </button>
</div>
```

## Disabled States

#### Primary Disabled

```html tailwind
<button
  disabled
  class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400 disabled:hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400 dark:disabled:bg-indigo-600/50"
>
  Primary Disabled
</button>
```

#### Secondary Disabled

```html tailwind
<button
  disabled
  class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-xs ring-1 ring-slate-300 transition-colors duration-200 ring-inset hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-500"
>
  Secondary Disabled
</button>
```

#### Danger Disabled

```html tailwind
<button
  disabled
  class="rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-red-400 disabled:hover:bg-red-400 dark:bg-red-500 dark:hover:bg-red-400 dark:focus:ring-red-400 dark:disabled:bg-red-600/50"
>
  Danger Disabled
</button>
```

#### Ghost Disabled

```html tailwind
<button
  disabled
  class="rounded-md bg-transparent px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-none transition-colors duration-200 hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-gray-400 dark:disabled:text-gray-600 dark:disabled:hover:bg-transparent"
>
  Ghost Disabled
</button>
```

## Full Width Variations

#### Primary Full Width

```html tailwind
<button
  class="w-full rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400 disabled:hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-400 dark:disabled:bg-indigo-600/50"
>
  Primary Full Width
</button>
```

#### Secondary Full Width

```html tailwind
<button
  class="w-full rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-xs ring-1 ring-slate-300 transition-colors duration-200 ring-inset hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-500"
>
  Secondary Full Width
</button>
```
