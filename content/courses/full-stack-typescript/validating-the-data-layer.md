---
title: Validating the Data Layer
modified: '2025-07-29T15:09:56-06:00'
description: >-
  Explore methods to validate your database layer using TypeScript, emphasizing
  the TaskClient class to perform CRUD operations securely.
date: '2025-03-20T08:54:40-05:00'
---

We're still putting a lot of trust in our database layer as well. We should make sure that it's also giving us back what we think it is.

There are a number of ways to go about this, but we might start with a simple abstraction.

```ts
class TaskClient {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async getTasks({ completed }: { completed: boolean }) {
    const query = completed
      ? await this.database.prepare('SELECT * FROM tasks WHERE completed = 1')
      : await this.database.prepare('SELECT * FROM tasks WHERE completed = 0');

    return TasksSchema.parse(await query.all());
  }

  async getTask(id: number) {
    const query = await this.database.prepare('SELECT * FROM tasks WHERE id = ?');
    return TaskSchema.or(z.undefined()).parse(await query.get([id]));
  }

  async createTask({ task }: { task: NewTask }) {
    const query = await this.database.prepare(
      'INSERT INTO tasks (title, description) VALUES (?, ?)',
    );
    await query.run([task.title, task.description]);
  }

  async updateTask(id: number, task: NewTask) {
    const previous = TaskSchema.parse(await this.getTask(id));
    const updated = { ...previous, ...task };

    const query = await this.database.prepare(
      `UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?`,
    );

    await query.run([updated.title, updated.description, updated.completed, id]);
  }

  async deleteTask(id: number) {
    const query = await this.database.prepare('DELETE FROM tasks WHERE id = ?');
    await query.run([id]);
  }
}
```

## Adding Our Task Model to Our API Layer
