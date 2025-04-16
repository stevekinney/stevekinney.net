---
title: Advanced Debugging Techniques in Visual Studio Code
description: Master powerful debugging features like conditional breakpoints, logpoints, and more for efficient troubleshooting
modified: 2025-03-16T16:12:01-06:00
---

## Conditional Breakpoints

Conditional breakpoints allow you to pause execution only when a specific condition is met. This is incredibly useful when you need to investigate a bug that only occurs under certain circumstances, saving you from stepping through irrelevant code.

To set a conditional breakpoint, right-click on an existing breakpoint (or in the left gutter where breakpoints are placed) and choose "Edit Breakpoint…". Then, select "Expression" from the dropdown. Enter a JavaScript expression that evaluates to `true` or `false`. The breakpoint will only trigger if the expression is `true`.

For example, imagine you're debugging a loop and only want to pause when a variable `i` is greater than 100 and a variable `data[i].status` is equal to "error":

```ts
// Your code
for (let i = 0; i < data.length; i++) {
  // … some code …
}

// Conditional Breakpoint Expression:
i > 100 && data[i].status === 'error';
```

The debugger will now only pause _inside_ the loop when _both_ of those conditions are true. This is significantly more efficient than manually stepping through the loop hundreds of times.

## Logpoints vs. console.log: A Direct Comparison

Logpoints and `console.log` statements both help you trace program execution and inspect values, but they differ significantly in how they work and when to use them.

### Traditional console.log Approach

```javascript
function processData(item) {
  console.log('Processing item:', item.id, 'name:', item.name); // Added manually

  // Process the item...

  console.log('Processing completed, result:', result); // Added manually
  return result;
}
```

### Logpoint Approach

```javascript
function processData(item) {
  // No code modification needed! Logpoint added through Visual Studio Code UI:
  // "Processing item: {item.id}, name: {item.name}"

  // Process the item...

  // Another logpoint added through Visual Studio Code UI:
  // "Processing completed, result: {result}"
  return result;
}
```

### Key Differences

| Feature                 | console.log                                        | Logpoints                                                         |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| **Code Modification**   | Requires changing source code                      | No source code changes needed                                     |
| **Version Control**     | Changes show up in commits                         | Invisible to version control                                      |
| **Deployment**          | Must be removed or commented out before production | Automatically removed when debugging ends                         |
| **Conditional Logging** | Requires explicit if statements                    | Built-in condition expression support                             |
| **Performance Impact**  | Always executes, even in production                | Only active during debugging                                      |
| **Persistence**         | Remains in code until manually removed             | Persists between debugging sessions but doesn't affect production |
| **Collaboration**       | Teammates see your debug logs                      | Doesn't affect teammates' experience                              |

### When to Use Each Approach

**Use console.log when:**

- You need logs in production for monitoring/auditing
- You want team members to see the same logs
- You're using it as part of your permanent logging strategy

**Use Logpoints when:**

- You need temporary debugging output
- You're exploring unfamiliar code
- You're debugging third-party libraries
- You want to avoid cluttering commits with debugging code
- You need conditional debugging output without modifying code

To add a logpoint, right-click in the breakpoint gutter and choose "Add Logpoint…". Enter a message to log. You can use curly braces `{}` to embed expressions within the log message, similar to template literals.

```ts
// Your code
function processData(item: any) {
  // … some code …
}

// Logpoint Message:
('Processing item: {item.id}, name: {item.name}');
```

When the logpoint is hit, the message will be printed to the Debug Console, including the evaluated values of `item.id` and `item.name`.

> [!TIP]
>
> Logpoints are incredibly helpful for debugging code that you don't own or can't modify directly. They are also excellent for diagnosing issues in production environments where you can't easily restart the application with modified code.

## Hit Count Breakpoints

Hit count breakpoints allow you to pause execution only after the breakpoint has been hit a specific number of times. This is useful for scenarios where a bug occurs only after a certain number of iterations in a loop or after a function has been called repeatedly.

