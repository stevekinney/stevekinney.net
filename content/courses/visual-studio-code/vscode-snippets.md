---
title: Snippets in VS Code
description: Learn how to use and create code snippets to boost your productivity with reusable code templates
modified: 2025-03-16T12:13:51-06:00
---

Snippets are pre-written blocks of code that you can quickly insert into your editor using a short keyword or prefix. It's not unfair of them as code templates or shortcuts for frequently used code structures. In VS Code, snippets are more than just static text; they are dynamic and interactive, allowing you to customize and adapt them to your specific needs.

I don't really feel like you need a sales pitch on snippets, but just in case—here you go:

- **Automation of Repetitive Coding Tasks:** Snippets eliminate the need to manually type out common code patterns repeatedly. Imagine writing loops, function definitions, or class structures from scratch every time. Snippets automate this, saving you valuable time and effort.
- **Boosting Coding Speed:** By inserting code blocks with just a few keystrokes, snippets drastically speed up your coding process. You spend less time typing boilerplate code and more time focusing on the core logic of your application.
- **Reducing Errors:** Manual coding is prone to errors, especially with repetitive tasks. Snippets provide pre-tested and error-free code blocks, reducing the chances of typos, syntax errors, and logical mistakes.
- **Enforcing Code Consistency:** Snippets ensure consistency across your codebase by providing standardized code structures. This is particularly beneficial in team projects where maintaining a uniform coding style is crucial. You can create snippets for company-specific coding standards, ensuring everyone adheres to the same patterns.
- **Learning New Languages and Frameworks:** Snippets can serve as handy references and learning aids for new languages or frameworks. By creating snippets for common constructs, you familiarize yourself with the syntax and best practices.

## Snippet Structure

A snippet in VS Code is defined as a JSON object with the following key fields:

```json
{
	"Snippet Name": {
		"prefix": "trigger",
		"body": ["// Code line 1", "// Code line 2", "// ..."],
		"description": "Snippet description"
	}
}
```

The snippet name is just the name you give to your snippet. It's used for organization and identification within your snippet configuration file. Choose descriptive names that reflect the snippet's purpose.

Let's break down each field:

