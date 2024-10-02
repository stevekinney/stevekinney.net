---
title: Setting Up GitHub Actions to Run Vitest Unit Tests
description: Learn how to automate testing with GitHub Actions and Vitest.
modified: 2024-09-28T14:32:53-06:00
---

Continuous Integration (CI) is a crucial practice in modern software development, enabling teams to detect issues early by automatically running tests on code changes. **GitHub Actions** provides a powerful platform for automating workflows directly within your GitHub repository. This guide will walk you through setting up GitHub Actions to run your **Vitest** unit tests on each Pull Request (PR), ensuring that only passing code gets merged.

## Why Automate Tests with GitHub Actions?

- **Early Detection**: Catch bugs and issues as soon as code is pushed.
- **Consistency**: Ensure that all code changes meet the project's testing standards.
- **Efficiency**: Automate the testing process to save time and reduce manual effort.
- **Collaboration**: Provide immediate feedback to contributors through PR checks.

## Prerequisites

- A GitHub repository containing your project.
- Vitest installed and configured in your project.
- Existing unit tests written with Vitest.
- Node.js and npm configured in your project.

## Step-by-Step Guide

### Create a GitHub Actions Workflow File

In your repository, create a directory called `.github/workflows` if it doesn't exist. Inside this directory, create a new YAML file for your workflow, such as `ci.yml`.

```ts
your-repo/
├── .github/
│   └── workflows/
│       └── ci.yml
```

### Define the Workflow Configuration

Open `ci.yml` and define the workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
```

- **`name: CI`**: Names the workflow "CI" (Continuous Integration).
- **`on: pull_request`**: Triggers the workflow on PRs targeting the `main` branch.
- **`jobs`**: Defines the jobs to run; in this case, a single job named `build`.
- **`runs-on`**: Specifies the OS environment (`ubuntu-latest`).
- **`strategy.matrix.node-version`**: Allows testing on different Node.js versions (adjust as needed).
- **`steps`**: Lists the steps to execute in the job.

### Breakdown of Workflow Steps

#### Checkout the Repository

First things first: Let's tell the action to check out your repository.

```yaml
- name: Checkout code
  uses: actions/checkout@v3
```

This uses the `actions/checkout` action to clone your repository.

#### Set Up a Node Environment

```yaml
- name: Use Node.js ${{ matrix.node-version }}
  uses: actions/setup-node@v3
  with:
    node-version: ${{ matrix.node-version }}
    cache: 'npm'
```

This step:

- sets up the specified Node version, and
- caches `npm` dependencies to speed up the workflow.

#### Install Your Dependencies

```yaml
- name: Install dependencies
  run: npm install
```

Nothing particularly special to see here. This installs project dependencies defined in `package.json`.

#### Run the Tests

```yaml
- name: Run tests
  run: npm test
```

This executes the test script defined in your `package.json`.

### Commit and Push the Workflow File

Add the workflow file to your repository and push it to GitHub:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow for running Vitest tests"
git push origin main
```

### Verify the Workflow Execution

After pushing the workflow file:

- Open your GitHub repository.
- Navigate to the **Actions** tab.
- You should see the **CI** workflow listed.
- Click on it to see the details of the workflow runs.

### Test the Workflow with a Pull Request

Create a new branch.

```bash
git checkout -b test-ci
```

Make a small change or add a dummy commit.

```bash
touch dummy.txt
git add dummy.txt
git commit -m "Test CI workflow"
git push origin test-ci
```

- Create a Pull Request targeting the `main` branch.
- The CI workflow should automatically trigger.
- Check the PR page to see the status of the checks.

### Handling Test Failures

If your tests fail:

- The workflow will mark the build as failed.
- The PR will show that checks have failed.
- Click on the **Details** link to view the logs and identify the issues.
- Fix the tests or code causing the failure.
- Push the changes; the workflow will rerun.

### Adding Coverage Reporting (Optional)

If you want to include coverage reporting:

Adjust your test script in `package.json`:

```json
{
	"scripts": {
		"test": "vitest --coverage"
	}
}
```

Update the workflow to upload coverage artifacts:

```yaml
- name: Run tests with coverage
  run: npm test

- name: Upload coverage report
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage
```

The coverage report will be available in the workflow artifacts.

### Optional: Enforcing Required Status Checks

To prevent merging code with failing tests:

- Go to your repository's **Settings** > **Branches**.
- Under **Branch protection rules**, click **Add rule**.
- Specify the branch name pattern (e.g., `main`).
- Enable **Require status checks to pass before merging**.
- Select the **CI** workflow as a required check.
- Save changes.

## Best Practices

**Use Caching**: Cache dependencies to speed up workflow runs.

```yaml
with:
  node-version: ${{ matrix.node-version }}
  cache: 'npm'
```

**Test Multiple Node Versions**: Ensure compatibility across different environments. This is probably only important if you're testing server-side code.

```yaml
strategy:
  matrix:
    node-version: [14.x, 16.x, 18.x]
```

**Fail Fast**: Use the `fail-fast` option to stop running jobs on first failure.

```yaml
strategy:
  fail-fast: true
```

**Parallelize Jobs**: If you have multiple test suites, run them in parallel to reduce total build time.

**Secure Your Secrets**: Avoid hardcoding sensitive information in workflows. Use GitHub's encrypted secrets.

**Keep Workflows Updated**: Regularly update action versions to benefit from improvements and security patches.

## Troubleshooting Tips

If things go wrong, here are some common things that it might be.

- **Permission Issues**: Ensure the workflow file is in the default branch (e.g., `main`) to trigger on PRs.
- **Syntax Errors**: YAML isn't code. It's yet another markup language (YAML). Use a YAML linter or GitHub's workflow editor to validate your YAML files.
- **Caching Not Working**: Verify that the cache key is correctly set and that cache dependencies haven't changed.
- **Environment Differences**: If tests pass locally but fail in CI, ensure that environment variables and configurations are consistent.

## Conclusion

Setting up GitHub Actions to run your Vitest unit tests on each Pull Request enhances your development workflow by automating the testing process. It helps maintain code quality, prevents bugs from reaching production, and fosters a culture of continuous integration. By following this guide, you now have a CI pipeline that automatically runs your tests, providing immediate feedback to contributors and maintaining the integrity of your codebase.

## Additional Resources

- **Vitest Documentation**: <https://vitest.dev/>
- **GitHub Actions Documentation**: <https://docs.github.com/en/actions>
- **Caching Dependencies**: [Caching dependencies to speed up workflows](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- **GitHub Actions for JavaScript and Node.js**: [Official GitHub guide](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
