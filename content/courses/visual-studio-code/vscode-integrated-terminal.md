---
title: Integrated Terminal in VS Code
description: "Learn how to use and customize VS Code's integrated terminal for efficient development workflows"
modified: 2025-03-17T13:41:35-05:00
---

The built-in terminal is pretty straight-forward, but let's look at some of the ways that we can take it the Next Level™, as they say.

> [!NOTE] The Quick Way
> Hitting `Cmd+Backtick` or `Ctrl-Backtick` will open up the integrated terminal.

## Creating and Managing Multiple Terminals

Running multiple terminals at once is often crucial for modern development. You may need one terminal for running a local server and another for linting or testing. In VS Code, opening new terminals is as simple as clicking the plus button (`+`) on the top-right corner of the terminal panel. Each new terminal runs in its own instance, visible in a dropdown that lets you switch between them effortlessly.

To close a terminal you no longer need, click the trash can icon or use the right-click context menu on the terminal tab. Switching between terminals is a matter of selecting the desired session from the dropdown, and you can rename them for clarity by double-clicking the terminal tab label. This quick access to multiple environments ensures you’re never stuck halting one process just to start another.

> [!TIP] Multiple Terminals Made Easy
> If you often need the same set of terminals (e.g., server, build watcher, test watcher), consider scripting a quick Terminal Task to launch them all in one go. It’s like calling your personal pit crew to get everything running at once.

## Terminal Profiles

You can switch between different shell profiles—bash, zsh, PowerShell, WSL, and more. To configure these profiles, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and search for `Terminal: Select Default Profile`. A list of detected shells appears, allowing you to choose your favorite.

For more control, head into your settings (click the gear icon in the bottom-left, then `Settings`) and search for `Terminal > Integrated > Profiles`. From there, you can define custom profiles with specific paths, environment variables, and command line arguments. Whether you’re doing cross-platform work or jumping between Node.js and Python projects, these profiles can be a lifesaver.

## Splitting Terminals

Sometimes, you want to keep multiple terminals in view simultaneously. Splitting your terminal lets you see two or more sessions side-by-side (or stacked) within the same panel. Here’s how to do it:

- Click the split icon in the terminal panel’s toolbar to create a new split terminal.
- Alternatively, right-click an existing terminal tab and select `Split` from the context menu.
- You can choose to split either horizontally or vertically by toggling the layout icon near the top-right corner of the terminal window.

This capability is perfect for quickly comparing logs from a client and server, or running two parallel processes without shuffling between tabs.

## Terminal Customization

VS Code provides plenty of ways to fine-tune the terminal’s appearance. Beyond merely adjusting the font face and size (in `Terminal > Integrated: Font Family` and `Font Size`), you can also tweak colors, cursor styles, and even the blinking behavior. For instance, you could set up a neon green cursor or a more subdued theme to match your editor.

In your settings JSON file (or through the GUI), look for `terminal.integrated.*` options. You’ll see properties like `terminal.integrated.cursorStyle`, `terminal.integrated.cursorBlinking`, and various color customizations under `workbench.colorCustomizations`. Feel free to experiment to achieve the style that makes you most productive—just don’t make the colors so flashy that you feel like you’re coding at a rave.

## Tasks and the Terminal

> [!NOTE] We'll talk more about tasks in a little bit
> You can take a sneak peak [here](vscode-tasks.md), if you're so inclined.

VS Code tasks often run directly in the integrated terminal by default. This includes build tasks, test tasks, lint tasks, and more. Tasks let you automate repetitive workflows, and the integrated terminal provides a convenient, visible way to see your scripts in action. If you’ve set up multiple terminals, you can even watch a task run in one while you continue manual commands in another.

If you’re looking to orchestrate a set of tasks, define a `tasks.json` file in your project’s `.vscode` folder. You can specify commands, shell types, and environment variables, all of which execute in the integrated terminal. This combination simplifies your workflow—fewer alt-tabbing around, more coding.

## Shell Integration

The integrated terminal can auto-inject environment variables or track certain command events, depending on your shell and the extensions you’ve installed. For instance, VS Code’s Remote—WSL extension seamlessly detects your WSL distribution and mirrors your development environment from Windows into Linux. You might also use environment variable injection to pass credentials or configuration details without manually re-exporting them every time.

> [!WARNING] Be cautious when passing sensitive environment variables. While it’s convenient, always ensure you’re not inadvertently exposing secrets in public repos or recorded terminal sessions.

## Searching Within the Terminal

Long terminal sessions can accumulate a lot of output—logs, debugging info, and more. Searching within the terminal is straightforward:

- Click the magnifying glass icon (Find) in the terminal toolbar, or press `Ctrl+F` (on Windows/Linux) or `Cmd+F` (on macOS) while the terminal is focused.
- Type your query to highlight matches in the terminal output.

## Focusing the Active Terminal

**Pro-Tip**: `Ctrl-Backtick` will open or close the integrated terminal. Theoretically `Cmd-Down` will focus it, but only if you have accessibility mode turned on. You can add a keybinding that will focus the terminal if it's already created.

```json
[
	{
		"key": "ctrl+`",
		"command": "workbench.action.terminal.focus",
		"when": "terminalHasBeenCreated && terminalProcessSupported"
	}
]
```

Obviously, you can choose any keybinding that pleases you.
