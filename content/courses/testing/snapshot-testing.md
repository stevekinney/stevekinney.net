---
title: Snapshot Testing
description: Learn how to implement snapshot testing using Vitest framework.
modified: 2024-09-28T15:30:02-06:00
---

Snapshot testing is a powerful technique in software testing that captures the output of a piece of code and compares it against a reference snapshot stored alongside the test. If the output changes, the test fails, alerting developers to unexpected changes in the codebase.

This post explores how to implement snapshot testing using Vitest, a fast unit testing framework for modern JavaScript applications. We'll discuss best practices, benefits, and potential pitfalls, helping you understand when to use snapshots effectively.

## What is Snapshot Testing?

Snapshot testing involves saving the output of a function or component and comparing it to a saved "snapshot" on subsequent test runs. It's particularly useful for testing outputs that are complex or large, such as serialized objects, HTML structures, or API responses.

## How Does Snapshot Testing Work in Vitest?

Vitest provides built-in support for snapshot testing. When you run a test that includes `expect(value).toMatchSnapshot()`, Vitest will:

1. Generate a snapshot file (if it doesn't exist) containing the serialized value.
2. On subsequent runs, compare the current value to the saved snapshot.
3. Report any differences as test failures.

## Setting Up Snapshot Testing

**Basic Example:**

```javascript
// formatter.js
export function formatUser(user) {
	return `User: ${user.name}, Age: ${user.age}`;
}
```

**Test with Snapshot:**

```javascript
// formatter.test.js
import { test, expect } from 'vitest';
import { formatUser } from './formatter';

test('formats user information correctly', () => {
	const user = { name: 'Alice', age: 30 };
	const formattedUser = formatUser(user);
	expect(formattedUser).toMatchSnapshot();
});
```

**Explanation:**

- The first time the test runs, Vitest creates a snapshot file containing the output of `formatUser(user)`.
- On subsequent runs, Vitest compares the output to the snapshot.
- If the output changes, the test fails.

## Updating Snapshots

When intentional changes are made to the output, you can update the snapshots:

- Run `vitest -u` or `vitest --update` to update all snapshots.
- Alternatively, interactively update snapshots when prompted.

## Best Practices for Snapshot Testing

### Keep Snapshots Readable

Ensure that snapshot files are human-readable:

- Avoid capturing unnecessary data.
- Format complex objects for clarity.

Example:

```javascript
expect(JSON.stringify(largeObject, null, 2)).toMatchSnapshot();
```

### Use Descriptive Test Names

Clear test names help identify which snapshot corresponds to which test.

```javascript
test('formats user information with full details', () => {
	// Test code
});
```

### Review Snapshots During Code Reviews

Treat snapshot updates with the same scrutiny as code changes:

- Verify that changes are intentional.
- Ensure that unexpected changes are investigated.

### Limit Snapshot Size

Large snapshots are harder to review and maintain:

- Avoid snapshotting entire large objects or responses.
- Focus on the relevant parts of the output.

### Combine with Other Assertions

Use snapshots alongside explicit assertions for critical values:

```javascript
expect(user.name).toBe('Alice');
expect(formattedUser).toMatchSnapshot();
```

## When Are Snapshots Beneficial?

### Rapid Feedback on UI Changes

- **Use Case**: Testing serialized HTML or templated outputs.
- **Benefit**: Quickly detects unintended changes in the rendered output.

### Testing Serializations

- **Use Case**: Ensuring that objects are serialized consistently.
- **Benefit**: Catches changes in serialization logic that may affect data storage or transmission.

### Complex Outputs

- **Use Case**: Functions that return complex data structures.
- **Benefit**: Simplifies testing by avoiding numerous explicit assertions.

## Potential Pitfalls of Snapshot Testing

### Brittle Snapshots

**Issue**: Snapshots can become brittle if they capture irrelevant changes, leading to frequent unnecessary updates.

**Solution**:

- Keep snapshots focused on stable outputs.
- Exclude dynamic data like timestamps or IDs.

Example:

```javascript
const user = { name: 'Alice', id: 12345, createdAt: new Date() };
expect(user).toMatchSnapshot({
	id: expect.any(Number),
	createdAt: expect.any(Date),
});
```

### Over-reliance on Snapshots

**Issue**: Relying solely on snapshots may lead to missed bugs if the snapshot changes are not carefully reviewed.

**Solution**:

- Use snapshots as a complement to, not a replacement for, explicit assertions.
- Regularly review snapshot changes during code reviews.

### Large and Unwieldy Snapshots

**Issue**: Large snapshots are hard to read and maintain, reducing their effectiveness.

**Solution**:

- Limit the size of snapshots.
- Break down tests to focus on specific parts of the output.

### Ignoring Snapshot Failures

**Issue**: Developers may become desensitized to snapshot failures and update snapshots without proper investigation.

**Solution**:

- Encourage a culture of careful examination of snapshot changes.
- Only update snapshots when changes are intentional and understood.

## Strategies to Manage Brittle Snapshots

### Use Inline Snapshots

Vitest supports inline snapshots, which store the snapshot within the test file.

```javascript
test('formats user information correctly', () => {
	const user = { name: 'Alice', age: 30 };
	const formattedUser = formatUser(user);
	expect(formattedUser).toMatchInlineSnapshot(`"User: Alice, Age: 30"`);
});
```

**Benefits**:

- Easier to review and maintain small snapshots.
- Reduces the need to navigate between test and snapshot files.

### Customize Snapshot Serialization

Implement custom serializers to control how objects are serialized in snapshots.

```javascript
import { expect } from 'vitest';

expect.addSnapshotSerializer({
	test: (val) => val instanceof Date,
	serialize: (val) => val.toISOString(),
});
```

**Benefits**:

- Provides consistent serialization for complex or custom data types.
- Reduces noise in snapshots from irrelevant data.

### Use Property Matchers

Use matchers like `expect.any()` to ignore dynamic properties.

```javascript
expect(response).toMatchSnapshot({
	id: expect.any(Number),
	timestamp: expect.any(String),
});
```

**Benefits**:

- Focuses the snapshot on relevant data.
- Prevents snapshot failures due to expected variability.

## Examples in Practice

### Testing API Responses

```javascript
// apiClient.js
export async function fetchData() {
	const response = await fetch('/api/data');
	return response.json();
}
```

**Test with Snapshot:**

```javascript
// apiClient.test.js
import { test, expect } from 'vitest';
import { fetchData } from './apiClient';

test('fetches data correctly', async () => {
	const data = await fetchData();
	expect(data).toMatchSnapshot({
		id: expect.any(Number),
		createdAt: expect.any(String),
	});
});
```

**Explanation**:

- Dynamic properties like `id` and `createdAt` are matched with `expect.any()`.
- The snapshot focuses on the structure and static content.

### Testing Generated Markup

```javascript
// template.js
export function renderList(items) {
	return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}
```

**Test with Snapshot:**

```javascript
// template.test.js
import { test, expect } from 'vitest';
import { renderList } from './template';

test('renders list correctly', () => {
	const items = ['Apple', 'Banana', 'Cherry'];
	const html = renderList(items);
	expect(html).toMatchSnapshot();
});
```

**Explanation**:

- Captures the rendered HTML for the list.
- Quickly detects changes in the template rendering logic.

## Conclusion

Snapshot testing with Vitest is a valuable tool for verifying complex outputs with minimal effort. By understanding when to use snapshots and how to manage their potential brittleness, you can enhance your test suite's effectiveness without compromising maintainability.
