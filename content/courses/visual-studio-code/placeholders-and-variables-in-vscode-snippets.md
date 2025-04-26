---
title: Placeholders and Variables in Snippets
description: Learn how to navigate placeholders, and use transformations to maximize your snippet efficiency in Visual Studio Code.
modified: 2025-03-18T08:41:54-05:00
---

## Placeholder Navigation

Once you insert a snippet with placeholders, Visual Studio Code makes it easy to navigate and fill in the placeholder values:

- **Tab Key (`Tab`):** After snippet insertion, your cursor will automatically be positioned at the first placeholder (`$1`). Pressing the `Tab` key will jump the cursor to the next placeholder (`$2`), then `$3`, and so on, in numerical order.
- **Shift+Tab Keys (`Shift+Tab`):** To move backward through placeholders, press `Shift+Tab`. This will move the cursor to the previous placeholder in reverse numerical order.
- **Simultaneous Editing of Identical Placeholders:** If you use the same placeholder number multiple times in your snippet body (e.g., `${1:variableName}` used twice), editing the value of one instance will automatically update all other instances of the same placeholder number _within the current snippet insertion_. This is very useful for renaming variables or parameters consistently throughout a code block.

## Variable Transformation

Snippet variables become even more powerful when combined with transformations. Transformations allow you to modify the value of a variable before it's inserted into the snippet. The syntax for transformations is:

```ts
${variable_name/regular_expression/format_string/options}
```

Let's break down the transformation syntax:

- **`variable_name`:** The name of the variable you want to transform (e.g., `TM_FILENAME_BASE`, `CURRENT_YEAR`).
- **`/regular_expression/`:** A regular expression to match against the variable's value.
- **`format_string`:** The string to replace the matched text with. You can use special escape sequences within the `format_string`:
  - `$0`: Inserts the whole matched text.
  - `$1`, `$2`, … `$9`: Inserts the text captured by the corresponding capturing group in the regular expression.
- **`options` (Optional):** Flags to modify the regular expression matching behavior:
  - `i`: Case-insensitive matching.
  - `g`: Global matching (replace all occurrences).
  - `m`: Multiline mode.

### Convert Filename to Uppercase

```json
"Uppercase Filename": {
    "prefix": "upperfile",
    "body": [
        "// File: ${TM_FILENAME_BASE/^(.*)$/${1:/upcase}/}.js"
    ],
    "description": "Insert filename in uppercase"
}
```

- `TM_FILENAME_BASE`: Gets the filename without extension.
- `/^(.*)$/`: Matches the entire filename (captured in group 1).
- `/${1:/upcase}/`: Replaces the matched text with the uppercase version of capturing group 1 (`$1`).
- `/upcase`: A predefined transformation function to convert to uppercase. Other predefined functions include `/downcase`, `/capitalize`.

### Extract Year from Full Date

```json
"Year from Date": {
  "prefix": "yearfromdate",
  "body": [
	  "// Year: ${CURRENT_DATE/^(\\d{4})-(\\d{2})-(\\d{2})$/$1/}"
  ],
  "description": "Extract year from current date"
}
```

- `CURRENT_DATE`: Gets the current date (e.g., `2025-03-07`).
- `/^(\\d{4})-(\\d{2})-(\\d{2})$/`: Regular expression to match the YYYY-MM-DD format, capturing year, month, and day in groups 1, 2, and 3 respectively.
- `/$1/`: Replaces the matched text with only capturing group 1 (the year).

