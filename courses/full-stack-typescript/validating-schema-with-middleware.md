---
title: Validating Schema with Middleware
description: >-
  Learn to create middleware for validating request bodies using Zod schemas in
  TypeScript, ensuring data integrity for `POST` and `PUT` operations in your
  Express applications.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-20T08:54:40-05:00'
---

We could create a middleware that allows us to validate the body of a request with a Zod schema.

```ts
const validateBody =
  (schema: ZodSchema) => (request: Request, response: Response, next: NextFunction) => {
    try {
      schema.parse(request.body);
      next();
    } catch (error) {
      return handleError(request, response, error);
    }
  };
```

Even better, we could try to hold on to the type.

```ts
const validateBody =
  <T>(schema: ZodSchema<T>): RequestHandler<NonNullable<unknown>, NonNullable<unknown>, T> =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      schema.parse(request.body);
      next();
    } catch (error) {
      return handleError(request, response, error);
    }
  };
```

## Validating `POST`

```ts
app.post('/tasks', validateBody(NewTaskSchema), async (req, res) => {
  try {
    const task = NewTaskSchema.parse(req.body);
    await createTask.run([task.title, task.description]);
    return res.sendStatus(201);
  } catch (error) {
    return handleError(req, res, error);
  }
});
```

## Validating `PUT`

```ts
app.put('/tasks/:id', validateBody(UpdateTaskSchema), async (req, res) => {
  try {
    const { id } = TaskParamsSchema.parse(req.params);

    const previous = TaskSchema.parse(await getTask.get([id]));
    const updates = req.body;
    const task = { ...previous, ...updates };

    await updateTask.run([task.title, task.description, task.completed, id]);
    return res.sendStatus(200);
  } catch (error) {
    return handleError(req, res, error);
  }
});
```

**Next**: [Validating Query and Path Parameters with Middleware](validating-query-and-path-parameters.md)
