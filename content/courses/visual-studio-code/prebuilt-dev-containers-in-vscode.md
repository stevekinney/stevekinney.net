---
title: Prebuilt Dev Containers in VS Code
description: Using and customizing prebuilt container definitions to quickly set up development environments
modified: 2025-03-16T11:18:10-06:00
---

VS Code and the community provide a rich collection of pre-built Dev Container definitions. These are incredibly useful for quickly setting up common development environments without writing `devcontainer.json` from scratch.

## Accessing Pre-built Definitions

When you use the "Dev Containers: Add Dev Container Configuration Files…" command, VS Code will offer a list of predefined definitions. These are fetched from the [vscode-dev-containers repository on GitHub](https://www.google.com/url?sa=E&source=gmail&q=https://github.com/devcontainers/templates&authuser=1).

**Example: Using a Pre-built Python Definition:**

1. Open your project folder in VS Code.
2. Command Palette -> "Dev Containers: Add Dev Container Configuration Files…"
3. Choose "Python 3".
4. VS Code will generate a `.devcontainer` folder with a pre-configured `devcontainer.json` for Python development.
5. Open the folder in a Dev Container (as explained in the next section).

**Customizing Pre-built Definitions:**

Pre-built definitions are excellent starting points. You can easily customize them further by modifying the generated `devcontainer.json` file. You can add more extensions, customize settings, forward ports, add `postCreateCommand`, and more, to tailor the pre-built environment to your specific project needs.

---

**3. Working with Dev Containers: Your Daily Development Workflow**

Now that you've set up a Dev Container, let's explore how to work with it effectively in your daily development routine.

**3.1. Opening a Folder in a Container: Connecting to Your Environment**

Once you have a `.devcontainer` folder in your project, VS Code will recognize it and offer you options to work within the Dev Container.

**Opening a Folder in a Dev Container:**

- **Option 1 (Recommended): Reopen in Container:**

1. Open your project folder in VS Code (that contains the `.devcontainer` folder).
2. VS Code will detect the Dev Container configuration and display a notification in the bottom-right corner: "Dev Container: Folder contains a Dev Container configuration file."
3. Click "Reopen in Container".
4. VS Code will build (if necessary) and start the Dev Container. Once ready, VS Code will reload, now connected to the containerized environment. You'll see "(Dev Container)" in the bottom-left corner of the VS Code window, indicating you are working inside the container.

- **Option 2: Command Palette - "Reopen in Container":**

1. Open your project folder in VS Code.
2. Command Palette -> "Dev Containers: Reopen in Container".
3. Follow the same process as Option 1.

- **Option 3: Remote Explorer (Optional):** The "Remote Explorer" view (accessible via the Remote icon in the Activity Bar) also lists available Dev Containers. You can connect to a container from there. However, "Reopen in Container" is generally the more direct and convenient approach.

**What Happens When You "Reopen in Container"?**

- **Container Build (If Necessary):** If the specified container image (or Dockerfile) needs to be built, VS Code will trigger a Docker build process. You'll see build logs in the Output panel (select "Dev Containers" from the dropdown). Subsequent "Reopen in Container" operations will be faster if the image is already built (Docker caching).
- **Container Start:** Docker starts the container based on the configuration.
- **VS Code Connection:** VS Code establishes a connection to the running container.
- **Workspace Mount:** Your project folder from your host machine is **bind-mounted** into the container at the `workspaceFolder` path (default `/workspace`). This means changes you make to files inside the container are reflected in your host project folder, and vice versa. This allows seamless file editing between host and container.
- **Extension Installation (Inside Container):** VS Code automatically installs the extensions listed in the `extensions` property of `devcontainer.json` _inside_ the container. These are separate from your host machine extensions.
- **Settings Application (Inside Container):** VS Code applies the settings defined in the `settings` property of `devcontainer.json` _inside_ the container environment.

**3.2. Building and Rebuilding Containers: Updating Your Environment**

Sometimes you need to modify your Dev Container configuration – update dependencies in the Dockerfile, add new extensions, change settings, etc. In such cases, you need to rebuild the Dev Container.

**Building or Rebuilding a Dev Container:**

- **Option 1: Command Palette - "Dev Containers: Rebuild Container":**

1. Ensure you are connected to your Dev Container (VS Code window says "(Dev Container)" in the bottom-left).
2. Command Palette -> "Dev Containers: Rebuild Container".
3. This will rebuild the container image based on your updated `Dockerfile` or image specification, and then restart the container. Changes in `devcontainer.json` (like extensions or settings) are also applied during rebuild.

- **Option 2: Command Palette - "Dev Containers: Rebuild and Reopen in Container":**

1. Similar to "Rebuild Container", but after rebuilding, it automatically reopens your project in the newly rebuilt container. This is often more convenient.

- **When to Rebuild:**
- **Changes to `Dockerfile`:** Whenever you modify your `Dockerfile` to add software, update dependencies, or change the base image.
- **Changes to `devcontainer.json` (image/dockerFile):** If you switch to a different base image or Dockerfile.
- **Software Updates in Container (Less Common):** If you manually installed software inside the container through the terminal and want to persist these changes, you might need to rebuild the container image (though it's generally better to define software installations in your Dockerfile).

**3.3. Accessing the Terminal: Your Gateway to the Container**

A key aspect of working with Dev Containers is accessing the integrated terminal within VS Code. This terminal runs _inside_ the Dev Container, providing you with a shell environment directly within your containerized environment.

**Accessing the Dev Container Terminal:**

- **Option 1: VS Code Integrated Terminal:**

1. Ensure you are connected to your Dev Container.
2. Open the VS Code integrated terminal (Ctrl+`or Cmd+`).
3. The terminal prompt will indicate that you are now inside the container environment. The shell (e.g., bash, zsh) will be the one configured within your container image or `devcontainer.json` settings.

- **Usage of the Terminal:**
- **Execute Commands:** Run commands directly within your containerized environment (e.g., build scripts, run tests, manage dependencies, interact with services).
- **Install Software (Temporarily):** You can install software packages using package managers (apt, yum, npm, pip, etc.) _inside the terminal_. However, these installations are typically not persisted across container restarts unless you update your Dockerfile and rebuild the container image. For persistent installations, modify your Dockerfile.
- **Debug and Troubleshoot:** Use the terminal to inspect the container environment, check logs, and troubleshoot issues.

**3.4. Installing Extensions: Enhancing Your Containerized IDE**

As mentioned earlier, Dev Containers allow you to specify VS Code extensions that should be installed directly within the container environment.

**Installing Extensions Inside the Dev Container:**

- **Automatic Installation (via `devcontainer.json`):** The best practice is to list essential extensions in the `extensions` property of your `devcontainer.json`. These extensions will be automatically installed when you open the project in a Dev Container.
- **Manual Installation (Within Dev Container):** You can also manually install extensions _while you are connected to the Dev Container_.

1. Ensure you are connected to your Dev Container.
2. Open the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
3. You will see a section labeled "Local - Installed" (your host extensions) and a section labeled "Dev Container: [Container Name] - Installed" (extensions inside the container).
4. Search for and install extensions in the "Dev Container: [Container Name] - Installed" section. These extensions will be installed _only_ inside the Dev Container environment.

**Benefits of Container-Specific Extensions:**

- **Environment Consistency:** Ensures all team members use the same set of extensions for a project within the Dev Container.
- **Reduced Host Clutter:** Keeps your host machine's VS Code extension setup clean, as project-specific extensions are isolated within containers.
- **Project-Specific Configuration:** Allows you to tailor the extension set to the specific needs of each project's technology stack.

**3.5. Sharing Workspaces: Collaborative Containerized Development**

Dev Containers are designed for collaboration. Sharing your Dev Container configuration with team members is straightforward and ensures everyone works in the same environment.

**Sharing Dev Container Workspaces:**

- **Version Control (Essential):** The primary method of sharing Dev Container configurations is through **version control (Git)**. Commit the `.devcontainer` folder and its contents (primarily `devcontainer.json` and optionally a `Dockerfile` or `docker-compose.yml`) to your project's Git repository.
- **Team Members Cloning the Repository:** When other team members clone the repository and open it in VS Code with the Remote - Containers extension, VS Code will automatically detect the Dev Container configuration. They will be prompted to "Reopen in Container," and upon doing so, they will get the exact same development environment.

**Benefits of Sharing via Version Control:**

- **Consistency Across Team:** Guarantees that all developers on the team use the identical environment defined by the committed Dev Container configuration.
- **Version History:** Changes to the Dev Container configuration are tracked in version control, allowing you to revert to previous configurations if needed and understand the evolution of the environment.
- **Simplified Onboarding:** New team members instantly get the correct environment by cloning the repository and using Dev Containers, drastically reducing setup time and potential environment-related issues.

---

**4. Customizing Dev Containers: Tailoring Your Environment**

Dev Containers offer a high degree of customization to perfectly match your project's needs and your personal preferences. Let's delve into advanced customization techniques.

**4.1. Dockerfiles: Fine-Grained Control over Your Container Image**

While using pre-built images with the `image` property in `devcontainer.json` is convenient, for more advanced customization, using a **Dockerfile** offers unparalleled control over your container image.

**Using Dockerfiles:**

1. **Create a `Dockerfile`:** Create a file named `Dockerfile` within the `.devcontainer` folder of your project.
2. **Modify `devcontainer.json`:** In `devcontainer.json`, replace the `image` property with `dockerFile` and specify the path to your Dockerfile.

JSON

```ts

{

"dockerFile": "Dockerfile"

}

```

If your Dockerfile is in the same folder as `devcontainer.json`, simply use `"dockerFile": "Dockerfile"`. If it's in a subdirectory, use a relative path like `"dockerFile": "./path/to/Dockerfile"`.

**DockerFile Customization Examples:**

- **Installing Additional Software:** Use `RUN` instructions in your Dockerfile to install any software packages, libraries, or tools needed in your environment.

Dockerfile

```ts

FROM mcr.microsoft.com/devcontainers/javascript-node:18



RUN apt-get update && apt-get install -y --no-install-recommends \

graphicsmagick

```

This example adds the `graphicsmagick` image processing library to a Node.js Dev Container.

- **Configuring System Settings:** Use `RUN` instructions to modify system configurations within the container.

Dockerfile

```ts

FROM mcr.microsoft.com/devcontainers/python:3.10



RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && \

locale-gen

ENV LANG en_US.UTF-8

ENV LANGUAGE en_US:en

ENV LC_ALL en_US.UTF-8

```

This example sets the locale within a Python Dev Container to UTF-8.

- **Setting Up Services (Databases, Message Queues):** While Dockerfiles are primarily for image building, you can use `RUN` commands to set up simple services. However, for more complex multi-container setups with databases, message queues, etc., consider using **Docker Compose** (covered later).

Dockerfile

```ts

FROM mcr.microsoft.com/devcontainers/go:1.20



RUN apt-get update && apt-get install -y --no-install-recommends \

postgresql-client

```

This example installs the PostgreSQL client tools in a Go Dev Container.

- **Custom Base Images:** You can use any Docker image as your base image in your Dockerfile, including custom images you create and host yourself or from private registries.

**Best Practices for Dockerfiles in Dev Containers:**

- **Start with a Well-Maintained Base Image:** Begin your `Dockerfile` `FROM` a reputable, well-maintained base image relevant to your technology stack (e.g., official language images, Microsoft Dev Container images).
- **Layer Optimizations:** Use Dockerfile best practices for efficient layering and caching to speed up container builds (group related commands in single `RUN` instructions, order instructions strategically).
- **Keep it Minimal (Initially):** Start with a Dockerfile that includes the essential software and configurations. Add customizations incrementally as needed. Overly complex Dockerfiles can increase build time and maintenance overhead.
- **Version Pinning (Dependencies):** Consider pinning versions of software packages and dependencies in your Dockerfile to ensure reproducibility and avoid unexpected changes when base images are updated.

**4.2. dotfiles: Personalizing Your Container Environment**

`dotfiles` are configuration files (often starting with a dot, hence the name) that control the behavior of shell environments, editors, and other tools, typically found in your home directory (e.g., `.bashrc`, `.zshrc`, `.vimrc`, `.gitconfig`).

Dev Containers allow you to easily **mount your host machine's dotfiles into your container**, enabling you to personalize your container environment with your familiar shell aliases, editor configurations, Git settings, and more.

**Using dotfiles with Dev Containers:**

1. **Specify `dotfiles` in `devcontainer.json`:** Add a `dotfiles` property to your `devcontainer.json` configuration.

JSON

```ts

{

"dotfiles": {

"repository": "https://github.com/your-username/dotfiles",

"targetPath": "~",

"installCommand": "install.sh"

}

}

```

- **`repository` (Required):** The URL of your dotfiles repository (typically on GitHub, GitLab, etc.). This should be a public or private Git repository containing your dotfiles.
- **`targetPath` (Optional, Default: `~`):** The path inside the container where the dotfiles repository should be cloned. Defaults to the home directory (`~`).
- **`installCommand` (Optional):** A script within your dotfiles repository that should be executed _after_ cloning to install or configure the dotfiles in the container. This script (e.g., `install.sh`, `install.bash`) is often used to create symbolic links, set up shell configurations, etc.

1. **Create a dotfiles Repository:** If you don't already have one, create a Git repository to store your dotfiles. Structure your dotfiles within the repository as needed. Include an `install.sh` (or similar) script if you need custom installation logic.

**Example dotfiles Repository Structure (Simplified):**

```ts

dotfiles-repository/

├── .bashrc

├── .gitconfig

├── .vimrc

└── install.sh

```

**Example `install.sh` script:**

Bash

```ts

#!/bin/bash



# Create symlinks for bash configuration

ln -sf "$DOTFILES_REPOSITORY/.bashrc" "$HOME/.bashrc"



# Create symlinks for Git configuration

ln -sf "$DOTFILES_REPOSITORY/.gitconfig" "$HOME/.gitconfig"



# Create symlinks for Vim configuration

ln -sf "$DOTFILES_REPOSITORY/.vimrc" "$HOME/.vimrc"



echo "Dotfiles installation complete!"

```

**Benefits of Using dotfiles:**

- **Personalized Container Environment:** Bring your familiar shell environment, editor configurations, and tools into your Dev Containers.
- **Consistency Across Environments:** Maintain a consistent development experience across different machines and Dev Containers.
- **Version Control for Configurations:** Your dotfiles are version-controlled in your repository, making it easy to manage and update your personal settings.
- **Portability:** Easily transfer your personalized development environment to new Dev Containers or even other systems.3

**4.3. Features: Advanced Dev Container Capabilities**

Dev Containers offer a range of advanced features that further enhance flexibility and integration.

**- Bind Mounts:**

- **Concept:** Bind mounts allow you to mount a directory or file from your host machine directly into the container. This is how your project folder is mounted into the container by default, enabling seamless file editing.
- **Custom Bind Mounts:** You can define additional bind mounts in `devcontainer.json` using the `mounts` property (or `dockerComposeFile` for Docker Compose, see later).

```json
{
	"mounts": [
		"source=${localWorkspaceFolder}/data,target=/container/data,type=bind,consistency=cached"
	]
}
```

- **`source`:** Path on the host machine. `${localWorkspaceFolder}` is a variable representing your project folder.
- **`target`:** Path inside the container where the host path should be mounted.
- **`type`:** Set to `bind` for bind mounts.
- **`consistency`:** Optional. `cached` can improve performance.
- **Use Cases:**
- **Mounting Data Directories:** Mount local data directories into the container for data processing or analysis.
- **Sharing Configuration Files:** Mount configuration files from your host into the container.
- **Accessing Host System Resources (Use with Caution):** Mount host directories like `/var/run/docker.sock` to allow containers to interact with the host Docker daemon (advanced, use carefully for security reasons).

**- Port Forwarding:**

- **Covered earlier in `devcontainer.json`:** The `forwardPorts` property allows you to forward ports from the container to your host.
- **Dynamic Port Forwarding:** VS Code's Dev Containers extension automatically detects ports exposed by applications running in the container and offers to forward them. You'll see a notification when an application running inside the container starts listening on a port.

**- Docker Compose:**

- **Concept:** Docker Compose is a tool for defining and managing multi-container Docker applications. Dev Containers can leverage Docker Compose to create development environments with multiple interconnected containers (e.g., web application container, database container, message queue container).
- **Using Docker Compose with Dev Containers:**

1. **Create `docker-compose.yml`:** Create a `docker-compose.yml` file in your `.devcontainer` folder (or project root). Define your multi-container setup in this file.
2. **Modify `devcontainer.json`:** In `devcontainer.json`, replace `image` or `dockerFile` with `dockerComposeFile` and specify the path to your `docker-compose.yml` file, and `service` to indicate which service in your docker-compose.yml is the main development container.

<!-- end list -->

```json
{
	"dockerComposeFile": "docker-compose.yml",

	"service": "app", // Service name defined in docker-compose.yml

	"workspaceFolder": "/app" // Workspace inside the 'app' service
}
```

- **Example `docker-compose.yml` (Web Application with Database):**

<!-- end list -->

YAML

```ts

version: '3.8'

services:

app:

build:

context: ./app

dockerfile: Dockerfile

ports:

- "3000:3000" # Forward app port

volumes:

- ./app:/app # Mount app directory



db:

image: postgres:14

environment:

POSTGRES_USER: devuser

POSTGRES_PASSWORD: devpassword

ports:

- "5432:5432" # Forward database port

volumes:

- db_data:/var/lib/postgresql/data



volumes:

db_data:

```

- **Benefits of Docker Compose:**
- **Multi-Container Environments:** Model complex development environments with databases, message queues, and other services easily.
- **Simplified Setup:** Docker Compose handles container orchestration, networking, and volume management for multi-container setups.
- **Consistent Multi-Service Environments:** Ensure consistent multi-service setups across development, staging, and production (if using Docker Compose for deployment as well).

**- GitHub Codespaces Integration:**

- **Concept:** GitHub Codespaces are cloud-based development environments powered by containers. Dev Containers and Codespaces are tightly integrated.
- **Using Dev Containers with Codespaces:** If your project has a `.devcontainer` folder, GitHub Codespaces will automatically use that configuration to create your cloud-based development environment. When you open a repository in Codespaces that has a Dev Container configuration, it will build and start the Dev Container in the cloud.
- **Benefits:**
- **Cloud-Based Dev Environments:** Access your Dev Containers from any browser, on any machine, without needing to install Docker locally.
- **Pre-configured Environments in Codespaces:** Ensure consistency between local Dev Containers and cloud-based Codespaces.
- **Seamless Transition:** Develop locally using Dev Containers and then seamlessly transition to cloud-based Codespaces for remote work, collaboration, or when you need more powerful resources.

---

**5. Troubleshooting and Best Practices: Smooth Sailing with Dev Containers**

While Dev Containers are powerful, you might encounter issues or need to optimize your workflow. Let's discuss common problems and best practices.

**5.1. Common Issues and Troubleshooting:**

- **Container Build Errors:**
- **Problem:** Container fails to build with error messages in the "Dev Containers" output panel.
- **Troubleshooting:**
- **Examine Build Logs:** Carefully review the build logs in the "Dev Containers" output panel. Look for specific error messages.
- **Dockerfile Issues:** If using a `Dockerfile`, double-check your Dockerfile syntax, package installation commands, base image validity, and any custom scripts.
- **Network Issues:** Build errors during package downloads might indicate network problems. Check your internet connection and Docker Desktop network settings.
- **Resource Limits:** Insufficient resources allocated to Docker Desktop (CPU, memory) can cause build failures. Increase resource limits in Docker Desktop settings.
- **Docker Hub Rate Limits:** If using public images extensively, you might hit Docker Hub rate limits. Consider using authenticated Docker Hub accounts or private registries if rate limiting becomes a frequent issue.
- **Rebuild with Clean Cache:** Sometimes, cached layers can cause issues. Try rebuilding the container with a clean cache: Command Palette -> "Dev Containers: Rebuild Container with Clean Cache".
- **Container Startup Failures:**
- **Problem:** Container builds successfully, but fails to start.
- **Troubleshooting:**
- **Check Container Logs:** After a failed start, VS Code might show an error message with an option to "Show Container Log." Examine these logs for clues about why the container is failing to start.
- **Resource Limits:** Insufficient resources (CPU, memory) can prevent containers from starting. Increase Docker Desktop resource limits.
- **Port Conflicts:** If port forwarding is configured, ensure that the ports on your host machine are not already in use by other applications. Port conflicts can prevent containers from starting.
- **Image/Dockerfile Issues:** Errors within the base image or Dockerfile that manifest only during runtime can cause startup failures. Carefully review your image or Dockerfile.
- **Extension Installation Issues:**
- **Problem:** Extensions listed in `devcontainer.json` fail to install inside the container.
- **Troubleshooting:**
- **Network Issues (Container):** The container might not have internet access to download extensions. Check container networking settings and ensure internet connectivity from within the container (using the terminal).
- **Extension Compatibility:** Rarely, an extension might have compatibility issues with the container environment. Try removing or updating the extension.
- **VS Code Extension Host Issues:** Restart VS Code or try reloading the Dev Container window to refresh the extension installation process.
- **Performance Issues (Slow Startup, Slow Operations):**
- **Problem:** Dev Container startup or general operations are slow.
- **Troubleshooting:**
- **Resource Allocation:** Increase CPU and memory allocated to Docker Desktop in its settings.
- **Image Size:** Large container images take longer to download and start. Optimize your Dockerfile to reduce image size (multi-stage builds, smaller base images).
- **File System Performance (Bind Mounts):** Bind mounts, while convenient, can sometimes have performance overhead, especially on macOS and Windows with file sharing. Consider using Docker volumes for improved performance if file access speed is critical.
- **Docker Caching:** Ensure Docker build caching is working effectively. Properly layered Dockerfiles and efficient caching can drastically speed up rebuilds.
- **Extensions:** Too many extensions, especially resource-intensive ones, can impact performance. Only install essential extensions in your `devcontainer.json`.

**5.2. Performance Optimization:**

- **Resource Allocation (Docker Desktop):** As mentioned, allocating sufficient CPU and memory to Docker Desktop is crucial for performance.
- **Optimize Dockerfiles:** Follow Dockerfile best practices for layering, caching, and minimizing image size to speed up builds and container startup.
- **Use Docker Volumes (When Appropriate):** For data persistence and improved file system performance, consider using Docker volumes instead of bind mounts, especially for database data or large datasets accessed within the container.
- **Selective Extension Installation:** Only include essential extensions in your `devcontainer.json`. Avoid installing unnecessary extensions inside containers, as they consume resources.
- **Background Processes:** Minimize background processes running inside the container that are not essential for development, as they consume resources.
- **Efficient Base Images:** Choose base images that are optimized for the task (e.g., slim variants of official images) to reduce image size and startup time.
- **VS Code Caching:** VS Code itself employs caching mechanisms. Ensure VS Code is also configured for optimal performance (e.g., check extension settings for caching options).

**5.3. Security Considerations:**

- **Container Image Security:**
- **Use Trusted Base Images:** Always use base images from trusted and reputable sources (official language images, Microsoft Dev Container images).
- **Image Scanning:** Consider using image scanning tools to check for vulnerabilities in your container images, especially if you are using custom images or pulling images from public registries.
- **Minimize Image Size:** Smaller images generally have a reduced attack surface. Optimize your Dockerfiles to minimize image size by removing unnecessary components and using multi-stage builds.
- **Regular Image Updates:** Regularly update your base images and dependencies within your Dockerfiles to patch known vulnerabilities.
- **Network Security:**
- **Port Forwarding:** Only forward ports that are absolutely necessary for development. Avoid forwarding unnecessary ports, as this can expose services running in your container to your host network.
- **Container Networking:** Be aware of container networking configurations. By default, containers in the same Docker Compose project are on a shared network. Understand network isolation and security implications.
- **Secrets Management:** Avoid hardcoding secrets (API keys, passwords) directly into your Dockerfiles or `devcontainer.json`. Use environment variables or dedicated secrets management solutions for sensitive information.
- **Host System Access (Bind Mounts):**
- **Principle of Least Privilege:** Only bind mount directories or files that are absolutely necessary for the container to function. Avoid mounting your entire home directory or sensitive system directories.
- **Read-Only Mounts (When Possible):** For configuration files or data directories that the container only needs to read, consider using read-only bind mounts to prevent accidental modification from within the container.
- **User Permissions:**
- **Run Containers as Non-Root (Recommended):** By default, containers often run as the `root` user. For improved security, configure your Dockerfile to run containers as a non-root user. This can be done using the `USER` instruction in your Dockerfile or by setting the `remoteUser` property in `devcontainer.json`.
- **User Namespaces (Advanced):** For advanced security scenarios, explore Docker user namespaces to further isolate user IDs between the host and containers.

---

**6. Real-World Examples: Dev Containers in Action**

To solidify your understanding, let's explore practical examples of using Dev Containers for various development scenarios.

**6.1. Node.js Development Environment:**

- **Scenario:** Setting up a consistent Node.js environment with specific npm packages and configurations for a web application.
- **`devcontainer.json`:**

<!-- end list -->

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

- **Explanation:**
- Uses the `mcr.microsoft.com/devcontainers/javascript-node:18` pre-built image for Node.js 18 development.
- Installs ESLint, Prettier, and Node.js debugger extensions.
- Sets terminal to bash and enables format-on-save.
- Forwards port 3000 (common for Node.js web apps).
- Runs `npm install` after container creation to install project dependencies.

**6.2. Python Development Environment:**

- **Scenario:** Creating a Python environment with virtual environments and scientific libraries for data science projects.
- **`devcontainer.json`:**

<!-- end list -->

```json
{
	"name": "Python Data Science",

	"image": "mcr.microsoft.com/devcontainers/python:3.10-bullseye",

	"extensions": ["ms-python.python", "ms-python.vscode-pylance", "ms-toolsai.jupyter"],

	"settings": {
		"terminal.integrated.shell.linux": "/bin/bash",

		"python.defaultInterpreterPath": "/usr/local/bin/python"
	},

	"postCreateCommand": "python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt",

	"remoteUser": "vscode"
}
```

- **`requirements.txt` (Example):**

<!-- end list -->

```ts
numpy;

pandas;

scikit - learn;

jupyter;
```

- **Explanation:**
- Uses the `mcr.microsoft.com/devcontainers/python:3.10-bullseye` pre-built Python 3.10 image (Debian Bullseye base).
- Installs Python, Pylance, and Jupyter extensions.
- Sets terminal to bash and Python interpreter path.
- `postCreateCommand` creates a Python virtual environment (`.venv`), activates it, and installs dependencies from `requirements.txt`.
- Sets `remoteUser` to `vscode` for better security practices (running as non-root).

**6.3. Web Development Environment (LAMP Stack):**

- **Scenario:** Configuring a web development environment with a LAMP stack (Linux, Apache, MySQL, PHP) using Docker Compose.
- **`.devcontainer/docker-compose.yml`:**

<!-- end list -->

YAML

```ts

version: '3.8'

services:

app:

build:

context: ./app

dockerfile: Dockerfile

ports:

- "80:80" # Forward Apache port

volumes:

- ./app:/var/www/html # Mount application code



db:

image: mysql:8.0

environment:

MYSQL_ROOT_PASSWORD: rootpassword

MYSQL_DATABASE: webapp_db

MYSQL_USER: webapp_user

MYSQL_PASSWORD: webapp_password

ports:

- "3306:3306" # Forward MySQL port

volumes:

- db_data:/var/lib/mysql



volumes:

db_data:

```

- **`.devcontainer/app/Dockerfile`:**

<!-- end list -->

Dockerfile

```ts

FROM php:8.1-apache



RUN apt-get update && apt-get install -y --no-install-recommends \

libzip-dev \

unzip



RUN docker-php-ext-install pdo pdo_mysql zip



WORKDIR /var/www/html

COPY . .

```

- **`.devcontainer/devcontainer.json`:**

<!-- end list -->

```json
{
	"name": "LAMP Stack",

	"dockerComposeFile": "docker-compose.yml",

	"service": "app",

	"workspaceFolder": "/var/www/html",

	"extensions": ["php-intelephense.php-intelephense", "felixfbecker.php-debug"],

	"forwardPorts": [80, 3306]
}
```

- **Explanation:**
- Uses Docker Compose to define two services: `app` (web application) and `db` (MySQL database).
- `app` service builds from a `Dockerfile` (using `php:8.1-apache` base image, installs PHP extensions, and copies application code).
- `db` service uses the `mysql:8.0` image, configures database credentials and volumes.
- `devcontainer.json` points to `docker-compose.yml`, specifies the `app` service as the development container, and forwards ports 80 (Apache) and 3306 (MySQL).

**6.4. Data Science Environment (Jupyter Notebooks):**

- **Scenario:** Building a data science environment with Jupyter Notebooks, machine learning libraries, and data processing tools.
- **`devcontainer.json`:**

<!-- end list -->

```json`

{

"name": "Data Science with Jupyter",

"image": "mcr.microsoft.com/devcontainers/python:3.10-data-science-

```json

bullseye",

"extensions": [

"ms-python.python",

"ms-python.vscode-pylance",

"ms-toolsai.jupyter",

"ms-toolsai.vscode-jupyter-powerview"

],

"settings": {

"terminal.integrated.shell.linux": "/bin/bash",

"python.defaultInterpreterPath": "/usr/local/bin/python"

},

"forwardPorts": [8888], // Jupyter Notebook port

"postCreateCommand": "pip install -r requirements.txt"

}

```

- **`requirements.txt` (Example):**

```ts
numpy;

pandas;

scikit - learn;

matplotlib;

seaborn;

jupyter;
```

- **Explanation:**
- Uses the `mcr.microsoft.com/devcontainers/python:3.10-data-science-bullseye` pre-built image specifically designed for data science with Python 3.10 and common data science tools.
- Installs Python, Pylance, Jupyter, and Jupyter Power View extensions.
- Sets terminal to bash and Python interpreter path.
- Forwards port 8888, the default port for Jupyter Notebooks.
- `postCreateCommand` installs Python libraries listed in `requirements.txt` using `pip`.

These examples demonstrate how Dev Containers can be tailored for diverse development needs, from simple web applications to complex data science workflows. By leveraging pre-built images, Dockerfiles, and Docker Compose, you can create highly customized and reproducible development environments for any project.
