---
title: Adding Dark Mode to Our Components
description: Tailwind makes it easy to support a custom dark-mode theme for your application.
modified: 2024-09-28T11:31:16-06:00
---

There are a number of ways that we can add dark mode to our component, but let's start by leveraging the path of least resistance using Tailwind since we already laid the groundwork [earlier](setting-up-tailwind.md).

Tailwind supports a utility called `dark:` which only triggers the class when _whatever_ we chose to trigger dark mode kicks into gear.

For example, this would apply the second class if-and-only-if we're in dark mode.

```html
<button class="bg-primary-600 dark:bg-primary-500">Button</button>
```

According to our design system, we're using the following values for light and dark mode.

| Name                     | Light       | Dark        |
| ------------------------ | ----------- | ----------- |
| **Button / Primary**     |             |             |
| Default                  | Primary/600 | Primary/500 |
| Hover                    | Primary/500 | Primary/400 |
| Active                   | Primary/400 | Primary/300 |
| Label                    | White       | White       |
| Border                   | Transparent | Transparent |
| **Button / Secondary**   |             |             |
| Default                  | White       | Slate/900   |
| Hover                    | Slate/50    | Slate/800   |
| Active                   | Slate/100   | Slate/700   |
| Label                    | Slate/900   | White       |
| Border                   | Slate/300   | Slate/900   |
| **Button / Destructive** |             |             |
| Default                  | Danger/600  | Danger/500  |
| Hover                    | Danger/500  | Danger/400  |
| Active                   | Danger/400  | Danger/300  |
| Label                    | White       | White       |
| Border                   | Transparent | Transparent |
| **Button / Ghost**       |             |             |
| Default                  | Transparent | Transparent |
| Hover                    | Slate/50    | Slate/700   |
| Active                   | Slate/100   | Slate/700   |
| Label                    | Slate/900   | White       |
| Border                   | Transparent | Transparent |

So, we could update our component as follows:

```diff
@@ -33,6 +33,9 @@ export const variants = cva(
           'border-transparent',
           'hover:bg-primary-500',
           'active:bg-primary-400',
+          'dark:bg-primary-500',
+          'dark:hover:bg-primary-400',
+          'dark:active:bg-primary-300',
         ],
         secondary: [
           'bg-white',
@@ -40,6 +43,11 @@ export const variants = cva(
           'border-slate-300',
           'hover:bg-slate-50',
           'active:bg-slate-100',
+          'dark:bg-slate-900',
+          'dark:text-white',
+          'dark:border-slate-900',
+          'dark:hover:bg-slate-800',
+          'dark:active:bg-slate-700',
         ],
         destructive: [
           'bg-danger-600',
@@ -47,6 +55,9 @@ export const variants = cva(
           'border-transparent',
           'hover:bg-danger-500',
           'active:bg-danger-400',
+          'dark:bg-danger-500',
+          'dark:hover:bg-danger-400',
+          'dark:active:bg-danger-300',
         ],
       },
       size: {
```