Variable transformations are incredibly powerful for dynamically adapting snippets to different contexts and formatting needs. Explore the [Visual Studio Code documentation on snippet syntax](https://www.google.com/search?q=https://code.visualstudio.com/docs/editor/userdefinedsnippets%23_snippet-syntax&authuser=1) for more advanced transformation examples and options.

## Placeholder Options

Placeholders can be further customized using options to control their behavior:

- **Default Values:** As seen in `${1:array}`, you can provide a default value that will be inserted initially. If you don't want to change the default value, you can simply press `Tab` to move to the next placeholder.
- **Choices (Quick Pick Menus):** `${1|option1,option2,option3|}` creates a dropdown list of options, as discussed earlier.
- **Placeholder Transformations (within Placeholders):** You can even apply transformations _within_ placeholders. For instance, you could combine a variable and a transformation within a placeholder: `${1:${TM_FILENAME_BASE/^(.*)$/${1:/capitalize}/}}`. This would capitalize the filename base and use it as a default value for the first placeholder.
- **Placeholder as a Snippet Trigger:** You can nest snippets and use a placeholder as a trigger for another snippet. When you reach a placeholder, typing a snippet prefix within it can trigger another snippet insertion within that placeholder. This is a key concept for creating nested snippets (discussed in the next section).

## Surrounding Text with `TM_SELECTED_TEXT`

Imagine you've got some React code, and you want to quickly wrap your selected JSX with a custom component. Here's a handy snippet for that:

```json
"Wrap with MyComponent": {
  "prefix": "wrapMyComp",
  "body": [
    "<MyComponent>",
    "  ${TM_SELECTED_TEXT}",
    "</MyComponent>"
  ],
  "description": "Wrap selected JSX with MyComponent"
}
```

If you select code and trigger this snippet (`wrapMyComp`), the selected text instantly becomes nested inside `<MyComponent>`. Easy, right?

> [!TIP] For this snippet to work, make sure you've selected some text before activating the snippet. Otherwise, the variable remains empty.

Another quick example—surrounding a selection with a TypeScript function call:

```json
"Log selected expression": {
  "prefix": "logsel",
  "body": "console.log('${TM_SELECTED_TEXT}', ${TM_SELECTED_TEXT});",
  "description": "Logs selected expression to console"
}
```

This snippet duplicates the selected text—first as a string (so you know what's logged), then as the actual value.

## Advanced `TM_SELECTED_TEXT` with Transformations

The real power of `TM_SELECTED_TEXT` emerges when combined with Visual Studio Code's transformation functions. These allow you to modify the selected text in various ways, opening up a world of possibilities.

### Text Case Transformations

You can instantly change text case with built-in transformations:

```json
"Transform Selected Text": {
  "prefix": "transform",
  "body": [
    "Original: ${TM_SELECTED_TEXT}",
    "Uppercase: ${TM_SELECTED_TEXT/(.*)/${1:/upcase}/}",
    "Lowercase: ${TM_SELECTED_TEXT/(.*)/${1:/downcase}/}",
    "Title Case: ${TM_SELECTED_TEXT/(.*)/${1:/pascalcase}/}",
    "Camel Case: ${TM_SELECTED_TEXT/(.*)/${1:/camelcase}/}"
  ],
  "description": "Demonstrates various text transformations"
}
```

Select any text, trigger the snippet, and see all the transformations at once.

### Wrap Selected Text with HTML Tags and Attributes

This snippet wraps selected text with customizable HTML tags:

```json
"Wrap with HTML Element": {
  "prefix": "wraphtml",
  "body": [
    "<${1:div} class=\"${2:container}\" id=\"${3:unique-id}\">",
    "  ${TM_SELECTED_TEXT}",
    "</${1:div}>"
  ],
  "description": "Wraps selected text with HTML element and attributes"
}
```

The power here is combining selected text with tabstops for customization. Select some text, trigger the snippet, then customize the element type and attributes.

### Generate Code from Selected Class Name

This snippet takes a selected class name and generates a full React component with proper casing:

```json
"React Component from Selection": {
  "prefix": "rcs",
  "body": [
    "import React from 'react';",
    "",
    "interface ${TM_SELECTED_TEXT/(.*)/${1:/pascalcase}/}Props {",
    "  ${1}",
    "}",
    "",
    "export const ${TM_SELECTED_TEXT/(.*)/${1:/pascalcase}/}: React.FC<${TM_SELECTED_TEXT/(.*)/${1:/pascalcase}/}Props> = (props) => {",
    "  return (",
    "    <div className=\"${TM_SELECTED_TEXT/(.*)/${1:/downcase}/}\">",
    "      ${2}",
    "    </div>",
    "  );",
    "};",
    ""
  ],
  "description": "Creates React component from selected text"
}
```

Select a simple name like `user-profile`, trigger the snippet, and it transforms it into a properly cased component name (`UserProfile`) while using lowercase for the CSS class.

### Route Generator from Selected Endpoint

For API development, this snippet generates an Express route handler from a selected endpoint path:

```json
"Express Route from Path": {
  "prefix": "exproute",
  "body": [
    "/**",
    " * ${TM_SELECTED_TEXT} endpoint",
    " */",
    "router.${1|get,post,put,delete|}('${TM_SELECTED_TEXT}', async (req, res) => {",
    "  try {",
    "    $2",
    "    return res.status(200).json({ success: true, data: {$3} });",
    "  } catch (error) {",
    "    console.error(`Error in ${TM_SELECTED_TEXT}: ${error.message}`);",
    "    return res.status(500).json({ success: false, error: error.message });",
    "  }",
    "});"
  ],
  "description": "Create Express route handler from selected endpoint path"
}
```

Select a path like `/api/users/:id`, trigger the snippet, choose the HTTP method, and get a fully formed route handler.

## Using the `CLIPBOARD` Variable

The `CLIPBOARD` variable inserts the current clipboard content into your snippet. Say you've copied a class name from elsewhere and want to quickly create a React component file:

```json
"React component from Clipboard": {
  "prefix": "rcclip",
  "body": [
    "import React from 'react';",
    "",
    "interface ${CLIPBOARD}Props {",
    "  $1",
    "}",
    "",
    "const ${CLIPBOARD}: React.FC<${CLIPBOARD}Props> = (props) => {",
    "  return (",
    "    <div>${2}</div>",
    "  );",
    "};",
    "",
    "export default ${CLIPBOARD};"
  ],
  "description": "Generates React component using clipboard content as the component name"
}
```

Copy the component name, trigger this snippet, and your component scaffold appears instantly, fully named and typed.

> [!WARNING] Make sure the clipboard actually contains what you expect. Otherwise, you'll end up with components like `const BuyMilkReminder`—funny but probably unintended.

## Final Cursor Position

When your snippet has been fully expanded, the special tab stop `$0` determines where the cursor lands next. This lets you control exactly where to continue coding after filling in all placeholders. For example:

```json
"Complete Function": {
  "prefix": "fn",
  "body": [
    "function ${1:funcName}(${2:params}) {",
    "  $0",
    "}"
  ],
  "description": "Creates a function with a final cursor position for the function body"
}
```

In this snippet, once you've filled in the function name and parameters, pressing `Tab` moves the cursor directly to the `$0` location—ready for you to start writing the function body.

## Nested Snippets Trigger

For more advanced workflows, you can trigger nested snippets within a placeholder. While editing a placeholder, if you type a snippet prefix and trigger its expansion, the new snippet will be inserted inside the current placeholder. This can be particularly useful for generating repeated or structured content dynamically. For example, if you're writing a component and frequently need to insert a specific prop type structure, triggering a nested snippet can streamline that process.

> [!TIP] Experiment with nesting snippets to reduce repetitive typing and maintain a consistent structure, but be cautious—overly complex nested snippets can sometimes make navigation a bit tricky.
