---
title: Settings Precedence in Visual Studio Code
description: >-
  Understand how Visual Studio Code's hierarchical settings system works across
  default, user, workspace, and folder levels
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

Visual Studio Code settings are organized into a hierarchical system, allowing you to define configurations at different scopes. This hierarchy ensures flexibility, enabling you to apply general settings across all your projects while also accommodating project-specific needs. The settings levels, in order of precedence (from least to most specific), are:

- **Default Settings:** These are the built-in settings that Visual Studio Code ships with. They are the baseline configuration and are read-only. You can view them in the Settings Editor by clicking the "Open Default Settings (JSON)" button in the Settings Editor toolbar or by opening the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and running "Preferences: Open Default Settings (JSON)". Understanding default settings can be helpful to see what is configurable.
- **User Settings:** These settings apply globally to all Visual Studio Code instances you open, regardless of the project or workspace. User settings are ideal for personal preferences that you want to maintain across all your development activities. User settings are stored in:
  - **Windows:** `%APPDATA%\Code\User\settings.json`
  - **macOS:** `~/Library/Application Support/Code/User/settings.json`
  - **Linux:** `~/.config/Code/User/settings.json`
- **Workspace Settings:** Workspace settings are specific to the currently opened workspace or folder. A workspace in Visual Studio Code is typically your project's root directory. These settings override User settings and are perfect for project-specific configurations, such as code formatting rules, linters, or language-specific settings. Workspace settings are stored in a `.vscode` folder at the root of your workspace in a `settings.json` file. If a workspace is not explicitly saved, these settings are stored in the User settings, but scoped to the opened folders.
- **Folder Settings:** Within a Workspace, you can further customize settings for specific folders. Folder settings are the most granular level and override both User and Workspace settings. Like Workspace settings, Folder settings are stored in a `.vscode` folder within the specific folder in a `settings.json` file. This level is useful for very specific configurations within a large workspace, like different settings for backend and frontend folders in a full-stack project.

**Settings Precedence:** When a setting is defined at multiple levels, Visual Studio Code applies the setting from the most specific level. Folder settings override Workspace settings, which in turn override User settings, which finally override Default settings. This cascading system ensures that you can define general preferences at the User level and then fine-tune them for specific projects or folders as needed.
