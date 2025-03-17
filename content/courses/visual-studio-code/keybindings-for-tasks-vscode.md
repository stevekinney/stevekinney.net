---
modified: 2025-03-17T13:44:39-05:00
title: Keybindings for Tasks
---

## Keybindings for Tasks

Another example is a custom task that might run a build step:

```json
{
	"key": "ctrl+shift+b",
	"command": "workbench.action.tasks.runTask",
	"args": "build",
	"when": "editorFocus"
}
```

Here, pressing `Ctrl+Shift+B` triggers a build task in the current project. Simple, fast, and tailored exactly to your workflow.

## Keybindings

Keybindings are the magic shortcuts that let you summon commands with a single keystroke. You can view and customize them directly from the Command Palette by searching for `Preferences: Open Keyboard Shortcuts`. This view lists every available command and any default or custom bindings.

If you find an essential command buried in the Command Palette, assign it a convenient keyboard shortcut. That way, you can skip hunting for it next time and cut right to the chase.

## Custom Keybindings

Beyond the Keybindings editor lies the real wizardry: custom keybindings in `keybindings.json`. This file is accessible via the Command Palette by searching for `Preferences: Open Keyboard Shortcuts (JSON)`. It provides granular control over how and when shortcuts fire.

### The `keybindings.json` File

At its core, `keybindings.json` is a list of rules. Each rule typically contains a `key`, a `command`, and an optional `when` clause. For example:

```json
{
	"key": "ctrl+alt+j",
	"command": "editor.action.commentLine",
	"when": "editorTextFocus && editorLangId == 'javascript'"
}
```

This binds `Ctrl+Alt+J` to toggle line comments, but only in JavaScript files (`editorLangId == 'javascript'`). If you tried using this binding in a TypeScript file, it wouldn’t work.

### Understanding the `when` Clause

The `when` clause is how you set contextual rules. It acts like an inline condition that must be true for the binding to trigger. Common examples include:

- `editorTextFocus`: Ensures the cursor is currently in a text editor (not in a diff view or a panel).
- `editorLangId == 'javascript'`: Restricts the keybinding to JavaScript files.
- `isInDiffEditor`: Targets only the diff editor, useful for code reviews.

Chaining multiple conditions is as easy as using `&&` between them. This flexibility empowers you to craft precise shortcuts that behave consistently in each context.

> [!WARNING] Be careful not to get carried away adding too many conditions. Overly specific `when` clauses might leave you wondering why a shortcut suddenly stopped working.

### Avoiding Keybinding Conflicts

Conflicts occur when two or more shortcuts are bound to the same keys in the same context. Visual Studio Code typically uses the last declared binding, so whichever one is loaded last takes priority. To avoid confusion, review existing shortcuts in the Keybindings editor before assigning new ones. If you find a conflict, either remove or change the old binding to keep your muscle memory intact.

> [!TIP] Overriding extensions that override your key bindings
> If you rely on an extension that hijacks a shortcut you love, open `keybindings.json` and override it. Conflict solved—no drama necessary.
