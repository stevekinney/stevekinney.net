---
modified: 2025-03-15T15:32:23-06:00
title: Branded Types with Express
description: Learn how to use branded types in Express applications to enhance type safety for IDs, tokens, and other special string values.
---

Sometimes basic types aren't enough. For IDs, tokens, and other special strings, we can use branded types:

```typescript
// Define branded types
type UserId = string & { readonly _brand: unique symbol };
type SessionToken = string & { readonly _brand: unique symbol };

// Create functions to safely create branded types
function createUserId(id: string): UserId {
	return id as UserId;
}

function createSessionToken(token: string): SessionToken {
	return token as SessionToken;
}

// Use in request and response types
interface GetUserRequest {
	params: {
		userId: UserId;
	};
}

interface UserResponse {
	id: UserId;
	username: string;
	email: string;
}

interface AuthResponse {
	token: SessionToken;
	user: UserResponse;
}

// Example usage
app.get('/users/:userId', (req: Request<GetUserRequest['params']>, res: Response<UserResponse>) => {
	const rawUserId = req.params.userId;

	// Convert string to branded type
	const userId = createUserId(rawUserId);

	// Now we have a type-safe userId that can't be confused with other string IDs
	const user = getUserById(userId);

	res.json(user);
});

app.post('/login', (req: Request, res: Response<AuthResponse>) => {
	// Generate a session token
	const token = createSessionToken(generateRandomToken());

	// Get user
	const userId = createUserId('123');
	const user = getUserById(userId);

	// Return typed response
	res.json({
		token,
		user,
	});
});
```

Branded types ensure that you don't accidentally mix up different types of IDs or tokens, even though they're all strings underneath.
