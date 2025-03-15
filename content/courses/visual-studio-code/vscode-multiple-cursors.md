---
title: Multiple Cursors in VS Code
description: Learn how to use multiple cursors for efficient simultaneous editing across multiple locations in your code
modified: 2025-03-16T15:00:00-06:00
---

## Working with Multiple Cursors in Visual Studio Code

Multiple cursors let you edit code in several places at once. This feature is perfect for renaming repeated variables, inserting the same snippet in multiple lines, or applying quick fixes across multiple spots. Here’s how to unleash their power.

When you hold `Alt` (or `Option` on macOS) and click in different locations, VS Code places separate cursors wherever you click. Anything you type then appears in all those positions simultaneously. You can also place cursors in a vertical column by holding `Shift + Alt` (Windows/Linux) or `Shift + Option` (macOS) while dragging the mouse vertically.

If you want to select repeated text, highlight a word and press `Ctrl+D` (Windows/Linux) or `Cmd+D` (macOS) to add the next occurrence to your selection. Keep pressing the same shortcut to include each subsequent occurrence. Once all instances are selected, you can type over them in one go—great for quick renames or consistent formatting.

```ts
// Example: Quickly rename `foo` to `bar`
const foo = 1;
console.log(foo, foo + 1);
```

Highlight `foo` and press `Ctrl+D` or `Cmd+D` repeatedly until all instances are selected. Begin typing `bar`, and every highlighted word changes at once.

> [!TIP]
> If you accidentally select one occurrence too many, press `Ctrl+U` (Windows/Linux) or `Cmd+U` (macOS) to undo your last selection action. This lets you fine-tune which occurrences get changed.

Multiple cursors also extend to other editing commands. For example, you can indent or uncomment multiple lines simultaneously, or use shortcuts like `Ctrl+Shift+K` (Windows/Linux) or `Cmd+Shift+K` (macOS) to delete all lines where cursors are placed. Once you get comfortable with these techniques, you’ll speed through tasks that used to be tedious one-by-one edits.
