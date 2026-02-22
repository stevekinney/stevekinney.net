---
title: Configuring Your Dev Container
description: >-
  Detailed explanation of the devcontainer.json file and its properties to
  customize your development environment
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

The **`image`:** This property specifies the **Docker image** to use as the base for your Dev Container.

- **Example:** `"image": "mcr.microsoft.com/devcontainers/javascript-node:18"` (Uses a pre-built Node.js 18 image from Microsoft's Dev Containers registry).
- **Usage:** You can use pre-built images from public registries (like Docker Hub, [mcr.microsoft.com](https://www.google.com/search?q=mcr.microsoft.com&authuser=1)), or your own custom images. Pre-built images are convenient for common environments, while custom images offer greater control and pre-configuration.
- **`dockerFile`:** Instead of `image`, you can use `dockerFile` to specify the path to a **Dockerfile** within your project.
- **Example:** `"dockerFile": "Dockerfile"` (Assumes a Dockerfile named `Dockerfile` in the same `.devcontainer` folder).
- **Usage:** Use `dockerFile` when you need to extensively customize the container environment beyond what pre-built images offer. Dockerfiles allow you to define every aspect of the container image.

## `context`

When using `dockerFile`, this optional property specifies the **build context** for the Docker build. By default, it's the same folder as the `dockerFile`. You can change it if needed.

## Extensions

The `extensions` property is an **array of Visual Studio Code extension IDs** that should be automatically installed _inside_ the Dev Container when it starts.

```json
"extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
]
```

This ensures everyone using the Dev Container has the same set of extensions. Find extension IDs in the Visual Studio Code Marketplace URL or by right-clicking an extension in the Extensions view and selecting "Copy Extension ID".

## Settings

This `settings` property is a **JSON object** that allows you to define Visual Studio Code settings that will be applied _inside_ the Dev Container.

```json
"settings": {
    "terminal.integrated.shell.linux": "/bin/bash",
    "editor.formatOnSave": true
}
```

## Port Fowarding

The `forwardPorts` property is an **array of ports** that you want to forward from the container to your host machine.

For example, `"forwardPorts": [3000, 8080, 5432]` (Forwards ports 3000, 8080, and 5432 from the container to your host).

If your web application runs on port 3000 inside the container, forwarding port 3000 allows you to access it at `http://localhost:3000` in your host browser.

## Other Random Settings

**`workspaceFolder`:** Specifies the path _inside the container_ where your project folder will be mounted. Defaults to `/workspace`. You usually don't need to change this.

**`postCreateCommand`:** This property allows you to run shell commands **once after the container is created and started for the first time.**

- **Example:** `"postCreateCommand": "npm install"` (Runs `npm install` after container creation to install project dependencies).
- **Usage:** Use this to install project-specific dependencies, initialize databases, or perform other setup tasks that should run only once.

**`postStartCommand`:** Similar to `postCreateCommand`, but this command runs **every time the Dev Container starts.** Use with caution as frequent execution might impact startup time. Often used for starting background services or daemons needed for the development environment.

**`remoteUser`:** Specifies the user to connect to inside the container. Defaults to the user used when building the image or the Dockerfile's `USER` instruction. You might need to change this if you require a specific user context.

## An Example

```json
{
  "name": "Node.js Development Container",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "ms-vscode.js-debug-nodejs"],
  "settings": {
    "terminal.integrated.shell.linux": "/bin/bash",
    "editor.formatOnSave": true,
    "eslint.alwaysShowStatus": true
  },
  "forwardPorts": [3000],
  "postCreateCommand": "npm install"
}
```
