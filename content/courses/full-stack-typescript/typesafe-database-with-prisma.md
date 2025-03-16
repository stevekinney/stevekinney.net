---
title: Type-Safe Database Access with Prisma
description: A comprehensive guide to using Prisma with tRPC, Express, and TypeScript for end-to-end type safety in your database operations.
date: 2025-03-15T17:00:07-06:00
modified: 2025-03-15T17:00:07-06:00
---

Below is a detailed guide on using **tRPC**, **Express**, **TypeScript**, and **Prisma** together—complete with instructions on setting up Prisma, using it in your tRPC context, and writing type-safe queries with minimal heartbreak. Buckle up!

## Why Prisma?

Before we get into the details, here’s the elevator pitch for Prisma:

- **Type-Safe Database Queries**: Prisma auto-generates a TypeScript client based on your database schema. You get intellisense for fields, auto-completion for relations, and compile-time errors for invalid queries—so you can’t query a field that doesn’t exist.
- **Declarative Schema**: You define your database structure in `prisma/schema.prisma`, and Prisma orchestrates migrations for you (including generating SQL).
- **Broad Support**: Works with PostgreSQL, MySQL, SQLite, MongoDB, and more. (We’ll use PostgreSQL or SQLite as the example.)
- **Works Great with tRPC**: Because both Prisma and tRPC revolve around TypeScript, they integrate seamlessly to provide a strongly typed path from the DB, through the server, to your frontend.

## Project Setup

Assume we’re using a folder structure like:

```
my-app/
 ┣ server/  (Express + tRPC + Prisma)
 ┗ client/  (React or other frontend)
```

### Server Setup

### Initialize Server Project

```bash
mkdir server && cd server
npm init -y
npm install express @trpc/server @trpc/server/adapters/express zod
npm install -D typescript ts-node nodemon @types/node @types/express
```

### Install Prisma

```bash
npm install prisma
npx prisma init
```

The `init` command creates a new `prisma/` folder with a `schema.prisma` file and also sets up a `.env` file for your database connection string. (If you’re using SQLite, the `DATABASE_URL` might look like `file:./dev.db`.)

### Install the Prisma Client

```bash
npm install @prisma/client
```

After you define your schema and run `npx prisma generate`, Prisma will create your **Prisma Client** in `node_modules/.prisma/client`—the auto-generated TS/JS client that you’ll import in your app.

### Set up TypeScript

Create or update a `tsconfig.json` in the `server/` folder to your liking, for example:

```jsonc
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "CommonJS",
		"rootDir": "src",
		"outDir": "dist",
		"strict": true,
		"esModuleInterop": true,
	},
}
```

(Adjust as needed—this is just a sample.)

---

## Define Your Prisma Schema

Inside **`prisma/schema.prisma`**, specify your data models. For example, a simple `User` model:

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"  // or "sqlite", "mysql", etc.
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String?
  createdAt DateTime @default(now())
  // ...
}
```

- **`provider`** is your chosen database. If you’re using SQLite, set `provider = "sqlite"`.
- Add any fields you need: maybe `passwordHash` if you’re storing credentials (though do it carefully and securely!).

**Apply Migrations**:

```bash
npx prisma migrate dev --name init
```

This will create a migration file under `prisma/migrations/`, apply it to your database, and generate the Prisma Client.

---

## Using Prisma in Your Code

### 4.1. Create the Prisma Client

Make a file `server/src/db.ts` (or wherever) to export a singleton Prisma client:

```ts
// server/src/db.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

This ensures a single PrismaClient instance is used across your app. Re-initializing Prisma clients in multiple places can cause problems in some environments—so a singleton is typically best.

### 4.2. Integrate with tRPC Context

tRPC’s context runs on each request, so we can attach `prisma` to it:

```ts
// server/src/context.ts
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from './db';

export function createContext({ req, res }: CreateExpressContextOptions) {
	// Suppose we read an auth header to identify the user, etc...
	return {
		prisma,
		user: null, // or some logic to find a user from the token
	};
}
export type Context = ReturnType<typeof createContext>;
```

Now every tRPC procedure can access `ctx.prisma` to run queries.

### 4.3. Initialize tRPC

```ts
// server/src/trpc.ts
import { initTRPC } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
```

### 4.4. Build Some Routers

Let’s say we want a `userRouter` with a query to get users, plus a mutation to create new ones.

```ts
// server/src/routers/user.ts
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
	// Query: get a user by ID
	getById: publicProcedure.input(z.number()).query(async ({ ctx, input }) => {
		// input is the user ID
		return ctx.prisma.user.findUnique({
			where: { id: input },
		});
	}),

	// Mutation: create a new user
	createUser: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
				name: z.string().optional(), // optional name
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.user.create({
				data: {
					email: input.email,
					name: input.name,
				},
			});
		}),
});
```

**Notes**:

- We call `ctx.prisma.user.findUnique()` or `.create()` to talk to the DB.
- The method calls are fully type-safe thanks to the generated Prisma Client. If `User` doesn’t have a `nickname` field, TypeScript will complain if you try to use `nickname`.
- The `input` is validated by Zod, ensuring the `email` is in proper format.

### 4.5. Combine Routers & Expose the App

