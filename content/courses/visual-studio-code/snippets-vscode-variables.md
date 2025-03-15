---
title: Snippet Variables in VS Code
description: Learn how to use powerful snippet variables like TM_SELECTED_TEXT and CLIPBOARD to create dynamic code templates
modified: 2025-03-16T16:21:33-06:00
---

Variables in snippets dynamically insert useful data. You're probably familiar with basic variables like `TM_FILENAME` or `CURRENT_YEAR`, but two less-used (yet powerful) heroes are `TM_SELECTED_TEXT` and `CLIPBOARD`.

## Surrounding Text with `TM_SELECTED_TEXT`

Imagine you've got some React code, and you want to quickly wrap your selected JSX with a custom component. Here’s a handy snippet for that:

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

The real power of `TM_SELECTED_TEXT` emerges when combined with VS Code's transformation functions. These allow you to modify the selected text in various ways, opening up a world of possibilities.

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
