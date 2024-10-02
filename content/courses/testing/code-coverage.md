---
title: Installing a Code Coverage Tool
description: A guide to setting up and managing code coverage in Vitest.
modified: 2024-09-28T16:18:12-06:00
---

Code coverage is useful for identifying how much your code is (or *isn't*) covered by tests. This can be useful for identifying blind spots and potential edge cases that are not covered by your test suite.

**A word of caution**: [Aiming for 100% coverage](you-dont-need-perfect-code-coverage.md)—or, worse *mandating* it—isn't the best use of your time and attention:

1. Consider the 80/20 principle, that last little bit of coverage is usually a lot more work than the majority of it. And frankly, you can hit the point of diminishing returns pretty quickly. Maybe you're better off with an integration test?
2. Speaking of integration tests: It's rare that any code coverage tool takes a holistic few of your application and its code. Usually, it's able to tell you about the coverage that one kind of test—typically your unit tests—provide. This means, that your code *could* very well be covered by some other kind of test—or even your type system.

I hesitate to mandating a given number. If you do, keep it low. Sure, I'd say like less that 60% means you should probably pay some attention to your tests. Alternatively, you could choose to just monitor that a given change doesn't drastically reduce the amount of code coverage.

For me, the biggest advantage is to help as I'm working on a new function or feature. Code coverage allows me to see where I still need to add some tests and allows me get a high-level few as I'm working on something new.

## What is Code Coverage?

Code coverage quantifies the amount of code executed during automated tests. It provides insights into:

- **Statements Coverage**: Percentage of executed statements.
- **Branches Coverage**: Percentage of executed control flow branches (e.g., `if`/`else` blocks).
- **Functions Coverage**: Percentage of executed functions or methods.
- **Lines Coverage**: Percentage of executed lines in the source code.

## Why Use Code Coverage?

- **Identify Untested Code**: Highlights areas of the codebase not covered by tests.
- **Improve Test Quality**: Encourages writing comprehensive tests.
- **Maintain Code Health**: Helps prevent regressions by ensuring critical code paths are tested.
- **Metric for Progress**: Serves as a measurable indicator of testing efforts.

## Installing a Code Coverage Tool

If you *don't* have a coverage reporter installed, Vitest will prompt you to install the dependency.

```
> vitest exercise.test.ts --coverage

 MISSING DEP  Can not find dependency '@vitest/coverage-c8'

✔ Do you want to install @vitest/coverage-c8? … yes
```

## Running the Code Coverage Tool

You can do this via:

```ts
npm test -- --coverage
npx vitest --coverage
```

You'll likely get a new `./coverage` directory. Go take a look. You can spin up a quick web server using:

```ts
vite preview  --outDir coverage
```

This will allow you see where you code is *not* being tested. (Source: [The documenation for c8](https://github.com/bcoe/c8#ignoring-uncovered-lines-functions-and-blocks).)

## Ignoring Lines

You can ignore lines from your coverage report:

```ts
const something = 'lol';
/* c8 ignore next */
if (process.platform === 'win32') console.info('hello world');

/* c8 ignore next 3 */
if (process.platform === 'darwin') {
	console.info('hello world');
}

/* c8 ignore start */
function dontMindMe() {
	// ...
}
/* c8 ignore stop */
```

## Configuring Your Coverage Report

You can add a `coverage` key to the `test` configuration in your `vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig, defaultExclude } from 'vitest/config';
import configuration from './vite.config';

export default defineConfig({
	...configuration,
	resolve: {
		alias: {
			...configuration?.resolve?.alias,
			test: path.resolve(__dirname, './test'),
		},
	},
	test: {
		globals: true,
		setupFiles: path.resolve(__dirname, 'test/setup.ts'),
		exclude: [...defaultExclude, '**/*.svelte**'],
		environmentMatchGlobs: [
			['**/*.test.tsx', 'jsdom'],
			['**/*.component.test.ts', 'jsdom'],
		],
		coverage: {
			include: ['src/**/*'],
			exclude: [
				'test/**',
				'vite.*.ts',
				'**/*.d.ts',
				'**/*.test.{ts,tsx,js,jsx}',
				'**/*.config.*',
				'**/snapshot-tests/**',
				'**/*.solution.tsx',
				'**/coverage/**',
			],
			all: true,
		},
	},
});
```

You can see all of the options [here](https://github.com/bcoe/c8#cli-options--configuration).

The cool one here is the ability to set thresholds at which your build will fail if you dip below a certain amount.

```json
{ "statements": 54.92, "thresholdAutoUpdate": true }
```

These options will stop you from dropping at the very least and if you go up, it sets that as the new baseline.

### Interpreting Coverage Reports

Vitest generates coverage reports in the specified formats. Commonly used reporters include:

- **Text**: Outputs coverage summary to the console.
- **HTML**: Generates an interactive HTML report.
- **LCOV**: Produces an `lcov.info` file, useful for integrating with coverage services.

#### Console Output Example

```sh
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |    85.7 |    66.66 |      80 |    85.7 |
 src           |     100 |      100 |     100 |     100 |
  math.js      |     100 |      100 |     100 |     100 |
 src/utils     |   66.66 |       50 |      50 |   66.66 |
  helper.js    |   66.66 |       50 |      50 |   66.66 | 12-14
---------------|---------|----------|---------|---------|-------------------
```

**Explanation:**

- **% Stmts**: Percentage of statements executed.
- **% Branch**: Percentage of branches executed.
- **% Funcs**: Percentage of functions executed.
- **% Lines**: Percentage of lines executed.
- **Uncovered Line #s**: Lines that were not executed during tests.

##### HTML Report

The HTML report is generated in the `coverage` directory by default. Open `coverage/index.html` in your browser to view it.

**Features:**

- **Interactive Navigation**: Browse coverage details for each file.
- **Highlighted Code**: See which lines are covered (green) and which are not (red).
- **Detailed Metrics**: Provides line-by-line coverage information.

#### Best Practices for Code Coverage

##### 1. Aim for Meaningful Coverage, Not Just High Percentages

- **Quality Over Quantity**: High coverage does not guarantee good tests. Focus on writing meaningful tests that cover critical code paths.
- **Avoid Coverage for Its Own Sake**: Don't write superficial tests just to increase coverage numbers.

##### 2. Identify and Prioritize Critical Code

- **Core Functionality**: Ensure that essential functions and business logic are thoroughly tested.
- **Edge Cases**: Write tests for boundary conditions and error handling paths.

##### 3. Exclude Generated or External Code

- **Configuration Files**: Exclude files like configuration or setup files that don't need testing.
- **Third-Party Libraries**: Exclude `node_modules` or other external code from coverage.

**Example: Exclude in Configuration**

```javascript
// vitest.config.js
export default defineConfig({
	test: {
		coverage: {
			exclude: ['node_modules', 'src/setupTests.js'],
		},
	},
});
```

#### Regularly Review Coverage Reports

- **Identify Gaps**: Use reports to find untested code areas.
- **Refactor Tests**: Improve existing tests to cover missing branches or statements.

#### Integrate Coverage into Continuous Integration (CI)

- **Automate Coverage Reporting**: Run coverage analysis as part of your CI pipeline.
- **Set Coverage Thresholds**: Fail the build if coverage drops below a certain percentage.

**Example: Setting Coverage Thresholds**

```javascript
// vitest.config.js
export default defineConfig({
	test: {
		coverage: {
			statements: 80,
			branches: 75,
			functions: 80,
			lines: 80,
		},
	},
});
```

#### Use Coverage Badges in Documentation

- **Visibility**: Display coverage status in your project's README file.
- **Motivation**: Encourages contributors to maintain or improve coverage.

### Common Pitfalls and How to Avoid Them

#### Misinterpreting Coverage Metrics

**Issue**: Assuming that 100% coverage means no bugs.

**Solution**:

- Understand that coverage metrics indicate which code is executed, not whether the code behaves correctly.
- Focus on writing meaningful tests that assert correct behavior.

#### Overlooking Uncovered Branches

**Issue**: Missing coverage for conditional branches.

**Solution**:

- Examine branch coverage to identify untested `if`/`else` conditions.
- Write tests that cover different logical paths.

#### Ignoring Integration and End-to-End Tests

**Issue**: Relying solely on unit tests for coverage.

**Solution**:

- Incorporate integration and end-to-end tests to cover interactions between components.
- Use tools like **Playwright** for end-to-end testing.

#### Including Unnecessary Files

**Issue**: Coverage reports include files that should be excluded, skewing metrics.

**Solution**:

- Use `include` and `exclude` patterns in your configuration to focus on relevant files.

#### Not Cleaning Up Before Coverage Runs

**Issue**: Old coverage data persists, causing inaccurate reports.

**Solution**:

- Ensure that the coverage directory is cleaned before generating new reports.
- Use scripts to automate cleanup.

### Examples in Practice

Let's look at our early example:

```javascript
// src/math.js
export function add(a, b) {
	return a + b;
}

export function subtract(a, b) {
	return a - b;
}
```

```javascript
// tests/math.test.js
import { expect, test } from 'vitest';
import { add, subtract } from '../src/math';

test('adds numbers correctly', () => {
	expect(add(2, 3)).toBe(5);
});

test('subtracts numbers correctly', () => {
	expect(subtract(5, 3)).toBe(2);
});
```

You can run the tests with the coverage flag.

```bash
npx vitest --coverage
```

- Both `add` and `subtract` functions are covered.
- Coverage should be 100% for statements, branches, functions, and lines.

#### Identifying Uncovered Code

```javascript
// src/utils/helper.js
export function greet(name) {
	if (!name) {
		return 'Hello, Stranger!';
	}
	return `Hello, ${name}!`;
}
```

```javascript
// tests/helper.test.js
import { expect, test } from 'vitest';
import { greet } from '../src/utils/helper';

test('greets a named person', () => {
	expect(greet('Alice')).toBe('Hello, Alice!');
});
```

- The case where `name` is not provided is not tested.
- Coverage report will show incomplete branch coverage.

Go ahead and add a test for the missing branch.

```javascript
test('greets a stranger when no name is provided', () => {
	expect(greet()).toBe('Hello, Stranger!');
});
```

### Integrating Coverage with Continuous Integration

We'll talk more about [continuous integration](continuous-integration.md). But, I'll leave this example of how to run your code coverage report in Github Actions here for reference.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests with coverage
        run: npx vitest --coverage
      - name: Upload coverage report
        uses: actions/upload-artifact@v2
        with:
          name: coverage-report
          path: coverage
```

- The workflow runs tests with coverage on each push or pull request.
- Coverage reports are uploaded as artifacts for review.

### Conclusion

Code Coverage tools are super useful to help you see where you might be missing test coverage, but you shouldn't chase 100% code coverage for the sake of it. It's important to be reasonable in terms of what's Good Enough™.

- **Enable Coverage**: Use `--coverage` flag or configure in `vitest.config.js`.
- **Interpret Reports**: Understand statements, branches, functions, and lines coverage.
- **Aim for Meaningful Coverage**: Focus on writing effective tests rather than achieving arbitrary coverage percentages.
- **Use Coverage Tools**: Leverage coverage reports to identify gaps and improve tests.
- **Integrate with CI**: Automate coverage analysis in your continuous integration pipeline.
- **Exclude Irrelevant Files**: Configure inclusion and exclusion patterns to focus on relevant code.

### Additional Resources

- **Vitest Documentation**: [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html)
- **C8 Coverage Tool**: [c8 on npm](https://www.npmjs.com/package/c8)
- **Understanding Code Coverage Metrics**: [Istanbul.js Documentation](https://istanbul.js.org/docs/advanced/coverage-object/)
