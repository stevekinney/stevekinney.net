---
modified: 2024-09-28T11:31:16-06:00
title: Decorators
description:
---

Decorators allow you to wrap the component in your story with another component. This is useful in a bunch of situations.

- You're using React and your component expects to be wrapped in a [context provider](https://react.dev/learn/passing-data-deeply-with-context#step-3-provide-the-context).
- You want to wrap a child component in a parent (e.g. you're rendering a list item component, but you want to wrap each of them in the list component).
- You want to add some extra markup around the component itself. The [official documentation using the example of adding some margin](https://storybook.js.org/docs/writing-stories/decorators#wrap-stories-with-extra-markup) around the component.

Additionally, [`@storybook/addons-themes`](https://storybook.js.org/addons/@storybook/addon-themes/) uses decorators to apply themes to your stories.

## Refactoring Our Text Area

Let's imagine that we have a task list that relies on a Context API.

We can add the following to our story or to the meta:

```tsx
const meta = {
	title: 'Components/TaskList',
	component: TaskList,
	decorators: [
		(Story) => (
			<TaskListProvider
				tasks={[
					{ id: '1', title: 'Task 1', completed: false },
					{ id: '2', title: 'Task 2', completed: true },
				]}
			>
				<Story />
			</TaskListProvider>
		),
	],
} as Meta<typeof TaskList>;
```