To set a hit count breakpoint, right-click on a breakpoint and choose "Edit Breakpoint…". Select "Hit Count" from the dropdown. Enter a number. The breakpoint will only trigger after it has been hit that many times.

```ts
// Your code
for (let i = 0; i < 1000; i++) {
  // … some code …
  // Breakpoint set to hit count 500
}
```

The debugger will pause inside the loop only on the 500th iteration.

You can also use comparison operators: `>` (greater than), `>=` (greater or equal), `<` (less than), `<=` (less than or equal), or `=` (equal). For example, `>10` will trigger the breakpoint after 10 hits.

## Data Breakpoints: Practical Approaches

Data breakpoints (also known as "watchpoints") are designed to pause execution when the value of a specific variable _changes_. This is exceptionally powerful for tracking down unexpected modifications to your data.

### Language Support for Data Breakpoints

The level of data breakpoint support in Visual Studio Code varies by language:

| Language                  | Support Level | Notes                                                |
| ------------------------- | ------------- | ---------------------------------------------------- |
| **JavaScript/TypeScript** | Limited       | Basic support for property changes on global objects |
| **C/C++**                 | Full          | Comprehensive support for memory addresses           |
| **C#/.NET**               | Full          | Robust property change detection                     |
| **Java**                  | Moderate      | Support depends on Java extension version            |
| **Python**                | Limited       | Basic support in some debugger extensions            |

### C# Example: Robust Data Breakpoints

In C#, data breakpoints are well-supported. When debugging a C# application:

1. Run the application in debug mode
2. When paused, find a variable in the Variables panel
3. Right-click and select "Break When Value Changes"

```csharp
// C# Example
public class User {
    public string Name { get; set; }
    public int Age { get; set; }
}

// In your code
var user = new User { Name = "John", Age = 30 };
UpdateUserData(user);  // Set a data breakpoint on user.Age
```

The debugger will automatically pause when the `Age` property changes, showing you exactly where the modification occurs.

### C++ Example: Memory-Level Monitoring

C++ provides low-level support through memory watchpoints:

```cpp
// C++ Example
struct Product {
    int id;
    double price;
};

// In your code
Product product{1, 9.99};
// Set a data breakpoint on product.price
UpdateInventory(&product);
```

The C++ debugger can monitor the memory address of `product.price` and break precisely when that memory location changes.

### JavaScript Workarounds: Proxy Objects

While native data breakpoints have limited support in JavaScript, you can use JavaScript's `Proxy` object to achieve similar functionality:

```javascript
// Create a monitored version of your object
function createMonitored(obj, onChange) {
  return new Proxy(obj, {
    set(target, property, value) {
      console.log(`Property '${property}' changing from ${target[property]} to ${value}`);
      onChange(target, property, value);
      target[property] = value;
      return true;
    },
  });
}

// Usage
const user = { name: 'Alice', score: 100 };
const monitoredUser = createMonitored(user, (obj, prop, value) => {
  debugger; // This will pause execution whenever a property changes
});

// Now use monitoredUser instead of user
monitoredUser.score = 150; // Will trigger the debugger
```

This approach lets you create a "debug version" of an object that will automatically pause execution when any property changes.

### Alternative: Change Tracking with Snapshots

For complex objects where the proxy approach isn't practical, you can implement manual change tracking:

```javascript
function trackChanges(obj, label = 'Object') {
  const snapshot = JSON.stringify(obj);

  // Create a conditional breakpoint with this expression:
  // JSON.stringify(obj) !== snapshot

  // Or use a logpoint with this message:
  // `${label} changed: before=${snapshot}, after=${JSON.stringify(obj)}`
}

// In your code
function processData(data) {
  trackChanges(data, 'data');
  // ... processing ...
}
```

### When to Use Data Breakpoints

