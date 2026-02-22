---
title: Multiple Cursors in Visual Studio Code
description: >-
  Learn how to use multiple cursors for efficient simultaneous editing across
  multiple locations in your code
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

What to know the quickest way to become a 10x developer? **Ten cursors**.

Multiple cursors let you edit code in several places at once. This feature is perfect for renaming repeated variables, inserting the same snippet in multiple lines, or applying quick fixes across multiple spots. Here's how to unleash their power.

When you hold `Alt` on Windows/Linux or `Option` on macOS and click in different locations, Visual Studio Code places separate cursors wherever you click. Anything you type then appears in all those positions simultaneously. You can also place cursors in a vertical column by holding `Shift + Alt` (Windows/Linux) or `Shift + Option` (macOS) while dragging the mouse vertically.

If you want to select repeated text, highlight a word and press `Ctrl+D` (Windows/Linux) or `Cmd+D` (macOS) to add the next occurrence to your selection. Keep pressing the same shortcut to include each subsequent occurrence. Once all instances are selected, you can type over them in one go—great for quick renames or consistent formatting.

```ts
// Example: Quickly rename `foo` to `bar`
const foo = 1;
console.log(foo, foo + 1);
```

Highlight `foo` and press `Ctrl+D` or `Cmd+D` repeatedly until all instances are selected. Begin typing `bar`, and every highlighted word changes at once.

> [!TIP]
> If you accidentally select one occurrence too many, press `Ctrl+U` (Windows/Linux) or `Cmd+U` (macOS) to undo your last selection action. This lets you fine-tune which occurrences get changed.

Multiple cursors also extend to other editing commands. For example, you can indent or uncomment multiple lines simultaneously, or use shortcuts like `Ctrl+Shift+K` (Windows/Linux) or `Cmd+Shift+K` (macOS) to delete all lines where cursors are placed. Once you get comfortable with these techniques, you'll speed through tasks that used to be tedious one-by-one edits.

## Column Selection

If you hold `Shift-Option` on macOS or `Shift-Alt`—so, basically the same thing—you can drag and select an entire region. I've never actually found a reason to do this. But, I imagine one day, I will need it and it will be helpful.

## Keyboard Shortcuts for Additional Cursors

You can boost your multi-cursor workflow by using dedicated keyboard shortcuts to add cursors without reaching for the mouse. On Windows/Linux, press `Ctrl+Alt+Down` or `Ctrl+Alt+Up` to insert additional cursors on the line below or above your current one. For macOS users, try `Cmd+Option+Down` or `Cmd+Option+Up`. These shortcuts are especially useful when you need to edit adjacent lines quickly.

## Select All Occurrences

Need to change every instance of a word in one go? Instead of repeatedly pressing `Ctrl+D` or `Cmd+D`, you can select all occurrences of the current word by using `Ctrl+F2` (Windows/Linux) or `Cmd+F2` (macOS). This instantly places a cursor on every match in the file, making global edits a breeze.

## Insert Cursor at End of Each Line

When working with block selections, you might want to add a cursor at the end of every line within a multi-line selection. VS Code offers the command **"Insert Cursor at End of Each Line Selected"**. You can access it via the Command Palette or assign it a custom keybinding. This technique is perfect for appending text to multiple lines simultaneously.

> [!TIP] Combine these keyboard shortcuts with snippet insertion and standard editing commands for a powerful, fluid editing experience that turns repetitive tasks into lightning-fast operations.

## Undoing a Cursor

When you're working with multiple cursors, it's easy to accidentally add one extra that you don't need. Fortunately, Visual Studio Code provides a simple way to remove the most recently added cursor. Just press `Ctrl+U` on Windows/Linux or `Cmd+U` on macOS, and the last cursor you placed will be undone. This lets you fine-tune your multi-cursor selection until only the desired occurrences are included. Use this shortcut as often as needed to ensure your editing remains precise and controlled.
