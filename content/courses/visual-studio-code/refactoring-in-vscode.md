---
title: Refactoring in Visual Studio Code
description: Master essential code refactoring techniques in Visual Studio Code, from renaming symbols to extracting methods and variables
modified: 2025-03-18T08:22:18-05:00
---

There are a bunch of little niceties in Visual Studio Code that make refactoring _way_ easier.

## Rename Symbol

Okay, so this is like my favorite feature that I use basically every single day.

When you need to rename a variable, function, or class across your entire project, press `F2` on the symbol you want to rename. Visual Studio Code will prompt you for the new name, then update every reference to match. This operation is especially handy in strongly typed languages like TypeScript, where the editor can accurately track usage throughout your codebase.

> [!TIP] If your project has a language server (for instance, the TypeScript Language Server), the rename feature can work seamlessly across multiple files, ensuring nothing is left behind.

## Extract Method or Function

Sometimes, a block of code in a function grows too large or handles multiple responsibilities. You can highlight that code segment, then look for the “Extract Method” or “Extract Function” action. Language extensions, such as the official TypeScript and JavaScript extensions, often provide this. Visual Studio Code then wraps the highlighted code in a new function, replacing the original section with a function call.

```ts
function processNumbers(nums: number[]): void {
  // Original code that can be extracted
  const total = nums.reduce((acc, curr) => acc + curr, 0);
  console.log(`Sum of numbers: ${total}`);

  // … more code …
}

// After extracting method/function:
function processNumbers(nums: number[]): void {
  calculateAndLogSum(nums);
  // … more code …
}

function calculateAndLogSum(nums: number[]): void {
  const total = nums.reduce((acc, curr) => acc + curr, 0);
  console.log(`Sum of numbers: ${total}`);
}
```

This approach makes your code more modular and easier to maintain.

## Extract Variable or Constant

A similar workflow applies when extracting common expressions into a separate variable or constant. You might start with repeated calculations or a hard-coded value scattered throughout your code. Highlight the expression, right-click, and choose an “Extract to constant” or “Extract to variable” refactoring. Visual Studio Code will replace every occurrence of that expression with a new variable or constant, declared once at the top of the scope.

```ts
// Before extraction:
const area = width * height;
console.log(`Area is ${width * height}`);

// After extracting variable:
const area = width * height;
console.log(`Area is ${area}`);
```

Use this feature to make your code self-documenting and reduce duplication.

> [!TIP] Keep an eye on the Code Action lightbulb that appears in the editor gutter when you select or hover over code. This icon often indicates automated refactoring options, including extraction.

## Quick Fixes

As you code, you might notice a lightbulb icon or yellow squiggly lines under some code. These indicate Visual Studio Code (or rather, the language server or linter) has suggestions. For example, in a JS file, if you have an unused variable, you might see a gray underline. Or if you spelled `console` as `consle`, there might be a red squiggle and a lightbulb offering “Did you mean 'console'?”. To trigger these **Quick Fix** suggestions manually, place the cursor on the error or underlined code and press `Ctrl-.` or `Cmd+.` . A context menu of fixes/refactorings appears. You can navigate it with arrows or click. For instance, on the misspelled `consle`, `Ctrl+.` might suggest “Change to 'console'” – selecting it will automatically fix the typo. Another example: in TypeScript or C#, if you have a function call to a function that doesn't exist, Quick Fix might offer “Create function definition for …” and generate a stub for you.

**Other Refactors:** Depending on language, `Ctrl+.` might offer things like “Extract function from selection” or “Convert to template string” or “Surround with try/catch”. It's worth checking the lightbulb if you think “I wish I could quickly do X” – sometimes the language support has it. For example, in a JSX file, you might get “Wrap in div” etc., as a quick fix. Or simply “Remove unused import” if a module is imported but not used.

## The Problems Panel

Keep an eye on the Problems panel (you can toggle with `Ctrl+Shift+M`). If there's a number on the bottom left (status bar) like ❗3 or ⚠️1, that's errors or warnings count. Clicking that opens Problems. You can click an item to jump to it. Quick Fix (if available) can often fix those warnings (like adding a missing import, or adding `// @ts-ignore`, etc., depending on context).

## Inline Refactoring

When a variable or function you previously extracted turns out to be redundant, use inline refactoring to reverse the process. This command replaces all instances of the symbol with its original value or code, then removes its declaration. Right-click the symbol and choose "Inline Variable" (or "Inline Function"), or invoke it from the Command Palette by searching for "Inline." This helps simplify your code when extra abstraction is no longer needed.

## Organize Imports

Unused or unsorted imports can clutter your files, especially in TypeScript projects. VS Code provides an "Organize Imports" action that automatically removes unused imports and sorts the remaining ones. Trigger it via the Command Palette or set it to run on save. This refactoring cleans up your file header, improving readability and maintainability.

## Move to New File

As your code evolves, you might find that certain functions, classes, or constants would be better placed in their own module. Some language extensions offer a "Move to New File" refactoring that automatically extracts the selected symbol into a new file and updates all references accordingly. This modularization makes your codebase easier to navigate and reuse across different parts of your project.

## Convert Function to Arrow Function

For JavaScript and TypeScript, converting traditional function expressions to arrow functions can lead to more concise and modern syntax. VS Code's refactoring tools can offer a "Convert to Arrow Function" option that transforms your code while preserving its behavior. This is particularly useful when refactoring legacy code or adhering to contemporary coding standards.

## Surround With

Frequently wrapping code blocks with common structures—such as `try`/`catch` blocks, if/else statements, or custom snippets—can be automated using the "Surround With" refactoring. Select the code block, then trigger the refactoring from the Command Palette to choose from available wrapping templates. This feature speeds up repetitive tasks and ensures consistency in how you encapsulate code patterns.

Each of these additional refactoring tools empowers you to streamline your code changes and maintain a clean, modular, and modern codebase.
