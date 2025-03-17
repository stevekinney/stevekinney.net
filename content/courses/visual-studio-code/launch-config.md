---
title: Launch Configurations in VS Code
description: Detailed guide to creating and customizing launch.json files for different debugging scenarios
modified: 2025-03-16T15:38:44-06:00
---

Let's walk through all of the sertings that you can play around with in `launch.json`.

`launch.json` is a JSON file with two main top-level properties:

- **`version`:** Specifies the version of the `launch.json` schema. It's usually `"0.2.0"`. You generally don't need to modify this.
- **`configurations`:** This is an _array_ of configuration objects. Each object defines a specific way to launch or attach to your application. You can have multiple configurations for different scenarios (e.g., debugging a script, debugging a test, attaching to a remote process).

Each configuration object within the `configurations` array contains a set of properties that control the debugging process. Here's a detailed breakdown of the most important ones:

## `type` (Required)

Specifies the type of debugger to use. This is usually determined by the extension you have installed for your programming language.

- **Common Values:**
  - `"node"`: For Node.js debugging.
  - `"python"`: For Python debugging (requires the Python extension).
  - `"go"`: For Go debugging (requires the Go extension).
  - `"java"`: For Java debugging (requires a Java debugger extension).
  - `"chrome"`: For debugging client-side JavaScript in Chrome.
  - `"pwa-chrome"`: Newer version of the Chrome debugger (recommended). "pwa" stands for Progressive Web App.
  - `"pwa-node"`: Newer debugger for Node.js
  - `"cppdbg"`: For C/C++ debugging (requires a C/C++ debugger extension).
  - `"lldb"`: Uses the LLDB debugger (often used with C/C++ and Rust).
  - `"coreclr"`: For debugging .NET Core applications.

```json
"type": "node"
```

## `request` (Required)

Specifies whether VS Code should _launch_ a new process or _attach_ to an existing running process.

- `"launch"`: VS Code starts the application in debug mode. This is the most common setting.
- `"attach"`: VS Code connects to an already running process. This is useful for debugging servers, long-running processes, or applications running in containers.

```json
"request": "launch" // Or "attach"
```

## `name` (Required)

A user-friendly name for this configuration. This name appears in the Debug view's dropdown menu, allowing you to select which configuration to run. Choose descriptive names!

```json
"name": "Run Main Script"
```

## `program` (Often Required for `launch`)

Specifies the _entry point_ of your application – the file that VS Code should execute when you start debugging. This is usually a relative path from the workspace root.

```json
"program": "${workspaceFolder}/src/index.js"
```

**Note:** The `${workspaceFolder}` variable automatically resolves to the root directory of your project.

## `args` (Optional)

An array of string arguments to pass to your application when it's launched. These are the same arguments you would provide on the command line.

```json
"args": ["--config", "config.json", "--verbose"]
```

## `cwd` (Optional)

Specifies the _current working directory_ for your application when it's launched. If not specified, it defaults to `${workspaceFolder}`. This is important if your application relies on relative paths to access files.

```json
"cwd": "${workspaceFolder}/data"
```

## `env` (Optional)

An object that defines _environment variables_ to set for your application's process. This is crucial for configuring your application's behavior during debugging.

```json
"env": {
    "NODE_ENV": "development",
    "DATABASE_URL": "mongodb://localhost:27017/mydb"
}
```

## `envFile` (Optional)

Specifies a path to a `.env` file, to load environment variables from a file.

```json
"envFile": "${workspaceFolder}/.env"
```

## `console` (Optional)

Specifies where the output from your application (e.g., `console.log` statements) should be displayed.

- **Values:**
  - `"integratedTerminal"` (Recommended): Output appears in VS Code's integrated terminal. This provides the best experience, including support for colors and interactive input.
  - `"internalConsole"`: Output appears in VS Code's Debug Console. This is less flexible than the integrated terminal.
  - `"externalTerminal"`: Launches an external terminal window. Use this if your application requires a specific terminal or if you have issues with the integrated terminal.

```json
"console": "integratedTerminal"
```

## `preLaunchTask` (Optional)

