### Typed Error Middleware

Express error middleware has a distinct signature:

```typescript
// Define structured error types
interface AppError extends Error {
	statusCode: number;
	code: string;
	details?: unknown;
}

// Create typed error classes
class NotFoundError extends Error implements AppError {
	statusCode = 404;
	code = 'NOT_FOUND';

	constructor(message = 'Resource not found') {
		super(message);
		this.name = 'NotFoundError';
	}
}

class ValidationError extends Error implements AppError {
	statusCode = 400;
	code = 'VALIDATION_ERROR';
	details: unknown;

	constructor(message = 'Validation failed', details?: unknown) {
		super(message);
		this.name = 'ValidationError';
		this.details = details;
	}
}

// Create a type-safe error handler
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
	console.error(err);

	// Handle known error types
	if ('statusCode' in err && 'code' in err) {
		const appError = err as AppError;

		return res.status(appError.statusCode).json({
			error: {
				message: appError.message,
				code: appError.code,
				...(appError.details && { details: appError.details }),
			},
		});
	}

	// Handle unknown errors
	res.status(500).json({
		error: {
			message: 'Internal server error',
			code: 'INTERNAL_ERROR',
		},
	});
}

// Register the error handler (must be last)
app.use(errorHandler);

// Usage in routes
app.get(
	'/users/:id',
	asyncHandler(async (req, res) => {
		const user = await getUserById(req.params.id);

		if (!user) {
			throw new NotFoundError(`User with ID ${req.params.id} not found`);
		}

		res.json(user);
	}),
);

app.post(
	'/users',
	asyncHandler(async (req, res) => {
		try {
			// Validation logic
			const validatedData = validateUser(req.body);

			// Create user
			const user = await createUser(validatedData);

			res.status(201).json(user);
		} catch (error) {
			if (error.name === 'ValidationError') {
				throw new ValidationError('User validation failed', error.details);
			}
			throw error;
		}
	}),
);
```

This structured approach to error handling ensures that:

1. All errors are properly typed
2. Error responses follow a consistent format
3. Different error types result in appropriate HTTP status codes
4. Error details are preserved when needed
