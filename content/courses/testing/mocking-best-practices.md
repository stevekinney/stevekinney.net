---
title: An Incomplete List of Best Practices for Mocking
description: Learn best practices and avoid common pitfalls when mocking.
modified: 2024-09-28T15:04:43-06:00
---

Let's look at some best practices when it comes to using [mocks](mocks.md), [stubs](stubs.md), [spies](spies.md), and other kinds of [test doubles](test-doubles.md).

## Mock Only What You Need

- **Avoid Over-Mocking**: Mocking too much can make tests less valuable.
- **Mock External Dependencies**: Focus on mocking APIs, databases, or modules outside your control.

## Reset Mocks Between Tests

**Ensure Isolation**: Use `vi.clearAllMocks()` or `vi.resetAllMocks()` in `afterEach` to reset mocks.

```javascript
afterEach(() => {
	vi.clearAllMocks();
});
```

## Use Spies to Verify Interactions

**When Not to Mock**: If you want to test the actual implementation but still verify interactions, use spies.

## Keep Tests Readable

- **Descriptive Names**: Name your mocks and spies clearly to enhance readability.
- **Arrange-Act-Assert Pattern**: Organize tests into setup, execution, and verification phases.

## Be Cautious with Global Mocks

- **Restore Globals**: When mocking global objects (like `fetch` or `console`), ensure they are restored after the test.

## Common Pitfalls and How to Avoid Them

### Overusing Mocks

**Issue**: Over-mocking can lead to tests that pass even when the code is broken.

**Solution**:

- Mock only the external dependencies.
- Allow the code under test to execute as much real logic as possible.

### Mock Leakage Between Tests

**Issue**: Mocks retain state between tests, causing unexpected behavior.

**Solution**:

- Use `vi.resetAllMocks()` or `vi.clearAllMocks()` in a `beforeEach` or `afterEach` hook.

### Forgetting to Restore Mocked Modules

**Issue**: Mocked modules persist across tests.

**Solution**:

- Use `vi.resetModules()` to reset the module registry if needed.

  ```javascript
  beforeEach(() => {
  	vi.resetModules();
  });
  ```

### Testing Implementation Details

**Issue**: Tests break when internal implementation changes, even if the external behavior is the same.

**Solution**:

- Focus on testing the outputs and side effects.
- Use mocks and spies to verify interactions, not internal logic.
