---
title: Loaders
description:
modified: 2024-09-28T11:31:16-06:00
---

Loaders in Storybook offer a way to asynchronously load data or perform actions _before_ a story is rendered. This can be especially useful when you need to fetch mock data from an API, perform setup tasks, or dynamically manipulate props or globals based on external factors before the story is displayed. Similar to [parameters](parameters.md) loaders can be applied globally to affect all stories or locally to affect specific stories.

## Global Loaders

Global loaders are defined in `.storybook/preview.ts` and are executed for every story in your Storybook. They are particularly useful for setting up application-wide contexts or fetching data that is relevant across all components.

Let's say you want to fetch user data and make it available to all stories. We might add something like the following to `.storybook/preview.ts`:

```ts
export const loaders = [
	async () => ({
		userData: await fetch('/api/user').then((res) => res.json()),
	}),
];

export const decorators = [
	(Story, context) => (
		<UserContext.Provider value={context.loaded.userData}>
			<Story />
		</UserContext.Provider>
	),
];
```

This loader fetches user data asynchronously and provides it to all stories through a `UserContext.Provider`. The data fetched by the loader is accessed via `context.loaded` in decorators or story functions.

## Local Loaders

Local loaders are defined within individual stories or story files. They're used to load data or perform actions specific to a single story or a group of stories within the same file.

Let's say you have a `ProfileCard` component that requires user data:

```tsx
export default {
	title: 'Example/ProfileCard',
};

export const DefaultProfileCard = () => <ProfileCard />;

DefaultProfileCard.loaders = [
	async () => ({
		profileData: await fetch('/api/profile').then((res) => res.json()),
	}),
];

export const DefaultProfileCardStory = (args, { loaded: { profileData } }) => (
	<ProfileCard {...profileData} />
);
```

This loader fetches profile data only for the `DefaultProfileCard` story, and the story function uses the loaded data to render the `ProfileCard` component with fetched data.

## Using Loaders with Decorators

You can use loaders in combination with decorators to wrap stories with additional data or context that depends on asynchronous data loading.

### Example: Wrapping a Story with Loaded Data

```tsx
const meta = {
	title: 'Components/TaskList',
	component: TaskList,
	loaders: [
		async () => {
			const tasks = await fetch('https://jsonplaceholder.typicode.com/todos').then((res) =>
				res.json(),
			);
			return { tasks };
		},
	],
	decorators: [
		(Story, { loaded }) => (
			<TaskListProvider tasks={loaded.tasks}>
				<Story />
			</TaskListProvider>
		),
	],
} as Meta<typeof TaskList>;
```
