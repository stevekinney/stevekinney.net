---
title: Setting Up a Dev Container
description: >-
  Complete guide to installing, creating, and customizing development containers
  in Visual Studio Code
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

Now that we understand the "why," let's get practical and learn "how" to set up Dev Containers in Visual Studio Code.

## Installation and Prerequisites

Before embarking on your Dev Container journey, ensure you have the following prerequisites in place:

### Docker

- **Docker Desktop (Recommended):** For Windows and macOS, Docker Desktop is the easiest way to get Docker running. Download and install it from [https://www.docker.com/products/docker-desktop](https://www.google.com/url?sa=E&source=gmail&q=https://www.docker.com/products/docker-desktop&authuser=1).
- **Docker Engine (Linux):** For Linux distributions, follow the installation instructions for your specific distribution from [https://docs.docker.com/engine/install/](https://www.google.com/url?sa=E&source=gmail&q=https://docs.docker.com/engine/install/&authuser=1).
- **Verify Docker Installation:** After installation, open your terminal and run `docker --version` and `docker compose version`. You should see the installed versions printed. Ensure Docker is running in the background.

#### Configuration Notes for Docker

- **Resource Allocation (Docker Desktop):** Docker containers consume system resources. For optimal performance, especially with complex containers, consider increasing the resources allocated to Docker Desktop. You can adjust CPU, memory, and disk space in Docker Desktop's settings.
- **File Sharing (Docker Desktop on Windows):** Ensure that the drive containing your project folder is shared with Docker Desktop. This is usually done during Docker Desktop installation or through its settings. This allows containers to access your project files.

### Remote - Containers Extension

- Open Visual Studio Code.
- Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
- Search for "Remote - Containers" by Microsoft.
- Click "Install" to install the extension.

## Creating a Dev Container

With the prerequisites in place, let's create our first Dev Container. The heart of Dev Containers is the `devcontainer.json` file. This file, placed in the `.devcontainer` folder at the root of your project, defines your containerized development environment.

1. **Open your Project Folder in Visual Studio Code:** Open the root folder of your project in Visual Studio Code. If you don't have a project yet, create an empty folder.
2. **Open the Command Palette:** Press Ctrl+Shift+P (or Cmd+Shift+P on macOS) to open the Visual Studio Code Command Palette.
3. **Search for "Dev Containers":** Type "Dev Containers" and select "Dev Containers: Add Dev Container Configuration Files…".

## Choose a Predefined Container Definition or Create from Scratch

- **Predefined Definition (Recommended for Beginners):** Visual Studio Code offers a list of predefined Dev Container definitions for popular languages and frameworks (e.g., Node.js, Python, .NET, Go, Java). Choose one that closely matches your project's technology stack.
- **Create from 'Empty Container':** If no predefined definition suits your needs, choose "From 'Empty Container'". This will create a basic `devcontainer.json` that you can customize from scratch.
- **Use 'Dockerfile':** If you already have a Dockerfile for your project or want complete control, choose "From Dockerfile". This will generate a `devcontainer.json` that references your existing Dockerfile.

5. **Customize `devcontainer.json` (If needed):** After selecting a definition, Visual Studio Code will create a `.devcontainer` folder and place `devcontainer.json` inside it. Open `devcontainer.json` to review and customize its properties.

### Key Properties of `devcontainer.json`

The **`image`:** This property specifies the **Docker image** to use as the base for your Dev Container.

- **Example:** `"image": "mcr.microsoft.com/devcontainers/javascript-node:18"` (Uses a pre-built Node.js 18 image from Microsoft's Dev Containers registry).
- **Usage:** You can use pre-built images from public registries (like Docker Hub, [mcr.microsoft.com](https://www.google.com/search?q=mcr.microsoft.com&authuser=1)), or your own custom images. Pre-built images are convenient for common environments, while custom images offer greater control and pre-configuration.
- **`dockerFile`:** Instead of `image`, you can use `dockerFile` to specify the path to a **Dockerfile** within your project.
- **Example:** `"dockerFile": "Dockerfile"` (Assumes a Dockerfile named `Dockerfile` in the same `.devcontainer` folder).
- **Usage:** Use `dockerFile` when you need to extensively customize the container environment beyond what pre-built images offer. Dockerfiles allow you to define every aspect of the container image.

#### `context`

When using `dockerFile`, this optional property specifies the **build context** for the Docker build. By default, it's the same folder as the `dockerFile`. You can change it if needed.

#### Extensions

The `extensions` property is an **array of Visual Studio Code extension IDs** that should be automatically installed _inside_ the Dev Container when it starts.

```json
"extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
]
```

This ensures everyone using the Dev Container has the same set of extensions. Find extension IDs in the Visual Studio Code Marketplace URL or by right-clicking an extension in the Extensions view and selecting "Copy Extension ID".

#### Settings

This `settings` property is a **JSON object** that allows you to define Visual Studio Code settings that will be applied _inside_ the Dev Container.

```json
"settings": {
    "terminal.integrated.shell.linux": "/bin/bash",
    "editor.formatOnSave": true
}
```

#### Port Fowarding

The `forwardPorts` property is an **array of ports** that you want to forward from the container to your host machine.

For example, `"forwardPorts": [3000, 8080, 5432]` (Forwards ports 3000, 8080, and 5432 from the container to your host).

If your web application runs on port 3000 inside the container, forwarding port 3000 allows you to access it at `http://localhost:3000` in your host browser.

#### Other Random Settings

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
