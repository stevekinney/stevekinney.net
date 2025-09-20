---
title: Integrating Claude Code with GitHub Actions
description: >-
  Set up AI-powered automation in GitHub workflows using Claude Code for code
  reviews and pull requests.
modified: '2025-09-06T14:36:25-06:00'
date: '2025-07-29T15:09:56-06:00'
---

Claude Code GitHub Actions enable AI-powered automation within your GitHub workflows. By simply mentioning `@claude` in a pull request (PR) or issue, Claude can analyze your code, create PRs, implement features, and fix bugs, all while adhering to your project's defined standards. It's built on the Claude Code SDK, which allows programmatic integration.

## Setting Up Claude Code GitHub Actions

Setting up this integration involves a few key steps to ensure Claude has the necessary access and context:

### Prerequisites

- **Node.js**: Node.js 18+ is essential. For Windows users, it's recommended to use Windows Subsystem for Linux (WSL).
- **Git**: Git version 2.23+ is recommended for version control.
- **GitHub CLI (`gh`)**: Install the `gh` CLI locally, as Claude knows how to use it for interacting with GitHub (e.g., creating issues, opening pull requests, reading comments). Without `gh` installed, Claude can still use the GitHub API or Model Context Protocol (MCP) server if configured.

### Installation

- **Quick Setup (Recommended for direct Anthropic API users)**: Open Claude Code in your terminal and run the `/install-github-app` command. This command will guide you through setting up the GitHub app and the required secrets. You must be a repository administrator to install the GitHub app and add secrets.
- **Manual Setup**: If the quick setup fails or you prefer manual configuration, follow these steps:
  1. Install the Claude GitHub app to your repository by visiting `https://github.com/apps/claude`.
  2. **Add `ANTHROPIC_API_KEY` to your repository secrets**. You should never commit API keys directly to your repository; always use GitHub Secrets.
  3. Copy the example workflow file (e.g., from `examples/claude.yml` in the Claude Code Action repository) into your repository's `.github/workflows/` directory.
- **Enterprise Platforms (AWS Bedrock & Google Vertex AI)**: For enterprise environments, you can configure Claude Code GitHub Actions with your own cloud infrastructure to control data residency and billing. This requires specific prerequisites for Google Cloud Vertex AI or AWS Bedrock, including enabling relevant services, configuring Workload Identity Federation or GitHub OIDC Identity Provider, and setting up appropriate service accounts or IAM roles with necessary permissions (e.g., `AmazonBedrockFullAccess`). You'll need to use specific environment variables for these services in your workflow files, such as `ANTHROPIC_VERTEX_PROJECT_ID` or `CLOUD_ML_REGION`.

## Configuring GitHub Actions Workflows

Once set up, you define how Claude Code interacts with your repository through workflow files:

### Triggering the Action

- By default, the Claude Code GitHub Action listens for comments or issues mentioning `@claude`.
- You can customize triggers in your YAML workflow file. For instance, to automate PR reviews on every pull request opening or update, you can use `pull_request: types: [opened, synchronize]`.
- To trigger only on demand via comments, use an `issue_comment` trigger with a filter like `if: contains(github.event.comment.body, '@claude')`.

1. **Workflow Structure (Example YAML)**: A typical workflow file will include:

   ```ts
   name: Claude Code Review
   on:
     pull_request:
       types: [opened, synchronize] # Run when PR is opened or updated
   jobs:
     review:
       runs-on: ubuntu-latest
       permissions: { contents: read } # allow reading code
       steps:
         - uses: actions/checkout@v4
           with: { fetch-depth: 0 }
         - name: Run Claude Code Review
           uses: anthropics/claude-code-action@beta
           with:
             anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
             direct_prompt: |
               Review the PR changes for potential bugs, style issues, and adherence to our standards. Provide a detailed comment with findings and suggestions.
   ```

   This example demonstrates how Claude checks out the code and executes a review prompt when a PR is triggered.

2. **Action Parameters**: The `claude-code-action` supports key parameters:
   - `trigger_phrase`: The phrase that activates Claude (e.g., "@claude").
   - `timeout_minutes`: Sets a timeout for Claude's operation.
   - `github_token`: Used for authentication with GitHub actions.
   - `direct_prompt`: Allows you to specify the exact prompt for Claude to execute. If omitted, Claude can infer the task from the issue or comment text.
   - `allowed_tools`: Specifies which tools Claude is permitted to use (e.g., `mcp__github__create_pull_request`, `Bash(git push:*)`).
   - `use_vertex`: Boolean to indicate use of Google Vertex AI.
   - `model`: Specifies the Claude model to use (e.g., "claude-3-7-sonnet@20250219").

3. **Permissions within Workflows**: For Claude to perform actions like creating PRs or pushing changes, you must grant explicit permissions in your workflow YAML. For example, add `pull-requests: write` and potentially `contents: write` to the `permissions` scope of your job. Claude Code runs with a restricted default toolset (read-only and non-destructive) for security.

