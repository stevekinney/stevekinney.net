---
title: Type-Safe Middleware with Express
description: Add type-safety to middleware when using Express.

modified: 2025-04-16T12:27:20-06:00
---

### Type-Safe Middleware Chains

Express middleware can be challenging to type correctly, especially when middleware adds properties to the request:

```typescript
// Define middleware that adds user to request
interface RequestWithUser extends Request {
  user: {
    id: UserId;
    roles: string[];
  };
}

function attachUser(req: Request, res: Response, next: NextFunction): void {
  // Authenticate and attach user
  (req as RequestWithUser).user = {
    id: createUserId('123'),
    roles: ['user'],
  };
  next();
}

// Type guard middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!('user' in req)) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

// Create a type-safe middleware chain builder
function createProtectedRoute<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
>(
  handler: (
    req: RequestWithUser & Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => void,
) {
  return [attachUser, isAuthenticated, handler as RequestHandler];
}

// Use it to define protected routes
app.get(
  '/admin',
  ...createProtectedRoute<{}, { message: string }>((req, res) => {
    // req.user is properly typed and guaranteed to exist
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ message: 'Welcome to admin area' });
  }),
);
```

This pattern guarantees that `req.user` exists and is properly typed in your route handler, with both compile-time and runtime checks.