Data breakpoints are particularly useful for debugging:

1. **Unexpected state changes**: When a value is modified but you don't know where
2. **Race conditions**: When multiple parts of code might be changing the same data
3. **Third-party library interactions**: When external code modifies your objects
4. **Complex object mutations**: When tracking changes deep in object hierarchies

> [!TIP]
>
> Even in languages with limited data breakpoint support, the combination of conditional breakpoints, logpoints, and custom proxy objects can provide similar functionality with a bit more setup.

## Function Breakpoints

Function breakpoints allow you to pause execution whenever a specific function is _called_, regardless of where the call originates. This is extremely useful when you want to understand how a particular function is being used throughout your application, especially in large codebases or when dealing with callbacks or event handlers.

To create a function breakpoint, go to the "Breakpoints" section in the Debug view. Click the "+" button and choose "Function Breakpoint". Enter the name of the function. You can also specify a condition or hit count for function breakpoints.

```ts
// Function Breakpoint:
myFunction;
```

The debugger will now pause at the beginning of `myFunction` every time it's called.

## Remote Debugging

Remote debugging allows you to debug an application running on a different machine, in a virtual machine, or inside a Docker container. This is essential for debugging server-side applications, cloud deployments, or situations where the execution environment differs from your development machine.

Visual Studio Code supports remote debugging through various debugger extensions and configurations. The general approach involves:

1. **Setting up the remote environment:** Ensure the remote environment has the necessary debugging tools installed (e.g., the Node.js debugger, Python debugger, etc.).
2. **Configuring the debugger:** Create a `launch.json` configuration with the `request` type set to `"attach"`. You'll need to specify the host, port, and other connection details for the remote debugger.
3. **Connecting to the remote process:** Start the application in debug mode on the remote machine, and then use Visual Studio Code's Debug view to connect to it.

For example, to debug a Node.js application running remotely:

JSON

```ts
// launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "attach",
            "name": "Attach to Remote",
            "address": "192.168.1.100", // IP address of the remote machine
            "port": 9229,              // Debugging port
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/path/to/app/on/remote", // Path to the app on the remote machine
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

On the remote machine, you would start your Node.js application with the `--inspect` flag:

Bash

```ts
node --inspect=0.0.0.0:9229 index.js  # Allow connections from any IP
```

Dev Containers (covered in your previous sections) provide a streamlined way to handle remote debugging within Docker containers, automating much of this setup process.

## Debugging Tests: Framework-Specific Approaches

Debugging tests is crucial for understanding why they fail and fixing your code or tests accordingly. Visual Studio Code provides comprehensive support for debugging various testing frameworks, allowing you to step through test execution and inspect variables just like any other code.

### Using the Test Explorer UI

Visual Studio Code's Test Explorer provides a unified interface for discovering, viewing, and running tests across different frameworks:

1. Install the appropriate test extension for your framework
2. Open the Testing panel in the sidebar (flask icon)
3. Tests are automatically discovered and displayed in a tree view
4. Right-click a test and select "Debug Test" to run it in debug mode

![Test Explorer showing a tree of tests with debug options]

### Jest Tests (JavaScript/TypeScript)

For Jest, the most popular JavaScript testing framework:

```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "${fileBasename}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true
    }
  ]
}
```

With this configuration:

- `--runInBand` ensures tests run sequentially, which is better for debugging
- `${fileBasename}` runs tests in the current file
- You can set breakpoints directly in your test or in the code being tested

For a more interactive approach, install the "Jest Runner" extension, which adds inline "Debug" buttons above each test:

```javascript
// Example Jest test with breakpoint
test('calculates total correctly', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: 1, price: 10 });
  cart.addItem({ id: 2, price: 20 });

  // Set a breakpoint on the next line to inspect the cart before checking
  const total = cart.calculateTotal();

  expect(total).toBe(30);
});
```

### Mocha Tests (JavaScript/TypeScript)

For Mocha, another popular JavaScript testing framework:

```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Mocha Tests",
      "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
      "args": ["--timeout", "999999", "--colors", "${file}"],
      "internalConsoleOptions": "openOnSessionStart"
    }
  ]
}
```

### Python Tests (pytest)

For Python using pytest:

```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug pytest",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${file}", "-v"],
      "justMyCode": false
    }
  ]
}
```

The "Python" extension for Visual Studio Code adds code lenses above test functions with "Run Test" and "Debug Test" buttons:

```python
# Example pytest test
def test_calculate_area():
    rectangle = Rectangle(width=5, height=10)

    # Set a breakpoint here to inspect the rectangle
    area = rectangle.calculate_area()

    assert area == 50
