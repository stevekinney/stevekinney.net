---
title: Advanced Validation Techniques in Express with TypeScript
description: Learn how to implement object-oriented validation in Express using class-validator and class-transformer libraries.
modified: 2025-03-15T16:15:00-06:00
---

While basic type checking and libraries like [Zod](https://www.npmjs.com/package/zod) provide robust validation, advanced scenarios may require more sophisticated techniques. This guide explores using [`class-validator`](https://www.npmjs.com/package/class-validator) and [`class-transformer`](https://www.npmjs.com/package/class-transformer) for object-oriented validation, as well as crafting custom type guards for complex logic.

## Object-Oriented Validation with `class-validator` and `class-transformer`

`class-validator` and `class-transformer` work synergistically to provide powerful object-oriented validation. `class-validator` uses decorators to define validation rules, while `class-transformer` handles object transformations.

### Installation

```bash
npm install class-validator class-transformer reflect-metadata
```

This installs:

- [`class-validator`](https://www.npmjs.com/package/class-validator): For decorator-based validation
- [`class-transformer`](https://www.npmjs.com/package/class-transformer): For object transformation
- [`reflect-metadata`](https://www.npmjs.com/package/reflect-metadata): Required for decorator metadata

### Enable Decorator Metadata:

Ensure `reflect-metadata` is imported at the top of your entry file (e.g., `index.ts`):

```typescript
import 'reflect-metadata'; // Import reflect-metadata once in your app
```

Also, ensure that your `tsconfig.json` has the following options enabled:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
		// ... other options
	}
}
```

### Define Validation Classes:

Create classes that represent your request bodies, and use decorators from `class-validator` to define validation rules.

```typescript
import { IsString, IsEmail, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserDto {
	@IsString()
	@MinLength(3)
	username: string;

	@IsEmail()
	email: string;

	@IsString()
	@MinLength(8)
	password: string;

	@IsOptional()
	@IsInt()
	@Min(18)
	@Max(120)
	age?: number;
}
```

### Validation Middleware:

Create middleware to validate incoming requests using `class-validator` and `class-transformer`.

```typescript
import { Request, Response, NextFunction } from 'express';
import { validate, plainToClass } from 'class-transformer';
import { CreateUserDto } from './dtos/create-user.dto'; // Assuming your DTO is in dtos/create-user.dto

export async function validateDto(req: Request, res: Response, next: NextFunction) {
	const dto = plainToClass(CreateUserDto, req.body);
	const errors = await validate(dto);

	if (errors.length > 0) {
		return res.status(400).json({ errors: errors.map((e) => e.constraints) });
	}

	req.body = dto; // Replace req.body with the transformed and validated DTO
	next();
}
```

### Using Validation Middleware in Routes:

Apply the middleware to your routes.

```typescript
import express, { Request, Response } from 'express';
import { validateDto } from './middleware/validate.dto'; // Assuming your middleware is in middleware/validate.dto
import { CreateUserDto } from './dtos/create-user.dto';

const app = express();
app.use(express.json());

app.post('/users', validateDto, (req: Request<{}, {}, CreateUserDto>, res: Response) => {
	// req.body is now a validated instance of CreateUserDto
	const { username, email, password, age } = req.body;
	// ... create user logic
	res.status(201).json({ message: 'User created' });
});
```

## Custom Type Guards for Complex Validation

For validation logic that goes beyond simple decorators, custom type guards offer flexibility.

### Example: Validating a Custom Date Format

```typescript
function isValidCustomDate(value: any): value is string {
	if (typeof value !== 'string') {
		return false;
	}

	const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
	return regex.test(value);
}

interface EventRequest {
	startTime: string; // Must be a custom date format
}

function validateEventRequest(req: Request, res: Response, next: NextFunction) {
	const { startTime } = req.body as EventRequest;

	if (!isValidCustomDate(startTime)) {
		return res.status(400).json({ error: 'Invalid start time format' });
	}

	next();
}

app.post('/events', validateEventRequest, (req: Request<any, any, EventRequest>, res: Response) => {
	// req.body.startTime is now guaranteed to be a valid custom date string
	res.json({ message: 'Event created' });
});
```

### Benefits

- **Object-Oriented Validation:** `class-validator` and `class-transformer` provide a structured approach to validation.
- **Reusability:** Validation classes and middleware can be reused across your application.
- **Flexibility:** Custom type guards handle complex validation logic.
- **Readability:** Decorators and type guards improve code readability.