Specifies the name of a VS Code task (defined in `tasks.json`) to run _before_ the debugger starts. This is incredibly useful for automating build steps, compiling code, or starting dependent services.

```json
"preLaunchTask": "build" // Runs the "build" task from tasks.json
```

- **Note:** You must have a corresponding task defined in your `.vscode/tasks.json` file.

## `postDebugTask` (Optional)

Similar to `preLaunchTask`, but runs a task _after_ the debugging session ends. This can be used for cleanup, stopping services, etc.

```json
"postDebugTask": "stop-server"
```

## `sourceMaps` (Optional, but _highly_ recommended for many languages)

Controls whether VS Code uses _source maps_ to map between your source code and the code that's actually being executed. Source maps are _essential_ for debugging languages that are compiled or transpiled (like TypeScript, JavaScript with Babel, Sass, etc.). When you compile TypeScript to JavaScript, the compiler can generate a `.js.map` file (the source map) alongside the `.js` file. This map tells the debugger how to map lines of code in the compiled JavaScript back to the original TypeScript code.

- `true`: Enable source map support (default for many configurations).
- `false`: Disable source map support.

```json
"sourceMaps": true
```

## `skipFiles` (Optional)

An array of glob patterns specifying files or folders that the debugger should _skip_ when stepping through code. This is extremely useful for avoiding stepping into library code (like Node.js core modules or third-party libraries).

```json
"skipFiles": [
    "<node_internals>/**",
    "${workspaceFolder}/node_modules/**"
]
```

`"<node_internals>/**"` is a special pattern that matches Node.js internal files.

## `outFiles` (Optional)

An array of glob patterns that tell the debugger where to find the _generated_ files (e.g., compiled JavaScript files from TypeScript). This is often used in conjunction with `sourceMaps`.

```json
"outFiles": ["${workspaceFolder}/dist/**/*.js"]
```

**Note:** The `outFiles` property is often automatically configured by language extensions based on your project's settings (e.g., `tsconfig.json` for TypeScript).

## `runtimeExecutable` (Optional)

Specifies the absolute path to an executable that should be used. For example, if you need to use a specific version of Node.

```json
"runtimeExecutable": "/Users/me/.nvm/versions/node/v16.14.0/bin/node"
```

## `attach` Request Type (Specific Properties)\*\*

When using `request: "attach"`, some properties are different or have different meanings:

- **`processId` (Optional):** The ID of the process to attach to. You can use `${command:pickProcess}` to have VS Code prompt you to select a running process.
- **`port` (Often Required for `attach`):** The port number to connect to when attaching to a remote debugger.
- **`address` (Optional):** The hostname or IP address of the remote machine (for remote debugging).
- **`restart` (Optional):** If set to `true`, VS Code will automatically restart the debugging session if the attached process terminates.
- **`localRoot` (Optional):** The local source root for remote debugging. This helps VS Code find the source files if the paths on the remote machine are different.
- **`remoteRoot` (Optional):** The remote source root for remote debugging.

## Example Configurations

Here are some common `launch.json` configurations for different scenarios:

### Node.js (Launch)

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "pwa-node",
			"request": "launch",
			"name": "Launch Node.js App",
			"program": "${workspaceFolder}/src/index.js",
			"console": "integratedTerminal",
			"skipFiles": ["<node_internals>/**"],
			"preLaunchTask": "build" // Assuming you have a "build" task
		}
	]
}
```

### Node.js (Attach to Process)

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "pwa-node",
			"request": "attach",
			"name": "Attach to Process",
			"processId": "${command:pickProcess}",
			"skipFiles": ["<node_internals>/**"]
		}
	]
}
```

### Python (Launch)

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "python",
			"request": "launch",
			"name": "Run Python Script",
			"program": "${workspaceFolder}/main.py",
			"console": "integratedTerminal"
		}
	]
}
```

## Chrome (Launch - Debugging Client-Side JavaScript)

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"type": "pwa-chrome",
			"request": "launch",
			"name": "Launch Chrome against localhost",
			"url": "http://localhost:8080", // URL of your web app
			"webRoot": "${workspaceFolder}/src" // Path to your web app's source files
		}
	]
}
```
