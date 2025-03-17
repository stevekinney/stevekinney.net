---
modified: 2025-03-15T16:36:24-06:00
title: tRPC on the Server
description: Learn how to set up a tRPC server with Express to create type-safe API endpoints with routers, procedures, and contexts.
---

## Install Dependencies

```bash
npm install express @trpc/server @trpc/server/adapters/express zod sqlite3
npm install -D typescript ts-node nodemon @types/node @types/express
```

- **express**: for our HTTP server.
- **@trpc/server** & **@trpc/server/adapters/express**: for tRPC core & its Express integration.
- **zod**: schema validation library (the unstoppable input-validation sidekick).
- **sqlite3**: our sample DB driver (because “SQLite or bust” for quick examples).
- **TypeScript toolchain**: you know why.

## Defining the tRPC API

tRPC works around **routers** (collections of procedures) and **procedures** (functions that can be queries, mutations, or subscriptions).

### Basic tRPC Initialization

Create a file like `server/src/trpc.ts`:

```ts
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;
```

- `t.router` is how we define groups of endpoints.
- `publicProcedure` is our basic “unprotected” procedure factory (we’ll make an “authenticated” version later).

Let’s define a simple router for `User`—with a “get” query and a “create” mutation. We’ll store data in SQLite:

```ts
// server/src/routers/user.ts

import { publicProcedure, router } from '../trpc';
import { z } from 'zod';
import { db } from '../db'; // your SQLite instance/connection

export const userRouter = router({
	// Query to get a user by ID
	getUser: publicProcedure.input(z.number()).query(({ input }) => {
		const stmt = db.prepare('SELECT id, name FROM user WHERE id = ?');
		const user = stmt.get(input);
		return user || null;
	}),

	// Mutation to create a new user
	createUser: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				password: z.string().min(4),
			}),
		)
		.mutation(({ input }) => {
			const stmt = db.prepare(`
        INSERT INTO user (name, password) VALUES (?, ?)
      `);
			const result = stmt.run(input.name, input.password);
			return { id: result.lastInsertRowid, name: input.name };
		}),
});
```

- **`getUser`**: Validates the input is a `number`; returns the user or `null`.
- **`createUser`**: Accepts a name & password; inserts into the DB. Don’t actually store passwords in plaintext—hash them. This is just a bad example for demonstration.

### Combine Multiple Routers

Eventually, you’ll have more routers (`postsRouter`, `commentsRouter`, etc.). Combine them into a single `appRouter`:

```ts
// server/src/index.ts

import { router } from './trpc';
import { userRouter } from './routers/user';

export const appRouter = router({
	user: userRouter,
	// add more routers here…
});

export type AppRouter = typeof appRouter;
```

### tRPC Context

The **context** gets created for each request—handy for auth, DB connections, or reading headers. You can attach a user object, for example:

```ts
// server/src/context.ts

import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db } from './db';

export function createContext({ req, res }: CreateExpressContextOptions) {
	const authHeader = req.headers.authorization;
	let user = null;

	if (authHeader) {
		// e.g., treat the header as "user ID" for simplicity
		const userId = authHeader;
		user = db.prepare('SELECT id, name FROM user WHERE id = ?').get(userId);
	}

	return { user, db };
}
export type Context = ReturnType<typeof createContext>;
```

Then tell tRPC about the context type:

```ts
// server/src/trpc.ts

import { initTRPC } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();
// ...
```

---

## Express.js Setup

Time to make the server. In `server/src/server.ts`:

```ts
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import { appRouter } from './index';
import { createContext } from './context';

const app = express();
app.use(cors());

app.use(
	'/trpc',
	trpcExpress.createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

app.listen(4000, () => {
	console.log('tRPC server running at http://localhost:4000');
});
```

That’s it! All requests to `/trpc` are handled by tRPC. For developer sanity, you might want to add `onError` for logging:

```ts
trpcExpress.createExpressMiddleware({
	router: appRouter,
	createContext,
	onError({ error, path, type }) {
		console.error(`Tsk, tsk! Error on ${path} [${type}]:`, error);
	},
});
```