## Best Practices and Tips

To maximize the effectiveness of Claude Code with GitHub Actions:

- **`CLAUDE.md` for Project Context**: Create a `CLAUDE.md` file in your repository root. This special file is automatically pulled into Claude's context, making it ideal for documenting code style guidelines, testing instructions, core files, utility functions, and repository etiquette. Claude respects this file even when running in CI/CD pipelines. You can link to other relevant markdown files within `CLAUDE.md` using the `@` syntax to manage large amounts of documentation without overloading the main file.
- **Security Considerations**: Always use GitHub Secrets for API keys (e.g., `${{ secrets.ANTHROPIC_API_KEY }}`) instead of hardcoding them. Limit action permissions to only what is necessary, granting only the minimum required. **Always review Claude's suggestions before merging**.

### Optimizing Performance and Cost

    - Use issue templates to provide clear, concise context.
    - Keep your `CLAUDE.md` concise and focused.
    - Configure appropriate timeouts for your workflows.
    - Be aware that Claude Code runs on GitHub-hosted runners, consuming GitHub Actions minutes, and each interaction consumes API tokens. Fixed-cost subscription plans can help with predictable costs.

- **Leverage Headless Mode**: Use Claude Code in headless mode with the `-p` flag (`claude -p`) for automation and scripting. This is ideal for integrating Claude into CI/CD pipelines or for large-scale migrations. Headless mode does not persist between sessions, so you have to trigger it each session.
- **Pipelining**: Claude can be integrated into existing data/processing pipelines by piping data in and out. For example, `cat build-error.txt | claude -p 'concisely explain the root cause of this build error' > output.txt`. JSON output can provide structured data for easier automated processing.
- **Commit Often**: Frequently commit changes within your repository to maintain a granular version history. Claude can draft commit messages automatically by looking at your changes and recent history. You can also add pre-commit checks to your repo to ensure code quality before Claude commits changes.

### CI Safety Checklist

- [ ] Run on least‑privilege: set `permissions:` per job (e.g., `pull-requests: write`; avoid `contents: write` unless needed).
- [ ] Gate destructive tools: configure `allowed_tools` and block risky commands in hooks or workflow steps.
- [ ] Require tests before PR creation: run unit, lint, and type checks; fail fast on errors.
- [ ] Timebox and budget: set `timeout_minutes` and limit turns/iterations.
- [ ] Secrets: use `${{ secrets.* }}` only; never echo secrets or write them to artifacts.
- [ ] Logs: redact tokens; attach succinct logs to PR comments, not raw traces.
- [ ] Human in the loop: require review/approval before merging AI‑authored changes.

### AI Code Review Checklist

- [ ] Scope: Does the diff match the stated goal? Anything unexpected?
- [ ] Tests: Are there new/updated unit tests? Do all tests pass?
- [ ] Types & lint: Typecheck/lint clean? Any any/ts‑ignore or disabled rules?
- [ ] Security: Inputs validated? Safe file/FS/net operations? Secrets untouched?
- [ ] Performance: Any obvious N+1, synchronous I/O in hot path, missing memoization/caching?
- [ ] API contracts: Request/response shapes and error handling consistent? OpenAPI/typing updated?
- [ ] Docs: Changelog/README/CLAUDE.md updated if behavior changed?

## Example Use Cases

Claude Code GitHub Actions can assist with a variety of development tasks:

- **Turning Issues into Pull Requests (PRs)**: Claude can analyze an issue description, write the code to implement the feature or fix the bug, and create a PR for review, all with a simple `@claude implement this feature` comment.
- **Automated Code Review**: Claude can be configured to review PRs automatically when they are opened or updated. It can identify potential bugs, style issues, and adherence to project standards, then add comments to the PR. This provides an AI code review on demand.
- **Fixing Bugs Quickly**: Claude can locate bugs, implement fixes, and create PRs for the changes. This works best for small, self-contained bugs.
- **Issue Triage and Categorization**: Claude can inspect new issues, determine their nature (e.g., bug, feature request), and automatically apply appropriate labels.
- **Large-Scale Code Migrations/Refactoring**: For sweeping changes across a codebase, Claude Code can assist by searching for usages of old APIs, editing files, running tests to verify, and iterating until the task is complete.
- **Automated Release Note Generation**: Claude can generate human-readable summaries for release notes by processing a list of commits.
- **Linting and Type Checking**: Claude can be used as a linter, identifying issues like typos, stale comments, or misleading names, and can also be integrated into pre-commit checks to enforce code quality.

## Troubleshooting

If Claude is not responding to `@claude` commands in GitHub Actions, you should:

- Verify the GitHub App is installed correctly.
- Check that workflows are enabled.
- Ensure the API key is correctly set in repository secrets.
- Confirm the comment actually contains `@claude` (not `/claude`).
