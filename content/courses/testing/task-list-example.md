---
title: Building a To-Do List Application In React Using Test-Driven Development
  With Vitest
description: A guide to building a To-Do List app using TDD with React and Vitest.
modified: 2024-09-28T18:32:11.055Z
---

## Building a To-Do List Application in React Using Test-Driven Development with Vitest

**Table of Contents**

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Understanding Test-Driven Development](#understanding-test-driven-development)
5. [Setting Up React with Vitest](#setting-up-react-with-vitest)
6. [Designing the To-Do List Application](#designing-the-to-do-list-application)
7. [Implementing the Application with TDD](#implementing-the-application-with-tdd)
   - [1. Creating the ToDo Component](#1-creating-the-todo-component)
   - [2. Fetching To-Dos from an API](#2-fetching-to-dos-from-an-api)
   - [3. Adding a New To-Do](#3-adding-a-new-to-do)
   - [4. Marking a To-Do as Completed](#4-marking-a-to-do-as-completed)
   - [5. Deleting a To-Do](#5-deleting-a-to-do)
8. [Mocking the API with MSW](#mocking-the-api-with-msw)
9. [Running the Tests](#running-the-tests)
10. [Conclusion](#conclusion)
11. [Additional Exercises](#additional-exercises)

***

### Introduction

In this guide, we'll build a **To-Do List** application using **Test-Driven Development (TDD)** with **React** and **Vitest**, a modern JavaScript testing framework. The application will interact with an API to fetch, add, update, and delete to-do items. We'll mock the API using **Mock Service Worker (MSW)** to simulate server responses during testing.

**Objectives:**

- Learn how to apply TDD in a React application.
- Understand how to write unit and integration tests with Vitest and React Testing Library.
- Use MSW to mock API interactions in tests.
- Develop a To-Do List application with features like fetching tasks, adding new tasks, marking tasks as completed, and deleting tasks.

### Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax) and React.
- Familiarity with Node.js and npm.
- Understanding of unit testing concepts.
- Node.js and npm installed on your machine.

### Project Setup

1. **Create a New React App Using Vite**

   We'll use **Vite** to bootstrap our React application quickly.

   ```bash
   npm create vite@latest todo-app-tdd -- --template react
   cd todo-app-tdd
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Install Vitest and Related Packages**

   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom msw
   ```

   - `vitest`: Testing framework.
   - `@testing-library/react`: Utilities for testing React components.
   - `@testing-library/jest-dom`: Custom Jest matchers for the DOM.
   - `jsdom`: Simulates a browser environment for Node.js.
   - `msw`: Mock Service Worker for API mocking.

4. **Project Structure**

   ```ts
   todo-app-tdd/
   ├── node_modules/
   ├── public/
   ├── src/
   │   ├── components/
   │   ├── App.jsx
   │   ├── main.jsx
   │   ├── index.css
   │   ├── mocks/
   │   └── tests/
   ├── tests/
   ├── package.json
   ├── vite.config.js
   └── vitest.config.js
   ```

### Understanding Test-Driven Development

**Test-Driven Development (TDD)** is a software development approach where you:

1. **Write a Test**: Write a test for the next bit of functionality.
2. **Run the Test and See It Fail**: Ensures the test detects the absence of functionality.
3. **Write the Minimal Code to Pass the Test**: Implement just enough code to make the test pass.
4. **Refactor**: Improve the code while keeping the tests passing.
5. **Repeat**: Continue with the next functionality.

This cycle is often referred to as **Red-Green-Refactor**.

### Setting Up React with Vitest

1. **Configure Vitest**

   Create a `vitest.config.js` file in the root directory:

   ```javascript
   // vitest.config.js
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
   	plugins: [react()],
   	test: {
   		globals: true,
   		environment: 'jsdom',
   		setupFiles: './tests/setupTests.js',
   	},
   });
   ```

2. **Create a Test Setup File**

   Create `tests/setupTests.js` to set up testing utilities:

   ```javascript
   // tests/setupTests.js
   import '@testing-library/jest-dom';
   ```

3. **Update `package.json` Scripts**

   ```json
   {
   	"scripts": {
   		"dev": "vite",
   		"build": "vite build",
   		"preview": "vite preview",
   		"test": "vitest",
   		"test:watch": "vitest --watch",
   		"coverage": "vitest run --coverage"
   	}
   }
   ```

### Designing the To-Do List Application

**Features:**

- Display a list of to-do items fetched from an API.
- Add a new to-do item.
- Mark a to-do item as completed.
- Delete a to-do item.

**API Endpoints:**

- `GET /api/todos`: Fetch all to-dos.
- `POST /api/todos`: Add a new to-do.
- `PUT /api/todos/:id`: Update a to-do.
- `DELETE /api/todos/:id`: Delete a to-do.

### Implementing the Application with TDD

#### Creating the `ToDoList` Component

##### Step 1: Write the Test (Red)

Create `src/tests/ToDoList.test.jsx`:

```jsx
// src/tests/ToDoList.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ToDoList } from '../components/ToDoList';

const mockTodos = [
	{ id: 1, title: 'Buy groceries', completed: false },
	{ id: 2, title: 'Walk the dog', completed: true },
];

const server = setupServer(
	rest.get('/api/todos', (req, res, ctx) => {
		return res(ctx.json(mockTodos));
	}),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders to-do items fetched from API', async () => {
	render(<ToDoList />);

	expect(screen.getByText(/loading/i)).toBeInTheDocument();

	const items = await screen.findAllByRole('listitem');
	expect(items).toHaveLength(2);
	expect(screen.getByText('Buy groceries')).toBeInTheDocument();
	expect(screen.getByText('Walk the dog')).toBeInTheDocument();
});
```

**Explanation:**

- We set up an MSW server to mock the API response.
- The test checks that the loading indicator appears.
- It waits for the to-do items to be rendered.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The test fails because `ToDoList` component doesn't exist.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Create `src/components/ToDoList.jsx`:

```jsx
// src/components/ToDoList.jsx
import React, { useEffect, useState } from 'react';

export function ToDoList() {
	const [todos, setTodos] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/todos')
			.then((res) => res.json())
			.then((data) => {
				setTodos(data);
				setLoading(false);
			});
	}, []);

	if (loading) return <div>Loading…</div>;

	return (
		<ul>
			{todos.map((todo) => (
				<li key={todo.id}>
					{todo.title} {todo.completed ? '(Completed)' : ''}
				</li>
			))}
		</ul>
	);
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm run test
```

The test should pass.

##### Step 5: Refactor (if necessary)

No immediate refactoring needed.

#### Fetching To-Dos From an API

We've already implemented fetching to-dos in the previous step.

#### Adding a New To-Do

##### Step 1: Write the Test (Red)

Update `src/tests/ToDoList.test.jsx`:

```jsx
import userEvent from '@testing-library/user-event';

// … previous imports and setup …

test('adds a new to-do item', async () => {
  render(<ToDoList />);

  const input = screen.getByPlaceholderText('Add new to-do');
  const addButton = screen.getByRole('button', { name: /add/i });

  await userEvent.type(input, 'Learn TDD');
  await userEvent.click(addButton);

  // Mock the POST request
  server.use(
    rest.post('/api/todos', (req, res, ctx) => {
      return res(ctx.status(201), ctx.json({ id: 3, title: 'Learn TDD', completed: false }));
    })
  );

  // Mock the updated GET request
  server.use(
    rest.get('/api/todos', (req, res, ctx) => {
      return res(ctx.json([…mockTodos, { id: 3, title: 'Learn TDD', completed: false }]));
    })
  );

  const newItem = await screen.findByText('Learn TDD');
  expect(newItem).toBeInTheDocument();
});
```

**Explanation:**

- We simulate typing into the input and clicking the add button.
- We mock the POST request and the subsequent GET request to include the new item.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The test fails because the input and button don't exist.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/components/ToDoList.jsx`:

```jsx
import React, { useEffect, useState } from 'react';

export function ToDoList() {
	const [todos, setTodos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [newTodo, setNewTodo] = useState('');

	useEffect(() => {
		fetchTodos();
	}, []);

	function fetchTodos() {
		fetch('/api/todos')
			.then((res) => res.json())
			.then((data) => {
				setTodos(data);
				setLoading(false);
			});
	}

	function addTodo() {
		fetch('/api/todos', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: newTodo }),
		}).then(() => {
			setNewTodo('');
			fetchTodos();
		});
	}

	if (loading) return <div>Loading…</div>;

	return (
		<div>
			<input
				placeholder="Add new to-do"
				value={newTodo}
				onChange={(e) => setNewTodo(e.target.value)}
			/>
			<button onClick={addTodo}>Add</button>

			<ul>
				{todos.map((todo) => (
					<li key={todo.id}>
						{todo.title} {todo.completed ? '(Completed)' : ''}
					</li>
				))}
			</ul>
		</div>
	);
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm run test
```

The test should pass.

##### Step 5: Refactor (if necessary)

Consider error handling and optimizing state updates.

#### Marking a To-Do as Completed

##### Step 1: Write the Test (Red)

Update `src/tests/ToDoList.test.jsx`:

```jsx
test('marks a to-do item as completed', async () => {
	render(<ToDoList />);

	const itemCheckbox = await screen.findByRole('checkbox', { name: 'Buy groceries' });
	expect(itemCheckbox).not.toBeChecked();

	// Mock the PUT request
	server.use(
		rest.put('/api/todos/1', (req, res, ctx) => {
			return res(ctx.json({ id: 1, title: 'Buy groceries', completed: true }));
		}),
	);

	await userEvent.click(itemCheckbox);

	expect(itemCheckbox).toBeChecked();
});
```

**Explanation:**

- We find the checkbox associated with the to-do item.
- We mock the PUT request to update the to-do item.
- We simulate clicking the checkbox and assert that it's checked.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The test fails because the checkbox doesn't exist.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/components/ToDoList.jsx`:

```jsx
function toggleComplete(todo) {
  fetch(`/api/todos/${todo.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ …todo, completed: !todo.completed }),
  }).then(() => {
    fetchTodos();
  });
}

// … in the return statement …

<ul>
  {todos.map((todo) => (
    <li key={todo.id}>
      <label>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleComplete(todo)}
          aria-label={todo.title}
        />
        {todo.title}
      </label>
    </li>
  ))}
</ul>
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm run test
```

The test should pass.

##### Step 5: Refactor (if necessary)

Optimize `fetchTodos` to avoid unnecessary network calls.

#### Deleting a To-Do

##### Step 1: Write the Test (Red)

Update `src/tests/ToDoList.test.jsx`:

```jsx
test('deletes a to-do item', async () => {
  render(<ToDoList />);

  const deleteButton = await screen.findByRole('button', { name: 'Delete Buy groceries' });

  // Mock the DELETE request
  server.use(
    rest.delete('/api/todos/1', (req, res, ctx) => {
      return res(ctx.status(200));
    })
  );

  // Mock the updated GET request
  server.use(
    rest.get('/api/todos', (req, res, ctx) => {
      return res(ctx.json(mockTodos.filter((todo) => todo.id !== 1)));
    })
  );

  await userEvent.click(deleteButton);

  expect(screen.queryByText('Buy groceries')).not toBeInTheDocument();
});
```
