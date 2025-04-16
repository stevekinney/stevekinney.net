---
modified: 2025-03-18T08:03:25-05:00
title: Keybindings
description: 'Setting key bindings in Visual Studio Code.'
---

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

Here are some common values for the `when` property.

- **`editorTextFocus`**: True when the text editor has focus.
- **`editorLangId`**: Represents the language identifier of the current file (e.g., 'typescript', 'javascript').
- **`resourceExtname`**: The file extension of the current resource (e.g., '.js', '.ts').
- **`resourceScheme`**: The URI scheme of the resource (e.g., 'file', 'untitled').
- **`sideBarFocus`**: True when the sidebar has focus.
- **`panelFocus`**: True when the panel (bottom section) has focus.
- **`inDebugMode`**: True when the debugger is active.
- **`debuggersAvailable`**: True when there are debuggers available for the current session.
- **`textInputFocus`**: True when a text input box (including the editor) has focus.
- **`config.<settingName>`**: Represents the value of a specific setting; for example, `config.editor.tabCompletion` checks the 'editor.tabCompletion' setting.

These context keys can be combined using conditional operators to create more specific conditions:

- **`&&`**: Logical AND.
- **`||`**: Logical OR.
- **`!`**: Logical NOT.
- **`==`**: Equality.
- **`!=`**: Inequality.
- **`=~`**: Matches a regular expression.

> [!NOTE] Exploring Context Keys
> To explore active context keys in your current VS Code session, you can use the **Developer: Inspect Context Keys** command from the Command Palette. This tool provides insight into the current state of various context keys, aiding in the creation of precise "when" clauses. You will need to

### Avoiding Keybinding Conflicts

Conflicts occur when two or more shortcuts are bound to the same keys in the same context. Visual Studio Code typically uses the last declared binding, so whichever one is loaded last takes priority. To avoid confusion, review existing shortcuts in the Keybindings editor before assigning new ones. If you find a conflict, either remove or change the old binding to keep your muscle memory intact.

> [!TIP] Overriding extensions that override your key bindings
> If you rely on an extension that hijacks a shortcut you love, open `keybindings.json` and override it. Conflict solved—no drama necessary.

## Exporting and Syncing Keybindings

VS Code offers a built-in Settings Sync feature that includes your custom keybindings, ensuring that your personalized shortcuts travel with you between machines. By enabling Settings Sync, your `keybindings.json` is automatically backed up and shared across your devices, keeping your workflow consistent wherever you work.

## Platform-Specific Keybindings

Sometimes the same shortcut isn’t ideal across different operating systems. VS Code allows you to define platform-specific keybindings directly in your `keybindings.json`. For example, you can override the key for a command on macOS compared to Windows or Linux:

```json
{
  "key": "ctrl+shift+t",
  "command": "workbench.action.reopenClosedEditor",
  "when": "editorTextFocus",
  "mac": "cmd+shift+t"
}
```

This configuration ensures that macOS users use `Cmd+Shift+T` while others stick with `Ctrl+Shift+T`, adapting the experience to the strengths of each platform.

## Multi-Stroke Keybindings

VS Code supports multi-stroke (or chorded) keybindings, which allow you to chain multiple keystrokes to trigger a command. This approach minimizes conflicts with single keystroke bindings and can be more memorable for complex commands. For instance, the following binding requires two sequential key presses:

```json
{
  "key": "cmd+k cmd+c",
  "command": "editor.action.addCommentLine",
  "when": "editorTextFocus"
}
```

Using multi-stroke keybindings provides a robust way to extend your shortcut repertoire without overcrowding your keyboard, allowing you to assign commands in a more intuitive and organized manner.

> [!tip] Running Multiple Commands
> There is a handy extension for that called [**Multi Command**](https://marketplace.visualstudio.com/items?itemName=ryuta46.multi-command).
