---
title: Building a Simple Extension
modified: 2025-03-18T04:22:17-05:00
description: A quick guide to building a Visual Studio Code extension.
---

Let's build a simple extension that finds all of the `FIXME`s in a JavaScript file and then decorates them so that we can see them easily.

In `extension.js`, let's add the following:

```js
const vscode = require('vscode');

// Step A: Define a decoration type
const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.3)', // semi-transparent red
});

// Step B: Function to find and decorate words
function decorateWords() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const text = editor.document.getText();
  const regex = /\bFIXME\b/g;

  const ranges = [...text.matchAll(regex)].map((match) => {
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + match[0].length);
    return new vscode.Range(startPos, endPos);
  });

  editor.setDecorations(decorationType, ranges);
}

// Step C: Hook the function into editor/document change events
function subscribeToDocumentChanges(context) {
  // Re-run whenever text changes
  vscode.workspace.onDidChangeTextDocument(() => decorateWords(), null, context.subscriptions);
  // Re-run whenever the active editor changes (switch tabs, etc.)
  vscode.window.onDidChangeActiveTextEditor(() => decorateWords(), null, context.subscriptions);

  // Run at least once on activation
  decorateWords();
}

// This is your extension’s main activation
function activate(context) {
  // Register the decorator logic with events
  subscribeToDocumentChanges(context);
}

// export (so VS Code recognizes these functions)
module.exports = {
  activate,
  deactivate: () => {},
};
```

This code:

- Creates a decoration style (red-ish background).
- Looks for `FIXME` in the current document.
- Calls `setDecorations` so every instance gets lit up like a holiday tree.
- Subscribes to relevant events to keep decorations current.

## Wire Up `package.json`

Your `package.json` should have something like this in its `contributes` section or at least these fields to let VS Code know _when_ to activate your extension:

```json
{
  "name": "comment-highlighter",
  "displayName": "comment-highlighter",
  "description": "It highlights comments.",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.98.0"
  },
  "activationEvents": ["onLanguage:javascript", "onLanguage:typescript"],
  "main": "./extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.decorateWords",
        "title": "Decorate Words"
      }
    ]
  }
  // …More stuff…
}
```

- `main` points to `extension.js`.
- `activationEvents`: Tells Visual Studio Code to spin up your extension on certain triggers, like after startup or when the active editor changes.

Want to highlight more words (like `BUG`, `TODO`, `WTF`, or “the code is on fire”)? Just add more regex checks or combine them into a single fancy regex. For example:

```js
// Catch FIXME, BUG, or TODO
const regex = /\b(FIXME|BUG|TODO)\b/g;
```

Obviously, you can also add more decoration types for the different types of things you want to decorate.