- **`prefix` (String, Required):** This is the trigger word or characters you type in the editor to activate the snippet suggestion. When you type the `prefix`, VS Code will suggest your snippet in the IntelliSense dropdown. Choose a short, memorable, and unique prefix to avoid conflicts with existing commands or keywords.
- **`body` (Array of Strings, Required):** This is the core of the snippet – the actual code block that will be inserted. Each element in the array represents a line of code. VS Code will join these strings and insert them into the document, respecting indentation and line breaks. You can use placeholders, variables, and choices within the `body` to make your snippets dynamic.
- **`description` (String, Optional):** A brief explanation of what the snippet does. This description is displayed in the IntelliSense suggestion list, helping you understand the snippet's purpose when choosing from multiple suggestions. Providing clear descriptions is crucial for managing a large collection of snippets.
- **`scope` (String, Optional):** Defines the languages or file types where the snippet should be available. If omitted, the snippet is considered global and will be available in all languages. You can specify a single language identifier (e.g., `"javascript"`, `"python"`) or a comma-separated list of language identifiers (e.g., `"javascript,typescript"`). You can find a list of language identifiers [here](https://www.google.com/url?sa=E&source=gmail&q=https://code.visualstudio.com/docs/languages/identifiers&authuser=1).

## Example: A `for`/`of` Loop

JSON

```ts
"for/of Loop": {
    "prefix": "forloop",
    "body": [
        "for (let i = 0; i < ${1:array}.length; i++) {",
        "\tconst ${2:element} = ${1:array}[i];",
        "\t${0:// body}",
        "}"
    ],
    "description": "Basic for loop in JavaScript"
}
```

In this example:

- **"for/of Loop"** is the snippet name.
- **`forloop`** is the prefix. Typing `forloop` in a JavaScript file will trigger this snippet.
- The `body` contains the JavaScript `for` loop structure with placeholders.
- **"Basic for loop in JavaScript"** is the description.

## Snippet Syntax: Placeholders, Variables, and Choices

Snippets in VS Code are powerful because they support dynamic content through placeholders, variables, and choices.

- **Placeholders (`$1`, `$2`, `$3`, … and `$0`):** Placeholders represent cursor positions within the snippet. When you insert a snippet, the cursor initially jumps to `$1`. Pressing `Tab` moves the cursor to `$2`, then `$3`, and so on. `$0` is the final cursor position after you've navigated through all numbered placeholders. You can also use placeholder names like `${1:variableName}` to provide a default value or hint for the placeholder.
  - In the `for` loop example above:
    - `${1:array}`: The first placeholder, suggesting "array" as a default value.
    - `${2:element}`: The second placeholder, suggesting "element" as a default value.
    - `${0:// body}`: The final cursor position, placed inside the loop body with a comment.
- **Variables (`${variable_name}`):** VS Code provides a rich set of predefined variables that you can use within snippets to insert dynamic information based on the context. Variables are enclosed in `${}`. Some commonly used variables include:

  - **File and Path Variables:**
    - `${TM_FILENAME}`: The current filename (e.g., `my_script.js`).
    - `${TM_FILENAME_BASE}`: The current filename without the extension (e.g., `my_script`).
    - `${TM_DIRECTORY}`: The directory of the current file.
    - `${TM_FILEPATH}`: The full file path of the current file.
    - `${WORKSPACE_NAME}`: The name of the opened workspace or folder.
    - `${WORKSPACE_FOLDER}`: The path of the opened workspace or folder.
  - **Date and Time Variables:**
    - `${CURRENT_YEAR}`: The current year (e.g., `2025`).
    - `${CURRENT_YEAR_SHORT}`: The current year in two digits (e.g., `25`).
    - `${CURRENT_MONTH}`: The month as two digits (e.g., `03`).
    - `${CURRENT_MONTH_NAME}`: The full name of the month (e.g., `March`).
    - `${CURRENT_MONTH_NAME_SHORT}`: The short name of the month (e.g., `Mar`).
    - `${CURRENT_DATE}`: The day of the month as two digits (e.g., `07`).
    - `${CURRENT_DAY_NAME}`: The name of the day (e.g., `Friday`).
    - `${CURRENT_DAY_NAME_SHORT}`: The short name of the day (e.g., `Fri`).
    - `${CURRENT_HOUR}`: The current hour in 24-hour format (e.g., `17`).
    - `${CURRENT_MINUTE}`: The current minute (e.g., `08`).
    - `${CURRENT_SECOND}`: The current second (e.g., `14`).
    - `${CURRENT_TIMEZONE_OFFSET}`: The timezone offset from UTC (e.g., `-0700` for MST).
    - `${CURRENT_TIMESTAMP}`: The current Unix timestamp.
  - **User and Environment Variables:**
    - `${CLIPBOARD}`: The content of your clipboard.
    - `${RANDOM}`: 6 random Base-16 characters.
    - `${RANDOM_HEX}`: A random Base-16 number.
    - `${UUID}`: A version 4 UUID.
    - `${USER_NAME}`: Your operating system username.

  You can find a comprehensive list of predefined variables [here](https://www.google.com/search?q=https://code.visualstudio.com/docs/editor/userdefinedsnippets%23_variables&authuser=1).

### Adding Choices

Choices provide a dropdown list of options when you reach a placeholder. The syntax is `${placeholder_number|option1,option2,option3|}`. When you insert the snippet and reach this placeholder, VS Code will display a quick pick menu with `option1`, `option2`, and `option3`. You can select one of these options, or type in your own value.

```json
  "Log Message": {
    "prefix": "logmsg",
    "body": [
        "import logging",
        "",
        "logging.basicConfig(level=logging.${1|DEBUG,INFO,WARNING,ERROR,CRITICAL|})",
        "logging.${1|DEBUG,INFO,WARNING,ERROR,CRITICAL|}(${2:message})"
    ],
    "description": "Log message with level choice in Python"
}
```

When you use this snippet, the first placeholder `${1|DEBUG,INFO,WARNING,ERROR,CRITICAL|}` will present a dropdown with logging levels. Choosing an option will automatically populate both instances of `${1|…|}` with the selected level.

## Snippet Scope

Snippet scope determines where your snippets are available within VS Code. You can define snippets at three levels:

- **Global Snippets (User Snippets):** These snippets are available in all VS Code workspaces and for all languages (unless a `scope` is explicitly defined). They are ideal for commonly used code patterns that are language-agnostic or applicable across multiple projects.
- **Language-Specific Snippets:** These snippets are specific to a particular programming language. They are only available when you are working with files of that language type (e.g., JavaScript snippets will only appear in `.js` files). This is useful for language-specific syntax and constructs.
- **Project-Specific Snippets (Workspace Snippets):** These snippets are specific to the current VS Code workspace or project folder. They are stored within the `.vscode` folder at the root of your project. Project-specific snippets are perfect for enforcing coding standards or providing shortcuts that are unique to a particular project.

**How Scope Affects Availability:**

- VS Code prioritizes snippet availability in the following order: Project-Specific > Language-Specific > Global. If snippets with the same prefix exist at different scopes, the project-specific snippet will take precedence, followed by language-specific, and then global.
- If a snippet has no `scope` defined, it defaults to being global.
- If a snippet has a `scope` defined, it will only be available in files matching that scope.
