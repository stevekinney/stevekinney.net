---
title: Refactoring in Visual Studio Code
description: Master essential code refactoring techniques in VS Code, from renaming symbols to extracting methods and variables
modified: 2025-03-16T16:56:46-06:00
---

Refactoring is an essential part of clean, maintainable code. Visual Studio Code provides built-in refactoring tools, and many language extensions enhance these capabilities even further. Below is an overview of several key refactoring features.

## Rename Symbol

When you need to rename a variable, function, or class across your entire project, press `F2` on the symbol you want to rename. VS Code will prompt you for the new name, then update every reference to match. This operation is especially handy in strongly typed languages like TypeScript, where the editor can accurately track usage throughout your codebase.

> [!TIP] If your project has a language server (for instance, the TypeScript Language Server), the rename feature can work seamlessly across multiple files, ensuring nothing is left behind.

## Extract Method or Function

Sometimes, a block of code in a function grows too large or handles multiple responsibilities. You can highlight that code segment, then look for the “Extract Method” or “Extract Function” action. Language extensions, such as the official TypeScript and JavaScript extensions, often provide this. VS Code then wraps the highlighted code in a new function, replacing the original section with a function call.

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

A similar workflow applies when extracting common expressions into a separate variable or constant. You might start with repeated calculations or a hard-coded value scattered throughout your code. Highlight the expression, right-click, and choose an “Extract to constant” or “Extract to variable” refactoring. VS Code will replace every occurrence of that expression with a new variable or constant, declared once at the top of the scope.

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
