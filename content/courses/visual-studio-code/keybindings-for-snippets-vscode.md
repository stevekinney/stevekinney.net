---
modified: 2025-03-17T10:50:34-06:00
---
Custom keybindings aren’t limited to built-in commands. You can also bind snippets, custom tasks, or extension-specific features.

For instance, if you want a quick snippet of a React component:

```json
{
  "key": "ctrl+alt+r",
  "command": "editor.action.insertSnippet",
  "when": "editorTextFocus && editorLangId == 'typescriptreact'",
  "args": {
    "langId": "typescriptreact",
    "name": "ReactFunctionalComponent"
  }
}
```

This snippet triggers a predefined snippet named `ReactFunctionalComponent` whenever you press `Ctrl+Alt+R` in a TypeScript React file. It’s a neat way to supercharge your coding rhythm, especially if you find yourself creating a ton of boilerplate.

> [!NOTE] I don't use this feature a lot.
> I should, but I am very anxious about running out of keybindings for Other Stuff™.
