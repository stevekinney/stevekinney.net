---
title: Using Dockerfiles with Dev Containers
description: >-
  Learn how to create custom development environments with Dockerfiles for
  maximum control and flexibility
modified: 2025-04-16T12:27:20-06:00
---

Dev Containers offer a high degree of customization to perfectly match your project's needs and your personal preferences. Let's delve into advanced customization techniques. While using pre-built images with the `image` property in `devcontainer.json` is convenient, for more advanced customization, using a **Dockerfile** offers unparalleled control over your container image.

1. **Create a `Dockerfile`:** Create a file named `Dockerfile` within the `.devcontainer` folder of your project.
2. **Modify `devcontainer.json`:** In `devcontainer.json`, replace the `image` property with `dockerFile` and specify the path to your Dockerfile.

```json
{
  "dockerFile": "Dockerfile"
}
```

If your Dockerfile is in the same folder as `devcontainer.json`, simply use `"dockerFile": "Dockerfile"`. If it's in a subdirectory, use a relative path like `"dockerFile": "./path/to/Dockerfile"`.

## DockerFile Customization Examples

### Installing Additional Software

Use `RUN` instructions in your Dockerfile to install any software packages, libraries, or tools needed in your environment.

```Dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:18
RUN apt-get update && apt-get install -y --no-install-recommends \

graphicsmagick
```

This example adds the `graphicsmagick` image processing library to a Node.js Dev Container.

### Configuring System Settings

Use `RUN` instructions to modify system configurations within the container.

```Dockerfile
FROM mcr.microsoft.com/devcontainers/python:3.10
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && \

locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
```

This example sets the locale within a Python Dev Container to UTF-8.

### Setting Up Services (Databases, Message Queues)

While Dockerfiles are primarily for image building, you can use `RUN` commands to set up simple services. However, for more complex multi-container setups with databases, message queues, etc., consider using **Docker Compose** (covered later).

```Dockerfile
FROM mcr.microsoft.com/devcontainers/go:1.20
RUN apt-get update && apt-get install -y --no-install-recommends \

postgresql-client
```

This example installs the PostgreSQL client tools in a Go Dev Container.

### Custom Base Images

You can use any Docker image as your base image in your Dockerfile, including custom images you create and host yourself or from private registries.

## Best Practices for Dockerfiles in Dev Containers

- **Start with a Well-Maintained Base Image:** Begin your `Dockerfile` `FROM` a reputable, well-maintained base image relevant to your technology stack (e.g., official language images, Microsoft Dev Container images).
- **Layer Optimizations:** Use Dockerfile best practices for efficient layering and caching to speed up container builds (group related commands in single `RUN` instructions, order instructions strategically).
- **Keep it Minimal (Initially):** Start with a Dockerfile that includes the essential software and configurations. Add customizations incrementally as needed. Overly complex Dockerfiles can increase build time and maintenance overhead.
- **Version Pinning (Dependencies):** Consider pinning versions of software packages and dependencies in your Dockerfile to ensure reproducibility and avoid unexpected changes when base images are updated.
