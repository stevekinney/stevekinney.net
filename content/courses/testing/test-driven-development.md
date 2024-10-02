---
title: Understanding Test-Driven Development
description: A simple explanation of the steps in Test-Driven Development.
modified: 2024-09-28T15:35:06-06:00
---

Test-Driven Developer (TDD) is way simpler than a lot of people want to make it sound. You basically follow these steps:

1. **Write a Test**: Write a test for the next bit of functionality you want to add.
2. **Run the Test and See It Fail**: This confirms that the test is detecting the absence of the desired functionality.
3. **Write the Minimal Code to Pass the Test**: Implement just enough code to make the test pass.
4. **Refactor**: Improve the code while keeping the tests passing.
5. **Repeat**: Continue with the next functionality.

This cycle is often referred to as **Red-Green-Refactor**:

- **Red**: Write a failing test.
- **Green**: Write code to pass the test.
- **Refactor**: Improve the code.
