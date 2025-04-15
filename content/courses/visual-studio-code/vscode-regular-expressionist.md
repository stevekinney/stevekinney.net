---
title: Building a Text Completion Extension
modified: 2025-03-18T04:07:01-05:00
---

We have some boilerplate ready to go in the `regular-expressionist` folder in the `vscode-examples` repository. Our mission is to spin up a web view in order to load up a custom user interface.

We're going to try out the following:

```js
function openRegularExpressionist(context) {
  const panel = vscode.window.createWebviewPanel(
    'regularExpressionist', // Identifies the type of the webview
    'Regular Expressionist', // Title of the panel
    vscode.ViewColumn.One, // Editor column to show the new webview panel in
    {
      enableScripts: true, // We want to enable JS in the webview
    },
  );

  // Set the HTML content for the webview
  panel.webview.html = getWebviewContent();

  // Listen for messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'evaluateRegex') {
        const { pattern, text, flags } = message;
        const response = evaluateRegularExpression(pattern, text, flags);
        // Send the results back to the webview
        panel.webview.postMessage({ command: 'updateResult', data: response });
      }
    },
    undefined,
    context.subscriptions,
  );
}
```
