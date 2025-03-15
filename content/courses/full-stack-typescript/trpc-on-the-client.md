---
modified: 2025-03-15T16:35:27-06:00
title: tRPC on the Client
---

For React + React Query:

```bash
npm install react react-dom zod @trpc/client @trpc/react-query @tanstack/react-query
```

This allows you to use tRPC hooks in React that rely on React Query’s caching and concurrency magic.

## Building the Client

You can call the tRPC server from anywhere:

- **Vanilla**: Use the `@trpc/client` low-level functions.
- **React**: Use `@trpc/react-query` for sweet React Query integration.

### Vanilla Example

```ts
// client/src/index.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/src/index';

const client = createTRPCClient<AppRouter>({
	links: [httpBatchLink({ url: 'http://localhost:4000/trpc' })],
});

async function demoCalls() {
	try {
		const user = await client.user.getUser.query(1);
		console.log('User #1:', user);
	} catch (err) {
		console.error('Uh oh:', err);
	}

	const newUser = await client.user.createUser.mutate({
		name: 'Bob',
		password: 'secret123',
	});
	console.log('Created user:', newUser);
}

demoCalls();
```

### React Example

Install `@tanstack/react-query` and set things up:

```ts
// client/src/utils/trpc.ts

import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/index';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
	links: [httpBatchLink({ url: 'http://localhost:4000/trpc' })],
});
```

Wrap your React app:

```tsx
// client/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { trpc, trpcClient } from './utils/trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</trpc.Provider>
	</React.StrictMode>,
);
```

Then in a component:

```tsx
// client/src/App.tsx

import { trpc } from './utils/trpc';

function App() {
	const getUserQuery = trpc.user.getUser.useQuery(1);
	const createUserMutation = trpc.user.createUser.useMutation();

	if (getUserQuery.isLoading) return <div>Loading user…</div>;
	if (getUserQuery.error) return <div>Error: {getUserQuery.error.message}</div>;

	const user = getUserQuery.data;

	return (
		<div>
			<p>User: {user ? user.name : 'Not found'}</p>
			<button onClick={() => createUserMutation.mutate({ name: 'Alice', password: 'foobar' })}>
				Create user
			</button>
		</div>
	);
}

export default App;
```

All queries/mutations are fully type-safe. If the server changes the shape of user objects, your client code will break at build time—no more shipping bugs into production because of mismatched shapes.
