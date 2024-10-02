---
title: Class Variance Authority
description:
modified: 2024-09-28T11:31:16-06:00
---

[Class Variance Authority](https://cva.style) is a framework agnostic tool for creating variants of a component with different classes. It's super simple and you probably _could_ write it yourself if you had to—but, you don't have to because it already exists.

CVA allows you to:

1. Define a set of base styles for the component.
2. Define the styles unique to each variant.
3. Allow you to define default variants when one isn't explicitly specified.
4. It allows you to create compound variants.

It works _super well_ with Tailwind, but you don't need use Tailwind to use CVA. You can use any utility classes that you want or even just the classes from our CSS modules like we did earlier.

> [!TIP] Using Tailwind's IntelliSense with Class Variance Authority
> If you're using Tailwind and Visual Studio Code and CVA and the [Tailwind CSS IntelliSense extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss), then you might want to make [this](https://cva.style/docs/getting-started/installation#tailwind-css) tweak to the `settings.json` in your project.

Let's look at an example where we refactor our [button component](adding-variants.md) from earlier to use CVA.

## Refactoring the Variant Variant

I regret some of my previous naming choices, but here we are. Let's look at some code and talk through it.

```ts
import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(
	[
		'font-semibold',
		'border',
		'rounded',
		'shadow-sm',
		'inline-flex',
		'items-center',
		'cursor-pointer',
		'gap-1.5',
		'focus-visible:outline',
		'focus-visible:outline-2',
		'focus-visible:outline-offset-2',
		'transition-colors',
		'disabled:opacity-50',
		'disabled:cursor-not-allowed',
		'disabled:pointer-events-none',
	],
	{
		variants: {
			variant: {
				primary: [
					'bg-primary-600',
					'text-white',
					'border-transparent',
					'hover:bg-primary-500',
					'active:bg-primary-400',
				],
				secondary: [
					'bg-white',
					'text-slate-900',
					'border-slate-300',
					'hover:bg-slate-50',
					'active:bg-slate-100',
				],
				destructive: [
					'bg-danger-600',
					'text-white',
					'border-transparent',
					'hover:bg-danger-500',
					'active:bg-danger-400',
				],
			},
		},
		defaultVariants: {
			variant: 'secondary',
		},
	},
);
```

One of the things that you'll notice is that this is just a JavaScript object. You can use it with Svelte just as easily as you could with React or anything else.

## Generating Types Automatically

We can also add the following:

```ts
type ButtonVariants = VariantProps<typeof variants>;
```

`VariantProps` looks at the object returned from CVA and creates a type that you can use as a prop with almost any framework—as long as you're using TypeScript, of course. This allows you the ability to share you component styling (e.g. your design language) across multiple projects—even if they're using different frameworks.

Now, we can update the component to use a type based on the variants.

```ts
type ButtonProps = ComponentProps<'button'> & {
	variant?: ButtonVariants['variant'];
	size?: 'small' | 'medium' | 'large';
};
```

> [!example] Exercise
> Can you add an additional variant for the `size` property? We'll checkout a solution [here](adding-a-size-variant.md).
