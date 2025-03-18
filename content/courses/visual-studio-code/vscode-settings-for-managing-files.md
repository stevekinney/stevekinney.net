---
title: Settings for Managing Files in Visual Studio Code
description: Configure file associations, exclusions, and default behaviors for efficient file management in Visual Studio Code
modified: 2025-03-18T08:32:59-05:00
---

The **Files and Workspaces** settings category allows you to configure how Visual Studio Code handles files, folders, and workspaces, streamlining project management and file type associations.

## `files.associations`

You can associate file extensions with specific language modes. This is crucial for syntax highlighting, IntelliSense, and language-specific features.

```json
"files.associations": {
	"*.module.css": "css",
	"*.component.ts": "typescriptreact"
}
```

You can also override language detection for specific files using glob patterns:

```json
"files.associations": {
	"**/*.conf": "ini" // Treat all .conf files as INI files
}
```

## `files.exclude`

Specify file patterns to exclude from the Explorer, Search, and Go to File. Useful for hiding build artifacts, dependency folders (like `node_modules`), and temporary files.

```json
"files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/build": true,
    "**/dist": true
}
```

This one probably makes more sense as a workspace setting since most of the normal culprits are already included by default.

## Setting a Default Language for Empty Files: `files.defaultLanguage`

`files.defaultLanguage` lets you set the default language mode for new files or files without a recognized extension.

Depending on the project, I will typically set this to either `markdown` or `typescript`.

## Auto Save (`files.autoSave`)

To maintain a smooth workflow without constantly worrying about saving your work, consider enabling `files.autoSave`. This setting automatically saves your changes either after a specified delay or when focus shifts away from the editor. This ensures your work is always up to date and can help prevent accidental data loss.

```json
"files.autoSave": "afterDelay",
"files.autoSaveDelay": 1000
```

> [!TIP] Auto Save is particularly beneficial during long coding sessions, keeping your changes secure without interrupting your focus.

## Trim Trailing Whitespace : `files.trimTrailingWhitespace`

Clean code is easier to maintain and review. By enabling `files.trimTrailingWhitespace`, Visual Studio Code will automatically remove any extra spaces at the end of lines whenever you save a file. This not only improves the aesthetics of your code but also helps prevent unnecessary diffs in version control.

```json
"files.trimTrailingWhitespace": true
```

> [!TIP] A tidier file not only looks better but also reduces noise in your commit history, making code reviews smoother.

## Insert Final Newline: `files.insertFinalNewline`

Some coding standards require that files end with a newline character. With the `files.insertFinalNewline` setting, VS Code automatically adds a newline at the end of a file upon saving. This small tweak can help avoid warnings from linters and ensure consistency across your codebase.

```json
"files.insertFinalNewline": true
```

> [!TIP] Adding a final newline is a simple practice that contributes to cleaner code formatting and better collaboration across diverse development environments.
