---
title: Popular Visual Studio Code Settings
description: Discover valuable Visual Studio Code settings to customize your editor for maximum productivity and a better development experience
modified: 2025-03-16T13:01:13-06:00
---

## Steve's Favorites

I'm a relatively simple person, but here are some settings I feel strongly about—in descending order.

### `workbench.editor.revealIfOpen`

The `workbench.editor.revealIfOpen` setting is your Visual Studio Code version of, “Hey, I already have that file open!” Instead of cluttering your workspace with duplicate tabs, Visual Studio Code just brings the existing tab into focus. Here’s the breakdown:

When you open a file that’s already open in another tab, Visual Studio Code simply reveals the existing tab rather than opening a new one. No more dueling duplicates.

### `updateImportsOnFileMove`

```json
"javascript.updateImportsOnFileMove.enabled": "always",
"typescript.updateImportsOnFileMove.enabled": "always",
```

Whenever you move (or rename) a file, Visual Studio Code scans your project and automatically updates all import paths that reference the moved file. No more broken links.

#### How It Works

- **Behind the Scenes:** When you move a file, the language service kicks in and looks for any import statements that refer to that file’s old location. It then rewrites them with the new path.
- **“Always” Mode:** With the setting set to "always", this process happens automatically—without prompting you. It’s like having a personal assistant who never forgets to update your contacts when you change your number.

#### Why I Like It

- **Error Prevention:** No more mysterious “module not found” errors due to outdated paths.
- **Effortless Refactoring:** You can rearrange your project structure without the fear of breaking your import statements.
- **Team-Friendly:** Ensures consistency and saves your team from the headache of manually updating imports across multiple files.

Both settings ensure that whenever you move a file in your JavaScript or TypeScript project, Visual Studio Code automatically updates the corresponding import paths. This keeps your code clean, functional, and free from those pesky path errors—letting you focus on building features instead of debugging import statements.

### `javascript.preferences.organizeImports`

This setting is basically Visual Studio Code’s way of letting you keep your import statements as neat as a well-organized sock drawer. Here’s the lowdown:

#### What It Does

- **Automatic Cleanup:** When enabled, Visual Studio Code’s JavaScript language service will tidy up your imports by removing unused ones, sorting them, and grouping them logically. It’s like having a digital Marie Kondo for your code.
- **Manual or Auto:** You can trigger this manually via the “Organize Imports” command or automatically when you save your file if you’ve configured the appropriate code action.

#### How It Works

- **Integration with Code Actions:** The setting works in tandem with the code action "source.organizeImports". When you save (and if you’ve set it up in editor.codeActionsOnSave), Visual Studio Code will run through your file and re-arrange your import statements.
- **Keeps Your Code Lean:** By getting rid of unused imports and sorting the rest, it ensures that your code doesn’t accumulate unnecessary baggage—keeping it cleaner and easier to read.

#### How to Configure

1. **Set the Preference:** Make sure you have "javascript.preferences.organizeImports": true in your Visual Studio Code settings (if applicable).
2. **Enable on Save (Optional):** Add this to your settings to have it auto-run on save:

```ts
"editor.codeActionsOnSave": {
  "source.organizeImports": true
}
```

**Enjoy the Cleanup:** Now every time you save, your imports get a tidy makeover—no more rogue, unused modules hanging around!

#### Why It’s Worth Using

- **Consistency:** Ensures that all your files follow the same organized pattern.
- **Reduced Clutter:** Eliminates dead code (unused imports) that might confuse or bloat your files.
- **Better Collaboration:** Clean, organized imports make it easier for teammates (or future you) to understand your code quickly.

In short, javascript.preferences.organizeImports is a small setting that delivers big-time benefits, keeping your codebase sharp without you having to lift a finger (or at least not for import cleanup). No more manual sorting—just pure, automated tidiness!

## Other Popular Settings

I don't love all of these, but other people do and you might too. Here are a few popular Visual Studio Code tweaks that many developers swear by, along with why they might tickle your fancy:

### `files.autoSave`

- Automatically saves your changes based on your chosen trigger (e.g., after a delay, when focus changes, or on window change).
- It's like having an overzealous backup buddy who never lets you lose your unsaved genius.

### `editor.minimap.enabled`

- Toggles the minimap—a little bird's-eye view of your code—on or off.
- For those who love a visual map of their code or want to reduce on-screen clutter if the minimap feels like extra baggage.

### `editor.wordWrap`

- Wraps long lines of code so you don’t have to scroll sideways forever.
- Keeps your code readable without feeling like you’re stuck in an endless horizontal tunnel.

### `editor.renderWhitespace`

- Displays invisible characters like spaces, tabs, and line breaks.
- Handy for catching sneaky formatting issues, so you always know exactly what’s going on behind the scenes.

### `editor.cursorSmoothCaretAnimation`

- Gives your cursor movement a smooth, animated glide.
- It may not affect functionality, but it sure makes navigating your code feel like a dance routine.

### `workbench.iconTheme`

- Lets you choose a different set of file icons, so your file tree can look as stylish as your code.
- A fresh icon theme can inject some personality into your workspace—think of it as a makeover for your file explorer.

### `editor.codeLens`

- Adds inline annotations for references, test statuses, and more.
- It’s like having tiny, helpful post-it notes in your code, keeping track of important info right where you need it.

### `terminal.integrated.fontFamily`

- Lets you set your favorite terminal font for a more personalized or visually appealing integrated terminal.
- Because even your command line deserves to look cool and feel comfortable.
