---
title: "Let's Build a Packing List"
description: Build a packing list using TypeScript and reducers.
modified: 2024-09-29T16:30:58-06:00
---

Let's say we're building a packing list and it keeps track of items in the following manner:

```ts
type Item = {
	id: string;
	name: string;
	packed: boolean;
};
```

And, let's assume we have a `reducer` that supports the following state:

```ts
const items = [
	{
		id: 1,
		name: 'iPhone',
		packed: true,
	},
	{
		id: 2,
		name: 'iPhone charger',
		packed: false,
	},
];
```

This reducer supports the following actions:

- `add({ name })`: adds an item with a given name to the application's state.
- `remove({ id })`: removes the item with that `id` from the application's state.
- `update({ id, name?, packed? })`: updates whatever properties are on the provided item.
- `toggle({ id })`: Flips the `packed` boolean to its opposite.
- `markAllAsUnpacked()`: Sets the `packed` boolean on all items to `false`.

## Your Mission

We have an example implementation in `items-slice.ts`.

Can you make the tests in `items.slice.ts` pass?

## Solution

You can see a possible solution [here](testing-a-reducer-solution.md).
