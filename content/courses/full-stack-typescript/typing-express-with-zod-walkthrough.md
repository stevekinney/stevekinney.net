---
title: 'Demonstration: Typing Express with Zod'
modified: 2025-04-16T12:27:20-06:00
description: >-
  Learn to integrate Zod schema validation in an Express app to ensure data
  integrity, covering tasks like creation, updates, and database queries with
  TypeScript.
---

Let's add some schema validation to our Express application. We'll start by sketching out our schemas.

```ts
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
});

const NewTaskSchema = TaskSchema.omit({ id: true, completed: true });
const UpdateTaskSchema = TaskSchema.partial().omit({ id: true });
```

## Validating Our Tasks from the Database

The first step is making sure what we're getting back from the database is valid.

```ts
// Validate the task
const result = TaskSchema.parse(task);

return res.json(result);
```

It'll technically blow up—but that's because SQLite stores our `completed` boolean as either a `1` or a `0`. Luckily, we can coerce it into what we're expecting.

```ts
const TaskSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.coerce.boolean(),
});
```

We could also choose to shorten everything like this:

```ts
const task = TaskSchema.or(z.undefined()).parse(await getTask.get([id]));
```

### Validating All the Tasks

We can do something similar to `/tasks`.

```ts
const TasksSchema = z.array(TaskSchema);
```

It'll now look like this:

```ts
app.get('/tasks', async (req: Request, res: Response) => {
  const { completed } = req.query;
  const query = completed === 'true' ? completedTasks : incompleteTasks;

  try {
    const tasks = TasksSchema.parse(await query.all());
    return res.json(tasks);
  } catch (error) {
    return handleError(req, res, error);
  }
});
```

## Adding Schema Validation to the Request Body

We can use `NewTaskSchema` here.

```ts
app.post('/tasks', async (req: Request, res: Response) => {
  try {
    const task = NewTaskSchema.parse(req.body);
    await createTask.run([task.title, task.description]);
    return res.sendStatus(201);
  } catch (error) {
    return handleError(req, res, error);
  }
});
```

### Updating Tasks

Again, there are no suprises here.

```ts
app.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const previous = TaskSchema.parse(await getTask.get([id]));
    const updates = UpdateTaskSchema.parse(req.body);
    const task = { ...previous, ...updates };

    await updateTask.run([task.title, task.description, task.completed, id]);
    return res.sendStatus(200);
  } catch (error) {
    return handleError(req, res, error);
  }
});
```

## Next

- [Validating Request Parameters](express-zod-params)
