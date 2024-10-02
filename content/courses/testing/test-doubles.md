---
title: Understanding Test Doubles in Unit Testing
description: Learn the purpose and types of test doubles in unit testing.
modified: 2024-09-28T15:35:00-06:00
---

When writing unit tests, the goal is to test a piece of code in isolation. However, the real-world code we write often depends on other pieces of code or external systems like databases, APIs, or third-party services. These dependencies can introduce variability, slowness, or complexity into our tests, making them harder to write, understand, and maintain.

To overcome this, we use things called *test doubles*. A test double is a generic term for any kind of substitute for real objects in tests. They allow us to isolate the system under test and control the environment, ensuring we can predict behavior and verify the interactions.

Before diving into implementation, it's essential to understand what test doubles are and how they differ:

- **Test Double**: A generic term for any case where you replace a production object with a test-specific version.
- [**Mock**](mocks.md): An object that registers calls they receive. Mocks can verify that interactions with dependencies occur as expected.
- [**Spy**](spies.md): A function that records information about its calls, such as arguments and return values, allowing you to assert on how it was used.
- [**Stubs**](stubs.md)Stub\*\*: An object that provides predefined responses to method calls, usually not concerned with how they are called.

## Why Do We Use Test Doubles in Testing?

We use test doubles to:

1. **Isolate the code under test**: By replacing real dependencies, we remove the risk of side effects, external failures, and unpredictable behavior.
2. **Control test scenarios**: With test doubles, we can simulate different responses, such as errors or specific data, without relying on the real implementation.
3. **Improve test reliability**: Test doubles make our tests more predictable, removing uncertainty and making sure tests pass or fail based on the actual code we're testing.
4. **Speed up tests**: Real dependencies like databases or network calls can slow down tests. By using test doubles, we can run tests much faster.
5. **Verify interactions**: Test doubles allow us to observe how our code interacts with its dependencies, helping us ensure that methods are being called as expected.

## Differences Between Stubs, Spies, and Mocks

To clarify the differences between these three types of test doubles:

| **Feature**           | **Stubs**                                         | **Spies**                                                        | **Mocks**                                                                     |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Primary Purpose**   | Replace a function with predefined behavior       | Record information about function calls                          | Combine behavior control with call tracking                                   |
| **Modifies Behavior** | Yes (returns predefined values or actions)        | No (only observes by default)                                    | Yes (can define behavior and observe)                                         |
| **Tracks Calls**      | No                                                | Yes                                                              | Yes                                                                           |
| **Tracks Arguments**  | No                                                | Yes                                                              | Yes                                                                           |
| **Usage Scenario**    | Simulate simple behaviors, like network responses | Monitor interactions, like verifying if a callback was triggered | Simulate complex interactions, combining behavior control with call recording |

Stubs, spies, and mocks are essential tools for isolating dependencies, improving test reliability, and verifying code behavior. Understanding the differences and knowing when to use each type of test double will help you write more effective and maintainable tests. Whether you need to simulate a simple API response (stub), monitor how a function interacts with a dependency (spy), or simulate complex behaviors and record interactions (mock), these tools will help ensure your unit tests are robust and accurate.
