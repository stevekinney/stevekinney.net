---
title: Prebuilt Dev Containers in VS Code
description: Using and customizing prebuilt container definitions to quickly set up development environments
modified: 2025-03-16T11:18:10-06:00
---

VS Code and the community provide a rich collection of pre-built Dev Container definitions. These are incredibly useful for quickly setting up common development environments without writing `devcontainer.json` from scratch.

## Accessing Pre-built Definitions

When you use the "Dev Containers: Add Dev Container Configuration Files…" command, VS Code will offer a list of predefined definitions. These are fetched from the [vscode-dev-containers repository on GitHub](https://github.com/devcontainers/templates).

**Example: Using a Pre-built Python Definition:**

1. Open your project folder in VS Code.
2. Open the Command Palette and select "Dev Containers: Add Dev Container Configuration Files…".
3. Choose "Python 3".
4. VS Code generates a `.devcontainer` folder with a pre-configured `devcontainer.json` for Python development.
5. Open the folder in a Dev Container (as explained in the next section).

**Customizing Pre-built Definitions:**

Pre-built definitions are excellent starting points. You can customize them further by modifying the generated `devcontainer.json` file—adding more extensions, customizing settings, forwarding ports, adding a `postCreateCommand`, and more to tailor the environment to your project needs.

## Working with Dev Containers: Your Daily Development Workflow

Now that you've set up a Dev Container, let’s explore how to work with it effectively.

### Opening a Folder in a Container: Connecting to Your Environment

Once you have a `.devcontainer` folder in your project, VS Code will recognize it and offer options to work within the Dev Container.

**Opening a Folder in a Dev Container:**

- **Option 1 (Recommended): Reopen in Container**

  1. Open your project folder in VS Code (the folder contains the `.devcontainer` folder).
  2. VS Code detects the Dev Container configuration and displays a notification: "Dev Container: Folder contains a Dev Container configuration file."
  3. Click "Reopen in Container."
  4. VS Code builds (if necessary) and starts the Dev Container. Once ready, it reloads and shows "(Dev Container)" in the bottom-left corner.

- **Option 2: Command Palette – "Dev Containers: Reopen in Container"**

  1. Open your project folder.
  2. Open the Command Palette and select "Dev Containers: Reopen in Container."
  3. Follow the same process as Option 1.

- **Option 3: Remote Explorer (Optional)**
  The Remote Explorer view (accessible via the Remote icon in the Activity Bar) also lists available Dev Containers. However, "Reopen in Container" is generally more direct.

**What Happens When You "Reopen in Container"?**

- **Container Build (If Necessary):**  
  VS Code triggers a Docker build if the specified image (or Dockerfile) needs to be built. Build logs appear in the Output panel, and subsequent reopens are faster due to Docker caching.
- **Container Start:**  
  Docker starts the container as configured.
- **VS Code Connection:**  
  VS Code connects to the running container.
- **Workspace Mount:**  
  Your project folder is **bind-mounted** into the container at the `workspaceFolder` (default `/workspace`), ensuring changes sync between host and container.
- **Extension Installation (Inside Container):**  
  Extensions listed in `devcontainer.json` are automatically installed inside the container.
- **Settings Application (Inside Container):**  
  Settings defined in `devcontainer.json` are applied within the container environment.

### Building and Rebuilding Containers: Updating Your Environment

Sometimes you need to modify your Dev Container configuration. In such cases, rebuild the container.

**Building or Rebuilding a Dev Container:**

- **Option 1: Command Palette – "Dev Containers: Rebuild Container"**

  1. Ensure you are connected to your Dev Container.
  2. Open the Command Palette and select "Dev Containers: Rebuild Container."
  3. VS Code rebuilds the container image based on your updated Dockerfile or image specification, then restarts the container.

- **Option 2: Command Palette – "Dev Containers: Rebuild and Reopen in Container"**

  1. Similar to the previous option but automatically reopens your project in the newly rebuilt container.

- **When to Rebuild:**
  - Changes to the `Dockerfile` (adding software, updating dependencies, or changing the base image).
  - Changes to `devcontainer.json` (switching to a different base image or Dockerfile).
  - Manual software updates inside the container (though it's better to define these in the Dockerfile).

### Accessing the Terminal: Your Gateway to the Container

The integrated terminal in VS Code runs _inside_ the Dev Container.

**Accessing the Dev Container Terminal:**

- **Option 1: VS Code Integrated Terminal**
  1. Ensure you are connected to your Dev Container.
  2. Open the integrated terminal (Ctrl+` or Cmd+`).
  3. The terminal prompt shows you are inside the container (using the shell configured in your container image or `devcontainer.json`).

**Usage:**

- **Execute Commands:** Run commands such as build scripts, tests, or dependency management directly within the container.
- **Temporary Software Installation:** Install packages (via apt, npm, pip, etc.) as needed, though changes won’t persist across restarts unless added to the Dockerfile.
- **Debug and Troubleshoot:** Use the terminal to inspect logs and troubleshoot container issues.

### Installing Extensions: Enhancing Your Containerized IDE

Dev Containers allow you to install VS Code extensions directly within the container.

**Installing Extensions Inside the Dev Container:**

- **Automatic Installation:**  
  List essential extensions in the `extensions` property of `devcontainer.json` to have them automatically installed when the container starts.
- **Manual Installation:**
  1. Ensure you are connected to the Dev Container.
  2. Open the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
  3. Locate the section "Dev Container: [Container Name] - Installed" and install extensions there.

**Benefits:**

- Ensures consistency across the team.
- Reduces clutter on your host machine.
- Allows project-specific configuration.

### Sharing Workspaces: Collaborative Containerized Development

Sharing your Dev Container configuration via version control ensures every team member uses the same environment.

**How to Share:**

- **Version Control:**  
  Commit the `.devcontainer` folder (including `devcontainer.json` and optionally a `Dockerfile` or `docker-compose.yml`) to Git.
- **Team Cloning:**  
  When team members clone the repository and open it in VS Code with the Remote - Containers extension, they will be prompted to "Reopen in Container" and receive the same environment.

**Benefits:**

- Consistency across the team.
- Version history for configuration changes.
- Simplified onboarding for new team members.

## Customizing Dev Containers: Tailoring Your Environment

Dev Containers offer extensive customization options.

### Dockerfiles: Fine-Grained Control

For advanced customization, use a Dockerfile.

**Using Dockerfiles:**

1. Create a `Dockerfile` within the `.devcontainer` folder.
2. In `devcontainer.json`, replace the `image` property with `dockerFile` and specify the Dockerfile path:
   ```json
   {
   	"dockerFile": "Dockerfile"
   }
   ```
   Use a relative path if the Dockerfile isn’t in the same folder.

**Examples:**

- **Installing Software:**
  ```dockerfile
  FROM mcr.microsoft.com/devcontainers/javascript-node:18
  RUN apt-get update && apt-get install -y --no-install-recommends \
      graphicsmagick
  ```
- **Configuring Settings:**
  ```dockerfile
  FROM mcr.microsoft.com/devcontainers/python:3.10
  RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen
  ENV LANG en_US.UTF-8
  ENV LANGUAGE en_US:en
  ENV LC_ALL en_US.UTF-8
  ```
- **Setting Up Services:**
  ```dockerfile
  FROM mcr.microsoft.com/devcontainers/go:1.20
  RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql-client
  ```

**Best Practices:**

- Use a reputable base image.
- Optimize layering for caching.
- Keep the Dockerfile minimal.
- Pin dependency versions for reproducibility.

### dotfiles: Personalizing Your Environment

Mount your host’s dotfiles to personalize your container.

**Using dotfiles:**

1. Add a `dotfiles` property in `devcontainer.json`:
   ```json
   {
   	"dotfiles": {
   		"repository": "https://github.com/your-username/dotfiles",
   		"targetPath": "~",
   		"installCommand": "install.sh"
   	}
   }
   ```
   - **repository:** URL to your dotfiles repo.
   - **targetPath:** Path inside the container (default `~`).
   - **installCommand:** Script executed post-cloning.
2. Structure your dotfiles repository with files like `.bashrc`, `.gitconfig`, and an `install.sh` script:
   ```plaintext
   dotfiles-repository/
   ├── .bashrc
   ├── .gitconfig
   ├── .vimrc
   └── install.sh
   ```
3. **Example `install.sh`:**
   ```bash
   #!/bin/bash
   ln -sf "$DOTFILES_REPOSITORY/.bashrc" "$HOME/.bashrc"
   ln -sf "$DOTFILES_REPOSITORY/.gitconfig" "$HOME/.gitconfig"
   ln -sf "$DOTFILES_REPOSITORY/.vimrc" "$HOME/.vimrc"
   echo "Dotfiles installation complete!"
   ```

**Benefits:**

- Personalizes the container environment.
- Ensures consistency across systems.
- Version-controls your configurations.
- Enables portability.

### Advanced Capabilities

**Bind Mounts:**

- Mount host directories into the container.
- Define in `devcontainer.json` using the `mounts` property:
  ```json
  {
  	"mounts": [
  		"source=${localWorkspaceFolder}/data,target=/container/data,type=bind,consistency=cached"
  	]
  }
  ```
  - **source:** Host path.
  - **target:** Container path.
  - **type:** Set as `bind`.
  - **consistency:** Optional (e.g., `cached`).

**Port Forwarding:**

- Use the `forwardPorts` property to forward container ports to the host.
- VS Code can auto-detect and prompt for forwarded ports.

**Docker Compose:**

- Define multi-container environments with a `docker-compose.yml` file.
- Modify `devcontainer.json` to use `dockerComposeFile`, and specify `service` and `workspaceFolder`:
  ```json
  {
  	"dockerComposeFile": "docker-compose.yml",
  	"service": "app",
  	"workspaceFolder": "/app"
  }
  ```
- **Example `docker-compose.yml`:**
  ```yaml
  version: '3.8'
  services:
    app:
      build:
        context: ./app
        dockerfile: Dockerfile
      ports:
        - '3000:3000'
      volumes:
        - ./app:/app
    db:
      image: postgres:14
      environment:
        POSTGRES_USER: devuser
        POSTGRES_PASSWORD: devpassword
      ports:
        - '5432:5432'
      volumes:
        - db_data:/var/lib/postgresql/data
  volumes:
    db_data:
  ```

**GitHub Codespaces Integration:**

- If a project contains a `.devcontainer` folder, Codespaces uses it to create a cloud-based environment.
- **Benefits:** Cloud-based access, pre-configured environments, and seamless local-to-cloud transitions.

## Troubleshooting and Best Practices

### Common Issues

- **Container Build Errors:**
  - Review build logs.
  - Check Dockerfile syntax, network, resource limits, and rate limits.
  - Rebuild with a clean cache if needed.
- **Container Startup Failures:**
  - Examine container logs.
  - Verify resource allocation and port conflicts.
  - Check Dockerfile/image issues.
- **Extension Installation Issues:**
  - Ensure container internet connectivity.
  - Verify extension compatibility.
  - Restart VS Code or reload the container.
- **Performance Issues:**
  - Increase Docker Desktop resources.
  - Optimize Dockerfile layering and base image size.
  - Consider using Docker volumes over bind mounts.
  - Limit installed extensions.

### Performance Optimization

- Allocate sufficient CPU/memory in Docker Desktop.
- Optimize Dockerfiles for caching and minimal image size.
- Use Docker volumes where beneficial.
- Install only essential extensions.
- Minimize background processes.
- Choose efficient base images.
- Configure VS Code caching optimally.

### Security Considerations

- **Container Image Security:**
  - Use trusted base images and scan for vulnerabilities.
  - Minimize image size.
  - Regularly update images and dependencies.
- **Network Security:**
  - Forward only necessary ports.
  - Understand container networking.
  - Manage secrets securely (use environment variables).
- **Host Access:**
  - Follow least privilege principles for bind mounts.
  - Use read-only mounts when possible.
- **User Permissions:**
  - Run containers as non-root.
  - Consider Docker user namespaces for extra isolation.

## Real-World Examples: Dev Containers in Action

### Node.js Development Environment

Setting up a Node.js environment with specific npm packages and configurations for a web application.

`devcontainer.json`:

```json
{
	"name": "Node.js Web App",
	"image": "mcr.microsoft.com/devcontainers/javascript-node:18",
	"extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "ms-vscode.js-debug-nodejs"],
	"settings": {
		"terminal.integrated.shell.linux": "/bin/bash",
		"editor.formatOnSave": true
	},
	"forwardPorts": [3000],
	"postCreateCommand": "npm install"
}
```

- Uses the Node.js 18 image.
- Installs ESLint, Prettier, and a debugger.
- Sets the terminal to bash with format-on-save enabled.
- Forwards port 3000.
- Runs `npm install` after container creation.
