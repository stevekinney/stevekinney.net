---
title: Testing Components with Storybook
description:
exclude: false
drafted: false
modified: 2024-04-08T13:32:25-06:00
---

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
