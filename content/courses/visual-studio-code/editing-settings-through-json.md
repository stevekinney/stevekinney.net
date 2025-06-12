---
title: Editing Settings Through JSON
description: Learn how to directly edit Visual Studio Code settings using the settings.json file for advanced configuration
modified: 2025-03-16T12:36:12-06:00
---

The Settings Editor provides a convenient visual interface, directly editing the `settings.json` file offers more advanced control and is essential for certain customizations. `settings.json` files are plain text files formatted in JSON (JavaScript Object Notation).

## Accessing `settings.json`

- **Settings Editor:** In the Settings Editor, click the "Open Settings (JSON)" icon in the top-right corner. This will open the `settings.json` file for the currently selected scope (User or Workspace).
- **Command Palette:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run "Preferences: Open Settings (JSON)". This opens the User `settings.json`. To open Workspace `settings.json`, run "Preferences: Open Workspace Settings (JSON)".

Depending on your platform, the user settings file is located here:

- **Windows** `%APPDATA%\Code\User\settings.json`
- **macOS** `$HOME/Library/Application\ Support/Code/User/settings.json`
- **Linux** `$HOME/.config/Code/User/settings.json`

### JSON Syntax and Schema

```json
{
  "editor.fontSize": 14,
  "editor.fontFamily": "Fira Code",
  "editor.lineHeight": 22,
  "workbench.colorTheme": "Dracula",
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/node_modules": true
  },
  "explorer.confirmDelete": false,
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.fontFamily": "monospace",
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false
}
```

## Advanced Configuration with `settings.json`

**Comments:** While JSON itself doesn't support comments, Visual Studio Code `settings.json` allows single-line (`//`) and multi-line (`/* … */`) comments for documentation and notes.

**Conditional Settings:** You can use language-specific settings within `settings.json` to apply configurations only to certain languages. For example:

```json
{
  "[python]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "python.linting.pylintEnabled": true
  },
  "[javascript]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true
  }
}
```

This example sets `tabSize` to 4 and enables `pylint` for Python files, while setting `tabSize` to 2 for JavaScript files. The language identifier (e.g., `python`, `javascript`) is enclosed in square brackets `[]`. You can find language identifiers in the Language Mode selector in the bottom-right corner of Visual Studio Code.

**Array and Object Settings:** Settings that are arrays or objects are often easier to configure directly in `settings.json`. For instance, the `files.exclude` setting, which is an object, is typically modified in `settings.json` to add or remove file patterns to exclude from the Explorer.

**Scripting and Automation:** `settings.json` files can be programmatically generated or modified, enabling scripting and automation of Visual Studio Code configuration. This can be useful for setting up consistent development environments across teams or for dynamically adjusting settings based on scripts or environment variables.
