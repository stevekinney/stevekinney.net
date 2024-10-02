---
title: Setup Mock Service Worker
description: Let's walk through setting up Mock Service Worker.
---

It's already included in the example in `examples/task-list`, but if you're starting from a new project, you'll want to install [Mock Service Worker](https://mswjs.io/).

```sh
npm install -D msw
```

With that installed, we're going to need to do three things:

1. Set up the handlers for the various HTTP requesrs that we're mocking out.
2. Spin up and tear down our mock server in our tests.
3. Make some assertions based on this data.

## Setting Up the Handlers

In `src/mocks/handlers.js`, we need to set up a reasonable simulation of our API. There are some fake tasks in `src/mocks/tasks.json` to get us started.

```js
import { http, HttpResponse } from 'msw';
import tasks from './tasks.json';

let id = 3;

const createTask = (title) => ({
	id: `${id++}`,
	title,
	completed: false,
	createdAt: new Date('02-29-2024').toISOString(),
	lastModified: new Date('02-29-2024').toISOString(),
});

export const handlers = [
	http.get('/api/tasks', () => {
		return HttpResponse.json(tasks);
	}),
	http.post('/api/tasks', async ({ request }) => {
		const { title } = await request.json();
		const task = createTask(title);
		return HttpResponse.json(task);
	}),
	http.patch('/api/tasks/:id', () => {
		return new HttpResponse(null, {
			status: 204,
		});
	}),
	http.delete('/api/tasks/:id', () => {
		return new HttpResponse(null, {
			status: 204,
		});
	}),
];
```

## Setup the Server

In `src/mocks/server`, we'll also set up the following:

```js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Spin Up the Mock Server in Your Tests

```js
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Application } from './application';
import { server } from '../mocks/server';

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
```

## Write Some Tests

The big difference from some of the other examples is that we'll need to wait for the API requests to come back before our tasks are loaded in the DOM. These are a bit naïve in terms of tests, but they get the point across.

```js
it('should render the application', async () => {
	render(<Application />);

	const taskElements = await screen.findAllByTestId(/task-/i);

	expect(taskElements).toHaveLength(2);
});

it('should add a new task', async () => {
	render(<Application />);

	const input = screen.getByLabelText(/create task/i);
	const submit = screen.getByRole('button', { name: /create task/i });

	await userEvent.type(input, 'New Task');
	await userEvent.click(submit);

	const newTask = await screen.findByText('New Task');

	expect(newTask).toBeInTheDocument();
});

it('should remove a task', async () => {
	render(<Application />);

	const [removeButton] = await screen.findAllByRole('button', {
		name: /remove task/i,
	});

	await userEvent.click(removeButton);

	const updatedTaskElements = await screen.findAllByTestId(/task-/i);

	expect(updatedTaskElements).toHaveLength(1);
});
```
