---
title: Search and Replace in Visual Studio Code
description: Master powerful search and replace techniques including regular expressions and multi-file operations
modified: 2025-03-16T16:46:20-06:00
---

VS Code's search and replace features are like an all-seeing crystal ball for your codebase—pinpointing the lines you need to tweak, then changing them at scale with minimal hassle. Here's how to harness its power, step by step.

## Regular Expressions: The Advanced Power Tool

When simple text searches won't cut it, regular expressions come to the rescue. Toggle the `.*` button in the Search view to enable regex mode. This allows you to create flexible patterns for everything from variable renaming to code cleanup.

Imagine you have a React codebase where you want to replace all `myVariable` declarations with `myVar`, but only when it's a let declaration:

```ts
let myVariable = "Hello";
…
let myVariableAgain = 42;
const myVariable = 9000; // should remain untouched
```

You can craft a regex like:

```ts
Find:    (let\s+)myVariable\b
Replace: $1myVar
```

Here, `(let\s+)` captures the literal `let` plus the following space, so the replacement references it as `$1`, preserving the original context. Using `\b` (word boundary) ensures you don't match partial words like `myVariableAgain`.

> [!TIP] Test First
> Test your regex patterns on a few lines before replacing across your entire codebase. Accidental mass replacements can lead to comedic or catastrophic results (depending on your perspective).

## Searching Across Files

Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on macOS) to open the Search view, which scans your entire workspace by default. Type in your query or pattern, and watch as VS Code combs through all files, presenting matches in a collapsible tree of results.

You can refine this search by specifying `Files to include` or `Files to exclude`. For instance, if you only want to search TypeScript files, type `**/*.ts` in the inclusion field. If you'd like to skip certain folders (like `node_modules`), exclude them explicitly with a pattern such as `**/node_modules`.

## Search and Replace Across Files

When you need to correct or update code across your entire project, the Replace panel is your friend. Once you enter text in the `Replace` field, you can preview the proposed changes before finalizing. VS Code groups each change by file, and you can accept or reject them individually or all at once.

This careful approach ensures you don't blindly clobber lines you never intended to touch. It's like having a code-proofreading assistant who waits for your final say before making sweeping edits.

> [!WARNING] Danger Zone™
> Double-check each replacement when dealing with sensitive code—particularly if your regex is broad. "Oops, I accidentally replaced my database URL everywhere" is not a fun Slack announcement.

## Include/Exclude Files and Folders

The `Files to include` and `Files to exclude` fields in the Search view work with glob patterns to zero in on, or ignore, specific directories and file types. Here are a few scenarios to consider:

- Searching only in your `src` folder: `src/**/*.ts`
- Excluding test files: `!**/*.test.ts`
- Ignoring multiple folders: `**/*` in Include, `**/node_modules, **/dist` in Exclude

These patterns make it effortless to keep your search results relevant, saving you from rummaging through auto-generated code or external libraries.

## Preserve Case

VS Code has a nifty "Preserve Case" feature, especially handy if you're refactoring variable names with different capitalizations. Suppose you search for `name` and replace it with `thing`. If you turn on Preserve Case, `Name` becomes `Thing`, and `NAME` becomes `THING`, matching the original capitalization pattern.

You can toggle this option by clicking the `AB` icon in the Search view. It's an easy way to avoid case-related mishaps while still automating the majority of your refactor.

## Search Editor: A Dedicated View for Search Results

VS Code offers a dedicated Search Editor that provides a more powerful way to work with search results. Press `Ctrl+Shift+J` (or `Cmd+Shift+J` on macOS) to open the Search Editor, which presents your search results in a full-fledged editor view.

### Benefits of the Search Editor:

1. **Persistent Results**: The Search Editor saves your search results as a document, allowing you to reference them later without re-running the search.

2. **Full Editor Capabilities**: Use all standard editor features like multiple cursors, selection, and keyboard navigation on your search results.

3. **Contextual View**: Each match is shown with several lines of context, making it easier to understand the surrounding code.

4. **Advanced Filtering**: Apply additional filtering to your search results without starting over.

5. **Searchable Results**: You can perform a search within your search results—essentially creating a nested search.

### Example Workflow:

```
1. Press Ctrl+Shift+J to open Search Editor
2. Enter your search term or regex pattern
3. Configure include/exclude patterns
4. Press Enter to run the search
5. Use standard editor keyboard shortcuts to navigate results
6. Apply additional filters via the search bar at the top
7. Double-click any result to jump to that location in the source file
```

When working with large codebases or complex searches, the Search Editor becomes invaluable for organizing and navigating through numerous results. You can even have multiple Search Editors open simultaneously for different queries.

> [!TIP] 
> You can save a Search Editor to revisit the same search later. Use `File > Save As...` or the keyboard shortcut `Ctrl+S` (`Cmd+S` on macOS).

## Advanced Capture Groups in Replacements

Capture groups in regular expressions aren't just for preserving parts of the match—they can be rearranged, duplicated, and transformed to create powerful text manipulations.

### Reordering Text with Capture Groups

Imagine you have a list of names in "LastName, FirstName" format that you need to reverse:

```
Smith, John
Johnson, Sarah
Williams, Michael
```

You can use capture groups to swap the order:

```
Find:    ([^,]+),\s*(.+)
Replace: $2 $1
```

This transforms the text to:

```
John Smith
Sarah Johnson
Michael Williams
```

The pattern captures everything before the comma as `$1` and everything after (excluding the space) as `$2`, then swaps them in the replacement.

### Converting Date Formats

Need to convert dates from MM/DD/YYYY to YYYY-MM-DD format?

```
Find:    (\d{1,2})\/(\d{1,2})\/(\d{4})
Replace: $3-$1-$2
```

This changes:
```
12/25/2023
1/15/2024
```

To:
```
2023-12-25
2024-1-15
```

For a more robust version that ensures two-digit months and days:

```
Find:    (\d{1,2})\/(\d{1,2})\/(\d{4})
Replace: $3-${1.padStart(2, '0')}-${2.padStart(2, '0')}
```

### Transforming HTML to JSX

When converting HTML to JSX, you often need to change attribute names:

```
Find:    <([a-z]+)([^>]*)\sclass="([^"]*)"([^>]*)>
Replace: <$1$2 className="$3"$4>
```

This changes `<div class="container">` to `<div className="container">`.

### Creating URL Slugs from Titles

Transform article titles into URL-friendly slugs:

```
Find:    ([A-Z])([A-Za-z\s]+)
Replace: ${1.toLowerCase()}${2.toLowerCase().replace(/\s+/g, '-')}
```

This converts "My Article Title" to "my-article-title".

### Converting Between Programming Styles

Transform snake_case to camelCase:

```
Find:    ([a-z])_([a-z])
Replace: $1${2.toUpperCase()}
```

This changes "user_profile_id" to "userProfileId".

Or convert camelCase to kebab-case:

```
Find:    ([a-z])([A-Z])
Replace: $1-${2.toLowerCase()}
```

This changes "userProfileId" to "user-profile-id".

> [!TIP] 
> Remember that regex replacement operations in VS Code occur from left to right, so complex transformations might require multiple passes with different patterns.