---
title: Global Error Types in Express
description: >-
  Learn how to define and implement standardized error types across your Express
  application for consistent error handling.
modified: 2025-04-16T12:27:20-06:00
---

For a consistent approach across your application, define error types in a central location:

```typescript
// errors.ts
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface ErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
    details?: unknown;
  };
}

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown;

  constructor(message: string, code: ErrorCode, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, ErrorCode.NOT_FOUND, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

// Additional error classes…
```

Then use these types across your application:

```typescript
import { NotFoundError, ValidationError, ErrorResponse } from './errors';

app.get(
  '/users/:id',
  (req: Request<{ id: string }>, res: Response<UserResponse | ErrorResponse>) => {
    // Route implementation…
  },
);
```
