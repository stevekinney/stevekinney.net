---
title: Advanced Snippet Techniques in Visual Studio Code
description: >-
  Master nested snippets and regular expressions to create powerful, dynamic
  code templates
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

Alright, we're not done just yet. Let's take a quick moment and look at two advanced strategies before we move on.

- Using Nested Snippets
- Using Regular Expressions in Snippets

## Nested Snippets

Nested snippets allow you to create complex code generation workflows by inserting snippets within other snippets. This is achieved by using placeholders as snippet triggers.

### Example: Nested React Component Snippet

Let's say you have a basic React component snippet and a separate snippet for PropTypes. You can nest the PropTypes snippet within the component snippet.

```json
"React Functional Component": {
    "prefix": "rfc",
    "body": [
        "import React from 'react';",
        "",
        "const ${1:${TM_FILENAME_BASE/^(.*)$/${1:/pascalcase}/}} = (props) => {",
        "\treturn (",
        "\t\t<div>",
        "\t\t\t${0}",
        "\t\t</div>",
        "\t);",
        "};",
        "",
        "export default ${1};"
    ],
    "description": "React functional component"
}
```

### PropTypes Snippet

```json
"React PropTypes": {
    "prefix": "proptypes",
    "body": [
        "import PropTypes from 'prop-types';",
        "",
        "${1:ComponentName}.propTypes = {",
        "\t${0}",
        "};"
    ],
    "description": "React PropTypes definition"
}
```

**Nesting them:** To nest, modify the React Component snippet (`react-component.json`) to include a placeholder that triggers the PropTypes snippet. Replace the `export default ${1};` line with:

```json
'export default ${1};', '${2:proptypes}'; // Placeholder that triggers "proptypes" snippet
```

Now, the modified `snippet` becomes:

```json
"React Functional Component with PropTypes": { // Renamed snippet
    "prefix": "rfcp", // New prefix
    "body": [
        "import React from 'react';",
        "",
        "const ${1:${TM_FILENAME_BASE/^(.*)$/${1:/pascalcase}/}} = (props) => {",
        "\treturn (",
        "\t\t<div>",
        "\t\t\t${0}",
        "\t\t</div>",
        "\t);",
        "};",
        "",
        "export default ${1};",
        "${2:proptypes}" // Placeholder that triggers "proptypes" snippet
    ],
    "description": "React functional component with PropTypes" // Updated description
}
```

### How This Works

1. Insert the "React Functional Component with PropTypes" snippet using the `rfcp` prefix.
2. Fill in the component name at placeholder `$1`.
3. Press `Tab` to move to placeholder `$2`.
4. Now, within the `$2` placeholder, type the prefix of the "React PropTypes" snippet, which is `proptypes`.
5. Visual Studio Code will suggest the "React PropTypes" snippet. Select it.
6. The "React PropTypes" snippet will be inserted _within_ the `$2` placeholder of the "React Functional Component" snippet, effectively nesting them.

Nested snippets allow you to create modular and reusable code templates, building complex structures from smaller, manageable snippets.
