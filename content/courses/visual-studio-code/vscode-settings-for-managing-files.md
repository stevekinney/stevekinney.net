---
title: Settings for Managing Files in Visual Studio Code
description: Configure file associations, exclusions, and default behaviors for efficient file management in Visual Studio Code
modified: 2025-03-16T13:05:23-06:00
---

The **Files and Workspaces** settings category allows you to configure how Visual Studio Code handles files, folders, and workspaces, streamlining project management and file type associations.

## File Associations (`files.associations`)

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

## File Exclude (`files.exclude`)

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

## Setting a Default Language for Empty Files (`files.defaultLanguage`)

`files.defaultLanguage` lets you set the default language mode for new files or files without a recognized extension.

Depdending on the project, I will typically set this to either `markdown` or `typescript`.
