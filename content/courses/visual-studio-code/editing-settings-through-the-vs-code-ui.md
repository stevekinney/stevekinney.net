---
title: Editing Settings Through the Visual Studio Code UI
description: Learn how to configure Visual Studio Code settings using the visual Settings Editor interface
modified: 2025-03-18T08:28:32-05:00
---

The Settings Editor is Visual Studio Code's user-friendly interface for Browse and modifying settings. It provides a searchable list of all available settings, along with descriptions and their current values.

## Accessing the Settings Editor

- **Menu:** Go to `File` (or `Code` on macOS) > `Preferences` > `Settings` (or `Code` > `Settings` > `Settings` on macOS).
- **Keyboard Shortcut:** Press `Ctrl+,` (Windows, Linux) or `Cmd+,` (macOS).
- **Command Palette:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and type "Settings" or "Preferences: Open Settings (UI)".

## Filtering and Comparing Settings

In addition to the basic search bar, you can leverage search operators to refine your results. For example, typing `@modified` displays only the settings you've changed from their default values. Similarly, `@builtin` shows the original defaults provided by Visual Studio Code. These operators are especially useful for troubleshooting or auditing your customizations.

## Viewing Default Settings

Sometimes it's helpful to compare your changes against the defaults. You can click on the link labeled “Open Default Settings (JSON)” within the Settings Editor. This read-only view shows all the built-in settings along with their default values and descriptions, allowing you to better understand what options are available.

## Syncing and Sharing Settings

Visual Studio Code offers a Settings Sync feature that automatically uploads your customizations to the cloud and synchronizes them across your devices. With Settings Sync enabled, any change you make in the Settings Editor is propagated to all your installations. This is particularly beneficial when setting up a new machine or working on multiple devices, ensuring a consistent environment everywhere.

## Directly Editing Settings Files

For those who prefer granular control, the “Edit in settings.json” link lets you open your configuration file directly. This file supports IntelliSense and schema validation, making it easier to enter valid values. User settings are stored in a centralized file, while workspace settings reside in the `.vscode` folder of your project. Familiarizing yourself with these files can be very helpful when you need to perform bulk changes or share configurations with your team.

## Resetting and Copying Settings

When you need to revert a setting back to its default, simply click the reset icon (the gear) next to the setting. Additionally, hovering over any setting reveals options to copy its ID or export it as JSON. These features are useful for sharing configurations with coworkers or for scripting environment setups.

Each of these enhancements to the Settings Editor not only improves your ability to customize Visual Studio Code but also streamlines the process of managing your development environment.

## Navigating the Settings Editor

- **Search Bar:** The search bar at the top is your primary tool for finding specific settings. Type keywords related to the setting you want to modify (e.g., "font", "indentation", "autosave"). Visual Studio Code will dynamically filter the settings list as you type.
- **Settings List:** The main area of the Settings Editor displays the settings. Settings are grouped into categories (e.g., "Text Editor", "Workbench", "Extensions"). You can expand or collapse categories to browse related settings.
- **Setting Types and Values:** Each setting is displayed with its current value and a brief description. The type of setting is indicated by the input control:
  - **Boolean:** A checkbox for `true` or `false` values.
  - **String:** A text input field for text values.
  - **Number:** A number input field with increment/decrement controls.
  - **Dropdown/Enum:** A dropdown list for selecting from predefined options.
  - **Array:** An "Edit in settings.json"1 link that opens the `settings.json` file to modify the array.
  - **Object:** An "Edit in settings.json" link that opens the `settings.json` file to modify the object.
- **Scope Toggle:** At the top of the Settings Editor, you'll find toggles to switch between "User" and "Workspace" settings. Ensure you are in the correct scope (User or Workspace) before making changes. Folder settings are not directly editable through the UI and must be configured in `settings.json`.
- **"Edit in settings.json" Link:** For some settings, especially complex ones like arrays or objects, you'll see an "Edit in settings.json" link instead of a direct input control. Clicking this link will open the `settings.json` file, allowing you to edit the setting directly in JSON format.
- **Gear Icon (Setting Actions):** Hovering over a setting reveals a gear icon. Clicking this icon provides options like:
  - **Copy Setting ID:** Copies the unique identifier of the setting to the clipboard, useful for sharing settings or scripting.
  - **Copy Setting as JSON:** Copies the setting in JSON format, including its current value and scope.
  - **Reset Setting:** Resets the setting to its default value.

To change a setting's value, simply interact with the input control in the Settings Editor. For boolean settings, toggle the checkbox. For string or number settings, type the desired value. For dropdown settings, select an option from the list. Visual Studio Code automatically saves changes as you make them.
