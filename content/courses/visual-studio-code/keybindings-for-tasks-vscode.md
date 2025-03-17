## Keybindings for Tasks

Another example is a custom task that might run a build step:

```json
{
  "key": "ctrl+shift+b",
  "command": "workbench.action.tasks.runTask",
  "args": "build",
  "when": "editorFocus"
}
```

Here, pressing `Ctrl+Shift+B` triggers a build task in the current project. Simple, fast, and tailored exactly to your workflow.
