---
title: 'Solution: Checking a Disabled Text Area'
description: "The solution for a challenge in Steve's course on using Storybook."
modified: 2024-09-28T11:31:16-06:00
---

```tsx
export const Disabled: Story = {
	args: {
		disabled: true,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const textArea = canvas.getByRole('textbox');

		expect(textArea).toBeDisabled();
		await userEvent.type(textArea, 'Hello, world!');
		expect(textArea).toHaveValue('');
	},
};
```
