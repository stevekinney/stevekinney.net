---
title: Testing Components with Storybook
description:
modified: 2024-09-28T11:31:16-06:00
---

In almost every application that I have ever worked on there is a concept that a link can look like a button. There is a pattern in React, where we can use polymorphic components. We talk a lot about how to do this in the course on React and Typescript, but for now, let's just be a little hand-wavvy.

We'll update the type as follows:

```tsx
type ButtonProps = ComponentPropsWithoutRef<'button'> &
	ButtonVariants & {
		href?: never;
	};

type AnchorProps = ComponentPropsWithoutRef<'a'> &
	ButtonVariants & {
		href?: string;
	};

type ButtonOrLinkProps = ButtonProps | AnchorProps;
```

And then we'll make one small tweak to our `Button` component.

```tsx
export const Button = ({ variant = 'primary', size = 'medium', ...props }: ButtonOrLinkProps) => {
	const className = clsx(variants({ variant, size }));

	if (props.href) {
		return <a className={className} {...(props as ComponentPropsWithoutRef<'a'>)} />;
	} else {
		return <button className={className} {...(props as ComponentPropsWithoutRef<'button'>)} />;
	}
};
```

One of the really cool things that you can do with Storybook and [Play functions](play-functions.md) is that you can use them to test out your component for you. Let's say that I had a button that could also be a link if we passed a `href` property to the button.

I want to test for the following conditions:

- If I didn't pass in a `href`, then the component should render as a `<button>`.
- If I _did_ pass in a `href`, then the component should render as a `<a>`.

I could augment my stories with some quick assertions.

```ts
export const Primary: Story = {
	args: {
		variant: 'primary',
	},
	play: ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');

		expect(button.tagName).toBe('BUTTON');
	},
};
```

And, I can do something similar with the button that ought to render as a link as well.

```ts
export const ButtonAsLink: Story = {
	args: {
		href: 'https://example.com',
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.findByText('Button');

		expect(button.tagName).toBe('A');
		expect(button).toHaveRole('link');
		expect(button).toHaveAttribute('href', 'https://example.com');
	},
};
```

Now, if I set up [Storybook's Test Runner](test-runner.md), I can even run these tests as part of my CI/CD set up or along with my other unit tests.
