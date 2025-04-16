---
modified: 2025-03-18T09:09:48-05:00
title: Built-in Problem Matchers
description: The problem matchers built-in to Visual Studio Code.
---

Visual Studio Code includes several built-in problem matchers out of the box, which are designed to parse output from common tools and compilers. These include:

- **$tsc:** For errors and warnings from the TypeScript compiler.
- **$tsc-watch:** Specifically tailored for TypeScript’s watch mode.
- **$eslint:** To parse ESLint output.
- **$eslint-compact:** A variant that handles ESLint’s compact output format.
- **$jshint:** For processing JSHint error output.
- **$msCompile:** For matching errors from MSBuild and related Microsoft compilers.

Keep in mind that additional problem matchers can also be provided by extensions, so your available list may expand based on your installed tools and languages.
