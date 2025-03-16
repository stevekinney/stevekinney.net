---
title: Editing Settings Through the VS Code UI
description: Learn how to configure VS Code settings using the visual Settings Editor interface
modified: 2025-03-16T12:29:39-06:00
---

The Settings Editor is VS Code's user-friendly interface for Browse and modifying settings. It provides a searchable list of all available settings, along with descriptions and their current values.

## Accessing the Settings Editor

- **Menu:** Go to `File` (or `Code` on macOS) > `Preferences` > `Settings` (or `Code` > `Settings` > `Settings` on macOS).
- **Keyboard Shortcut:** Press `Ctrl+,` (Windows, Linux) or `Cmd+,` (macOS).
- **Command Palette:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and type "Settings" or "Preferences: Open Settings (UI)".

## Navigating the Settings Editor

- **Search Bar:** The search bar at the top is your primary tool for finding specific settings. Type keywords related to the setting you want to modify (e.g., "font", "indentation", "autosave"). VS Code will dynamically filter the settings list as you type.
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

To change a setting's value, simply interact with the input control in the Settings Editor. For boolean settings, toggle the checkbox. For string or number settings, type the desired value. For dropdown settings, select an option from the list. VS Code automatically saves changes as you make them.
