---
title: Debugging Web Applications in Visual Studio Code
description: Configure Visual Studio Code to debug front-end web applications with breakpoints, variable inspection, and more
modified: 2025-03-16T15:06:06-06:00
---

You can also easily hook into your running web applications using Visual Studio Code.

## Add the Configuration

**Add a debug launch configuration to `.vscode/launch.json`:** If the `.vscode` folder does not exist, create it, and then create the `launch.json` file.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## Run the application

- In the terminal, run `npm run dev`.
- In the Visual Studio Code Debug view, select "Launch Chrome against localhost" (or "Launch Edge against localhost") and press F5.

## Example Debugging Scenarios

### Debugging `addItem`

- Set a breakpoint inside the `addItem` function.
- Add an item to the list.
- Step through the code and inspect the `newItem`, `items`, and `setItems` variables.

### Debugging `calculateTotal`

- Set a breakpoint inside the `calculateTotal` function.
- Add or remove items to trigger a recalculation.
- Inspect the `sum`, `items`, and `total` variables.

### Debugging `removeItem`

- Set a breakpoint inside of the removeItem function.
- Remove an item from the list.
- Verify the content of the `newItems` array.

### Debugging the useEffect

- Set a breakpoint inside of the useEffect's callback function.
- Add or remove items from the list, and verify that the useEffect is called.
- Verify that the total is updated correctly.

### Inspecting React component state

- Use the React Developer Tools extension in Chrome or Edge to inspect the component's state and props. This allows you to observe how the state changes over time.