```ts
// server/src/index.ts

import { router } from './trpc';
import { userRouter } from './routers/user';

export const appRouter = router({
	user: userRouter,
	// other routers...
});

// Export type for client usage
export type AppRouter = typeof appRouter;
```

### 4.6. Create Express Server

```ts
// server/src/server.ts

import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from './context';
import { appRouter } from './index';
import cors from 'cors';

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
	console.log('Server running on http://localhost:4000');
});
```

Now, `prisma` is available inside every tRPC procedure via `ctx.prisma`.

---

## Frontend Integration

On the **client** side, it’s the same old tRPC story—**except** your data is from a Prisma DB behind the scenes. If you have a React + React Query setup:

```bash
cd ../client
npm install @trpc/client @trpc/react-query zod @tanstack/react-query
```

Create a `trpc.ts`:

```ts
// client/src/utils/trpc.ts
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/index';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
	links: [
		httpBatchLink({
			url: 'http://localhost:4000/trpc',
		}),
	],
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
	<trpc.Provider client={trpcClient} queryClient={queryClient}>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</trpc.Provider>,
);
```

And in your components:

```tsx
// client/src/App.tsx
import { trpc } from './utils/trpc';

function App() {
	const getUserQuery = trpc.user.getById.useQuery(1);
	const createUserMutation = trpc.user.createUser.useMutation();

	if (getUserQuery.isLoading) return <div>Loading...</div>;
	if (getUserQuery.error) return <div>Error: {getUserQuery.error.message}</div>;

	const user = getUserQuery.data;

	return (
		<div>
			<h1>Prisma + tRPC Example</h1>
			{user ? (
				<p>
					User {user.id}: {user.email} (Name: {user.name ?? 'N/A'})
				</p>
			) : (
				<p>No user found</p>
			)}
			<button
				onClick={() =>
					createUserMutation.mutate({
						email: 'new.user@example.com',
						name: 'New User',
					})
				}
			>
				Create User
			</button>
		</div>
	);
}

export default App;
```

That’s it—**end-to-end type safety** from the DB schema to your React queries. If you remove `name` from the Prisma schema, you’ll get compile-time feedback in your backend and/or front-end code.

---

## Example Queries & Migrations

### 6.1. More Complex Queries

Prisma queries can do a lot more. For instance, if you have a `Post` model that relates to `User`, you might do:

```ts
return ctx.prisma.post.findMany({
	where: { authorId: input.userId },
	include: { author: true },
});
```

**TypeScript** will automatically know `author` is a `User` object. You can also do sorting, filtering, partial selections, etc.

### 6.2. Migrations

As you modify your `schema.prisma`, you keep your database in sync via:

```bash
npx prisma migrate dev --name add-post-model
```

**Pro tip**: Run `npx prisma format` to auto-format the schema. Also, use `npx prisma studio` to open a local UI to view/edit data in your DB—handy for quick debugging or tinkering.

---

## Testing

### 7.1. Server Testing

You can test your tRPC procedures using `appRouter.createCaller()` directly, bypassing HTTP:

```ts
// server/test/userRouter.test.ts
import { test, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../src';
import { prisma } from '../src/db';

test('create and fetch user', async () => {
	const caller = appRouter.createCaller({ prisma, user: null });

	const newUser = await caller.user.createUser({
		email: 'alice@example.com',
		name: 'Alice',
	});
	expect(newUser).toMatchObject({
		email: 'alice@example.com',
		name: 'Alice',
	});

	const fetched = await caller.user.getById(newUser.id);
	expect(fetched?.email).toBe('alice@example.com');
});
```

- **Initialize DB**: If you’re using a test DB (like a local Postgres or an in-memory SQLite file), you can run migrations before tests. Or you can do a fresh DB in each test for isolation.
- **Cleanup**: For Postgres, you may want to remove test data or spin up a Docker container for ephemeral DB usage.

### 7.2. Integration or E2E Testing

If you prefer a more “real-world” approach, spin up your Express server and test it with a tool like `supertest`. Or do a full end-to-end test with Cypress/Playwright that hits your local dev server in the browser. The specifics depend on how big your app is and how paranoid you are about untested code. (Pro tip: be at least a little paranoid.)

---

## Best Practices & Tips

### Use `strict`

### Singleton Prisma Client

### Error Handling

- Throw `TRPCError` for predictable error codes (`UNAUTHORIZED`, `FORBIDDEN`, etc.).
- Let Zod handle validation errors.
- Prisma might throw if you violate DB constraints, so either handle that or let it bubble up as a generic error.

### Relationships

### Performance

### Deployment

- You deploy the Express server as usual (AWS, Heroku, a container, etc.).
- For serverless, Prisma has official guidelines, especially if you’re using a managed DB.

### Maintaining Migrations

---

## Wrapping Up

With Prisma integrated into your tRPC + Express server, you now have:

- **Type-Safe DB** → **Server** → **Client** calls.
- **Declarative DB schema** in `prisma/schema.prisma`.
- Automatic TypeScript definitions for all tables/fields.
- The convenience of tRPC’s “call procedures like local functions” approach.

In short, it’s a developer experience that aims to keep you from losing hair over schema mismatches or random SQL injection nightmares. As your app grows, you’ll find having consistent, reliable types across the stack is a lifesaver—especially when your DB gets more complex.
