---
title: Using Snippets with Regular Expressions in Visual Studio Code
description: >-
  Master regex transformations in snippets to create advanced dynamic templates
  with powerful text manipulation
modified: 2025-03-17T16:36:04-05:00
---

Suppose you want to generate a TypeScript constant name based on the filename, converting `hello-world.ts` into `HELLO_WORLD`. Capture groups and regex replacements are your allies here:

```json
"Uppercase Constant from Filename": {
  "prefix": "constfile",
  "body": [
    "const ${TM_FILENAME_BASE/(.*)/${1:/upcase}/} = '$1';"
  ],
  "description": "Creates an uppercase constant from filename"
}
```

But hold on—this snippet currently only makes the whole filename uppercase without handling dashes. To tackle that, try this enhanced regex transformation:

```json
"Snake Case Constant from Filename": {
  "prefix": "snakeconst",
  "body": [
    "const ${TM_FILENAME_BASE/([a-zA-Z0-9]+)([-_]*)/${1:/upcase}${2:+_}/g} = '$1';"
  ],
  "description": "Transforms filename (e.g., hello-world) into UPPER_SNAKE_CASE constant"
}
```

Now, `hello-world.ts` magically becomes:

```typescript
const HELLO_WORLD = 'hello-world';
```

The `+_` conditional (`${2:+_}`) adds underscores only if dashes or underscores are present between segments, ensuring you never end up with trailing underscores.

## Conditional Replacements with Regex

Sometimes, you want conditionals in your snippets. For example, converting a selected string into singular or plural form:

```json
"Pluralize selected word": {
  "prefix": "pluralize",
  "body": "${TM_SELECTED_TEXT/(.*?)(y|s)?$/${2:?${2/(y|s)/${2:/downcase}/}es:${1}s}/}",
  "description": "Pluralizes the selected English word"
}
```

Here's how it works:

- If the selected text ends in `y` or `s`, it pluralizes correctly:
  - `city` → `cities`
  - `class` → `classes`
- Otherwise, it simply adds an `s`:
  - `dog` → `dogs`

Regex captures (`(.*?)` and `(y|s)?`) and conditionals (`${2:?…:…}`) are the secret sauce that make this possible.

> [!TIP] This is the Standard Issue Warning for Regular Expressions
> Complex regex patterns are powerful but can quickly get hairy. Always test your snippets with varied input to ensure consistent behavior. Nobody likes regex-induced bugs at 2 AM.