```

### .NET Tests (xUnit, NUnit, MSTest)

The C# extension provides excellent built-in support for .NET test frameworks:

```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug xUnit Tests",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "dotnet",
      "args": ["test", "${workspaceFolder}/tests/MyProject.Tests/MyProject.Tests.csproj"],
      "cwd": "${workspaceFolder}",
      "console": "internalConsole",
      "stopAtEntry": false
    }
  ]
}
```

### Debugging UI Component Tests

For component tests in frameworks like React, Vue, or Angular:

1. **React Testing Library / Enzyme**:
   - Use Jest configuration but add the `--env=jsdom` argument
2. **Cypress Component Tests**:

   - Use the Cypress extension to open Cypress in debug mode
   - Set breakpoints in your component code

3. **Storybook Tests**:
   - Debug the Storybook development server using the Chrome debugger

### Tips for Debugging Tests

1. **Debug only failing tests**: Most test frameworks allow you to run only tests that match a pattern

   ```bash
   # Jest example
   jest -t "calculates total" --runInBand
   ```

2. **Use watch mode with breakpoints**: Start test runner in watch mode and set breakpoints to automatically debug on changes

3. **Debug both test and implementation**: Set breakpoints in both test files and the code under test to understand the full flow

4. **Use the Visual Studio Code Debug Console**: Evaluate expressions and modify values during test execution

5. **Mock dependencies**: Isolate your tests by setting up mocks in the Debug Console during a paused execution

## Inspecting Variables

The "Variables" pane in the Debug view is your primary tool for inspecting the state of your application during debugging. It shows:

- **Local Variables:** Variables within the current scope (function or block).
- **Global Variables:** Variables accessible from anywhere in your code.
- **Closures:** Variables from outer scopes that are accessible within the current function (relevant for JavaScript and other languages with closures).
- **Call Stack:** The sequence of function calls that led to the current point of execution. You can click on different frames in the call stack to inspect the variables in those scopes.

You can expand objects and arrays to see their properties and elements. You can also modify the values of variables directly in the Variables pane (in most cases) to test different scenarios.

## Watch Expressions

Watch expressions allow you to continuously monitor the values of specific expressions or variables during debugging. These expressions are re-evaluated every time the debugger pauses, providing a dynamic view of your data.

To add a watch expression, go to the "Watch" section in the Debug view and click the "+" button. Enter a JavaScript expression. The expression will be evaluated and its value displayed.

For example, you might watch:

- `myVariable`: To see the current value of a variable.
- `myArray.length`: To track the size of an array.
- `myObject.property1 + myObject.property2`: To see the result of a calculation.
- `typeof myVariable`: To track the data type.

Watch expressions are incredibly valuable for tracking down complex state changes and understanding how your data evolves during execution.

> [!TIP]
>
> Combine watch expressions with conditional breakpoints for even more targeted debugging. For example, you could set a conditional breakpoint that only triggers when a watched expression meets a certain condition.

By mastering these advanced debugging techniques, you'll be well-equipped to tackle even the most challenging debugging situations in Visual Studio Code. Remember to experiment with these features and find the workflow that best suits your needs. Happy debugging!
