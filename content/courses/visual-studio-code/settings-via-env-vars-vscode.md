---
title: Controlling Settings with Environment Variables in VS Code
description: Learn how to use environment variables to dynamically configure VS Code settings across different environments
modified: 2025-03-16T13:45:47-06:00
---

Environment variables allow you to dynamically configure VS Code settings based on your system environment. This is useful for adapting settings to different operating systems, development stages (development, staging, production), or user-specific configurations. You can reference environment variables in `settings.json` using the `${env:VARIABLE_NAME}` syntax.

```json
{
	"terminal.integrated.defaultProfile.windows": "${env:WSL_DISTRO_NAME}", // Use WSL distro name as default terminal profile on Windows
	"editor.fontSize": "${env:VSCODE_FONT_SIZE:14}" // Use environment variable VSCODE_FONT_SIZE, default to 14 if not set
}
```

The syntax basically works like this:

- `${env:VARIABLE_NAME}`: References the environment variable `VARIABLE_NAME`.
- `${env:VARIABLE_NAME:DEFAULT_VALUE}`: Provides a default value (`DEFAULT_VALUE`) if the environment variable is not set.

Visual Studio Code also supports these variables out of the box:

- **`VSCODE_FONT_SIZE`:** Example used above to dynamically set font size.
- **`VSCODE_DISABLE_EXTENSIONS`:** Disable all extensions when launching VS Code (useful for troubleshooting).
- **`VSCODE_DEV`:** Launch VS Code in development mode.

## Potential Use Cases

- **Cross-Platform Settings:** Use environment variables to set OS-specific paths or configurations in `settings.json`, making your settings portable across different operating systems.
- **Environment-Aware Settings:** Adjust settings based on the development environment. For example, you might use different linters or formatters for development and production environments.
- **User-Specific Customization:** Allow different users on a team to have slightly different VS Code configurations by using user-specific environment variables.
