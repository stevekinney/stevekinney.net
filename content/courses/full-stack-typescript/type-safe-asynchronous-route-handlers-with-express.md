---
modified: 2025-03-15T15:17:08-06:00
---

Express doesn't natively handle promises, which can lead to unhandled rejections. A type-safe wrapper helps:

```typescript
// Define a wrapper for async route handlers
function asyncHandler<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = ParsedQs>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// Use it with async routes
app.get(
  '/users/:id',
  asyncHandler<{ id: string }, UserResponse>(async (req, res) => {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' } as any);
    }

    res.json(user);
  }),
);
```

This pattern ensures that any errors in async handlers are properly passed to Express's error handling middleware.
