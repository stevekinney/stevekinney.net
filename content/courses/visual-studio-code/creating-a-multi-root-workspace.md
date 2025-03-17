---
title: Creating Multi-Root Workspaces in Visual Studio Code
description: Step-by-step guide to creating and configuring multi-root workspaces to manage multiple projects together
modified: 2025-03-16T14:12:15-06:00
---

1. **Open Visual Studio Code:** Launch Visual Studio Code.
2. **Close any open folder or workspace:** If you have an existing folder or workspace open, close it by going to **File > Close Folder** or **File > Close Workspace**.
3. **Create an empty workspace:** Go to **File > Save Workspace As…**. This will open a save dialog.
4. **Choose a location and name:** Select a location on your file system where you want to save the workspace file. Give your workspace a descriptive name (e.g., `my-complex-project.code-workspace`). Visual Studio Code will save a file with the `.code-workspace` extension.
5. **Add folders to the workspace:** Once the empty workspace is created, you'll see an empty Explorer pane. To add folders, click on **File > Add Folder to Workspace…**.
6. **Select folders:** In the file dialog, navigate to and select the folders you want to include in your multi-root workspace. You can select multiple folders from different locations. Click **Add**.
7. **Save the workspace (if not already saved):** If you haven't saved the workspace yet, or if you've made changes, go to **File > Save Workspace** to save the current workspace configuration.

## Anatomy of a `.code-workspace`

```json
{
	"folders": [
		{
			"path": "path/to/folder1"
		},
		{
			"path": "path/to/folder2",
			"name": "Custom Folder Name"
		},
		{
			"uri": "git://repo-url?ref#folder-in-repo",
			"name": "Remote Repository Folder"
		}
	],
	"settings": {
		"editor.tabSize": 2,
		"files.autoSave": "afterDelay"
	},
	"extensions": {
		"recommendations": ["ms-vscode.vscode-typescript", "dbaeumer.vscode-eslint"]
	}
}
```

When we get into tasks and debugging, we'll see that you can also define them in the `.code-workspace` as well.
