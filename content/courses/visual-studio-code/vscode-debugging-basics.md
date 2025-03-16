---
title: 'Debugging: The Basics in VS Code'
description: Learn fundamental debugging techniques in VS Code including launch configurations, breakpoints, and stepping through code
modified: 2025-03-16T15:15:35-06:00
---

> [!NOTE] Example Repository
> We're going to be playing around with some of the examples in [this repository](https://github.com/stevekinney/vscode-examples).

There are a bunch of templates that Visual Studio Code provides to get up and running quickly.

![Setting Up a Launch Configuration](assets/Code%20-%20index.js%20—%20maths%20-2025-03-16%20at%2014.29.30@2x.png)

## Together

We're going to walk through the `maths` example in [this repository]
## Exercise: Debugging an Express Application

Set up a `launch.json`.

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "node",
			"request": "launch",
			"name": "Launch Program",
			"skipFiles": ["<node_internals>/**"],
			"args": ["${workspaceFolder}/index.js"]
		}
	]
}
```

### Debugging `findProduct`

- Set a breakpoint inside the `findProduct` function.
- Make a request to `http://localhost:3000/products/2` or `http://localhost:3000/products/4` (for a not-found scenario).
- Step through the code and inspect the `id` and `product` variables.

### Debugging `calculateTotal`

- Set a breakpoint inside the `calculateTotal` loop.
- Make a request to `http://localhost:3000/calculateTotal?ids=1&ids=3`.
- Inspect the `productIds`, `total`, and `product` variables.
- Make a request that contains an invalid product id, and verify that the product is then undefined, and the total is not affected.

## Debugging the Express Route

- Set a breakpoint on the line containing `res.json(product);` to verify that the correct json is being sent.
- Set a breakpoint on the line containing `res.status(404).send('Product not found');` to verify that the 404 error is being sent when appropriate.

This example provides a simple Node.js application with a few routes that you can use to practice debugging in VS Code. It demonstrates how to set breakpoints, step through code, and inspect variables.

## The Debug Console as a REPL Environment

The Debug Console in VS Code isn't just for viewing log output—it's a fully interactive Read-Eval-Print Loop (REPL) that lets you execute code in the context of your paused application. This powerful feature is like having a command line directly into your running application's state.

### Evaluating Expressions

When your program is paused at a breakpoint, the Debug Console lets you type and evaluate any valid expression using the variables that are currently in scope:

1. Set a breakpoint in your code and start debugging
2. When execution pauses, click on the Debug Console panel (or press Ctrl+Shift+Y)
3. Type expressions to evaluate them in the current context:

```
// Access variables in the current scope
> productIds
[1, 3]

// Perform calculations
> total + 10
45.97

// Call functions
> findProduct(1)
{ id: 1, name: 'Widget', price: 9.99 }

// Chain methods
> products.filter(p => p.price > 10)
[{ id: 3, name: 'Gadget', price: 25.99 }]
```

### Modifying Variables During Debugging

One of the most powerful features of the Debug Console is the ability to modify variables on the fly, letting you test fixes or explore "what if" scenarios without restarting your application:

```
// Change a variable's value
> total = 0
0

// Modify an object property
> product.price = 19.99
19.99

// Add a new property
> req.customField = "testing"
"testing"
```

After modifying values, you can continue execution to see how your application behaves with the new state.

### Using $n References for Previous Results

The Debug Console maintains references to previous expression results using special variables:

- `$0` refers to the most recent evaluation result
- `$1` refers to the second most recent result
- And so on up to `$9`

This feature is invaluable for building complex expressions from previous results:

```
> findProduct(2)
{ id: 2, name: 'Doohickey', price: 19.99 }

// $0 now refers to the product object
> $0.price *= 1.1  // Apply 10% price increase
21.989

// Combine with other operations
> Math.round($0 * 100) / 100  // Round to 2 decimal places
21.99
```

### Practical Example: Debugging the Calculate Total Route

Let's say you're debugging the `calculateTotal` route and want to explore what happens with different inputs:

1. Set a breakpoint inside the `calculateTotal` function
2. Make a request to trigger the breakpoint
3. In the Debug Console:

```
// Inspect the current productIds array
> productIds
[1, 3]

// Try adding a different product ID
> productIds.push(2)
3

// Manually recalculate with the new array
> productIds.reduce((sum, id) => {
    const product = findProduct(id);
    return product ? sum + product.price : sum;
  }, 0)
55.97

// Store the new total
> total = $0
55.97
```

Now you can continue execution to see if your application handles this modified state correctly.

The Debug Console REPL is especially useful for:
- Testing fixes before implementing them
- Exploring object structures
- Prototyping complex calculations
- Simulating different conditions without changing your code
