---
title: Adding Types to Express
modified: 2025-03-15T15:02:03-06:00
---

Express's typing system wasn't built with TypeScript in mind. The `@types/express` package provides essential typings, but using them effectively requires understanding their intricacies.

Express primarily revolves around three core types:

```typescript
import { Request, Response, NextFunction } from 'express';

app.get('/users', (req: Request, res: Response, next: NextFunction) => {
	// Route handler logic
});
```

The Request and Response interfaces are generic:

```typescript
interface Request<
	P = ParamsDictionary,
	ResBody = any,
	ReqBody = any,
	ReqQuery = ParsedQs,
	Locals extends Record<string, any> = Record<string, any>,
> extends core.Request {}

interface Response<ResBody = any, Locals extends Record<string, any> = Record<string, any>>
	extends core.Response {}
```

Those `any` types are danger zones. They represent the wild, untamed parts of your API contract that TypeScript can't verify. Our mission is to replace them with precise types that reflect your API's actual behavior.

## Request Parameters

Request parameters arrive through three channels: URL parameters, query strings, and request bodies. Each requires distinct typing strategies.

### Typing URL Parameters

URL parameters represent path variables in your route definitions:

```typescript
// Define the parameter structure
interface UserParams {
	userId: string;
}

app.get('/users/:userId', (req: Request<UserParams>, res: Response) => {
	// TypeScript now knows req.params.userId exists and is a string
	const userId = req.params.userId;
});
```

This approach works, but it has a limitation: TypeScript doesn't verify that your parameter names in the route string match your interface. For that, we need additional tooling like [`express-validator`](https://npm.im/express-validator) or advanced techniques we'll explore later.

### Typing Query Parameters

Query strings present a unique challenge because they're optional by nature and can appear multiple times:

```typescript
interface UserQuery {
	sort?: string;
	filter?: string;
	page?: string; // Query params are always strings with basic Express typing
}

app.get('/users', (req: Request<{}, {}, {}, UserQuery>, res: Response) => {
	// TypeScript knows about req.query.sort, req.query.filter, etc.
	const page = Number(req.query.page || '1');
});
```

Notice the empty objects in the Request generic—they represent params and body, which aren't used in this route.

### Typing Request Bodies

Request bodies usually come from `POST`, `PUT`, or `PATCH` requests:

```typescript
interface CreateUserBody {
	username: string;
	email: string;
	password: string;
}

app.post('/users', (req: Request<{}, {}, CreateUserBody>, res: Response) => {
	// TypeScript knows req.body has username, email, and password properties
	const { username, email, password } = req.body;
});
```

But there's a catch: Express doesn't validate that the incoming request matches your interface. A malicious or malformed request could send completely different data, and TypeScript wouldn't catch it at runtime.

### Holistic Request Typing

For routes that use multiple parameter sources, you can combine these approaches:

```typescript
interface UserRequest {
	params: {
		userId: string;
	};
	query: {
		fields?: string;
	};
	body: {
		name?: string;
		email?: string;
	};
}

app.patch(
	'/users/:userId',
	(
		req: Request<UserRequest['params'], {}, UserRequest['body'], UserRequest['query']>,
		res: Response,
	) => {
		// Fully typed request with params, query, and body
	},
);
```

This pattern gets verbose quickly. To manage complexity, we'll explore custom type helpers later.

## Extending the Request Object

Express allows extending the Request object with custom properties, often done in middleware. TypeScript needs to know about these extensions.

### Declaring Request Extensions

The Express namespace allows augmenting the Request interface:

```typescript
// In a declaration file (e.g., types.d.ts)
declare namespace Express {
	interface Request {
		user?: {
			id: string;
			roles: string[];
		};
		requestId: string;
	}
}

// Now this works everywhere
app.get('/profile', (req: Request, res: Response) => {
	// TypeScript knows req.user and req.requestId exist
	if (req.user) {
		// Do something with the authenticated user
	}
});
```

This approach works well for application-wide extensions, but it has drawbacks:

1. It applies the extension globally, even where it might not be valid
2. It doesn't provide compile-time guarantees that middleware has actually attached these properties

### Middleware-Specific Extensions

For more precise control, we can use middleware to guarantee properties exist:

```typescript
// Define a middleware that attaches user data
const attachUser: RequestHandler = (req, res, next) => {
	// Authenticate and attach user
	req.user = { id: '123', roles: ['admin'] };
	next();
};

// Create a type guard to verify user exists
function ensureAuth(req: Request, res: Response, next: NextFunction): void {
	if (!req.user) {
		return res.status(401).send('Unauthorized');
	}
	next();
}

// Use them together to ensure type safety
app.get('/admin', attachUser, ensureAuth, (req: Request, res: Response) => {
	// TypeScript now knows req.user exists and is non-null
	const { id, roles } = req.user; // No need for null check
});
```

For more sophisticated patterns, we can create custom middleware types:

```typescript
// Define a custom request type with guaranteed user property
interface AuthenticatedRequest extends Request {
	user: {
		id: string;
		roles: string[];
	};
}

// Define middleware that guarantees the user property
function authenticateMiddleware(req: Request, res: Response, next: NextFunction): void {
	// Authentication logic...
	(req as AuthenticatedRequest).user = { id: '123', roles: ['user'] };
	next();
}

// Define a route handler that uses the authenticated request
function adminHandler(req: AuthenticatedRequest, res: Response): void {
	// TypeScript knows req.user exists and has the correct shape
	const { id, roles } = req.user;

	if (!roles.includes('admin')) {
		return res.status(403).send('Forbidden');
	}

	res.send(`Welcome, admin ${id}!`);
}

// Wire it all together
app.get('/admin', authenticateMiddleware, adminHandler);
```

This pattern ensures that the route handler only runs when `req.user` exists, providing both runtime _and_ compile-time guarantees.
