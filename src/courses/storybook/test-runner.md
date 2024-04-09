---
title: Setting Up a Test Runner
description:
exclude: false
drafted: false
modified: 2024-04-08T19:08:50-06:00
---

> [!tip] Storybook uses Playwright
> Make sure that you have your Playwright browsers installed by running `npx playwright install`.

Storybook allows you to take your [Play functions](play-functions.md) and run through them all and in order to make sure they all do what you expect them to do.

You will need to install their test runner in order to get started with this:

```sh
npm install -D @storybook/test-runner
```

> [!WARNING] Storybook Must Be Running
> Storybook must be running in order to run your tests with `@storybook/test-runner`.

Once your Storybook is up and running, you can run your tests.

```sh
npx test-storybook
```

Alternatively, you can—and should—add a script to your `package.json` to run the tests.

## Configuring Test Coverage

Let's say you want to get a sense of how well you're exercising your components, you can hook your test runner up with [Istanbul](https://istanbul.js.org/).

```sh
npx storybook@latest add @storybook/addon-coverage
```

And, then you should be able to run your tests with a `--coverage` flag.

```

```

## Running Your Tests in Github Actions

We're not going to cover this in our brief time together today, but [the official Storybook documentation](https://storybook.js.org/docs/writing-tests/test-runner#set-up-ci-to-run-tests) has some example [Github Actions](https://github.com/features/actions) for running your Storybook tests as part of your CI/CD process.
