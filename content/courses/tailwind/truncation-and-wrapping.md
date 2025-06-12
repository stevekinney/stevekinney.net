---
title: Truncation and Wrapping
description: Manage text overflow with Tailwind utilities for truncation, line clamping, and text wrapping control
---

Text behavior within containers is fundamental for well-structured interfaces. Tailwind provides utilities for controlling text wrapping and truncation.

## Controlling Text Wrapping

Tailwind offers utilities for controlling how text flows and breaks across lines.

### Word Breaks (`word-break`)

The `word-break` property controls how words break to prevent overflow.

- **`break-normal`**: Default behavior, breaks only at normal word break points
- **`break-all`**: Breaks anywhere necessary, even within words
- **`break-keep`**: Prevents breaks in Chinese, Japanese, or Korean (CJK) text. For non-CJK text, behaves like `break-normal`

Apply conditionally with breakpoints:

```html tailwind
<p class="break-all md:break-normal">Thisisasuperlongwordthatwillbreakanywherenecessary.</p>
```

### Overflow Wrapping (`overflow-wrap`)

The `overflow-wrap` property specifies whether browsers should break lines within words to prevent overflow.

- **`wrap-normal`**: Default behavior, breaks only at natural wrapping points like spaces and hyphens
- **`wrap-break-word`**: Allows line breaks between letters if needed to prevent overflow
- **`wrap-anywhere`**: Similar to `wrap-break-word` but factors mid-word breaks when calculating intrinsic size. Useful for flex containers where you'd otherwise need `min-width: 0`

```html tailwind
<div class="flex w-32">
  <p class="wrap-anywhere">Anotherlongwordtobreakanywhere.</p>
</div>
```

### Whitespace Control (`white-space`)

The `white-space` property controls how whitespace and line breaks are handled.

- **`whitespace-normal`**: Text wraps normally, newlines and spaces are collapsed
- **`whitespace-nowrap`**: Prevents wrapping, text overflows if necessary. Newlines and spaces are collapsed
- **`whitespace-pre`**: Preserves newlines and spaces exactly as written. Text doesn't wrap
- **`whitespace-pre-line`**: Preserves newlines but collapses spaces. Text wraps normally
- **`whitespace-pre-wrap`**: Preserves newlines and spaces. Text wraps normally
- **`whitespace-break-spaces`**: Preserves newlines and spaces, including at line ends

```html tailwind
<p class="overflow-hidden text-ellipsis whitespace-nowrap">
  This text will not wrap and will be truncated with an ellipsis if it overflows.
</p>
<p class="whitespace-pre-wrap">This text preserves newlines and spaces, and wraps normally.</p>
```

### Controlling Breaks in Columns and Pages

Control where content breaks in multi-column layouts or print styles.

#### Break After (`break-after`)

Controls column or page breaks _after_ an element.

Available utilities: `break-after-auto`, `break-after-avoid`, `break-after-all`, `break-after-avoid-page`, `break-after-page`, `break-after-left`, `break-after-right`, `break-after-column`.

```html tailwind
<div class="columns-2">
  <p>Content before break...</p>
  <div class="break-after-column"></div>
  <p>Content after break...</p>
</div>
```

#### Break Before (`break-before`)

Controls column or page breaks _before_ an element.

Available utilities: `break-before-auto`, `break-before-avoid`, `break-before-all`, `break-before-avoid-page`, `break-before-page`, `break-before-left`, `break-before-right`, `break-before-column`.

```html tailwind
<div class="columns-2">
  <p>Content before break...</p>
  <p class="break-before-column">Content after break...</p>
</div>
```

#### Break Inside (`break-inside`)

Controls column or page breaks _within_ an element.

Available utilities: `break-inside-auto`, `break-inside-avoid`, `break-inside-avoid-page`, `break-inside-avoid-column`.

```html tailwind
<div class="columns-2">
  <div class="break-inside-avoid">
    <p>This block of text should ideally not be broken across columns or pages.</p>
  </div>
</div>
```

### Hyphenation (`hyphens`)

The `hyphens` property controls whether words should be hyphenated when text wraps.

- **`hyphens-none`**: Prevents hyphenation, even with line break suggestions (`&shy;`)
- **`hyphens-manual`**: Only hyphenates at specified break points (`&shy;`). Browser default
- **`hyphens-auto`**: Allows browser to automatically choose hyphenation points based on language. Manual suggestions are preferred

```html tailwind
<p class="hyphens-auto">This word-processing example demonstrates automatic hyphenation.</p>
```

### General Text Wrapping (`text-wrap`)

The `text-wrap` property offers modern control over text wrapping.

- **`text-wrap`**: Allows text to wrap normally at logical points
- **`text-nowrap`**: Prevents text from wrapping
- **`text-balance`**: Distributes text evenly across lines. Browsers often limit this to ~6 lines for performance, making it ideal for headings
- **`text-pretty`**: Attempts to prevent orphans (single words on the last line)

```html tailwind
<h1 class="text-balance">A title that looks good across multiple lines.</h1>
<p class="text-pretty">
  A longer paragraph that avoids having a single word orphaned on the last line.
</p>
```

## Managing Text Truncation

Constrain text to specific spaces and indicate when content is cut off.

### Single-line Truncation (`text-overflow`)

Prevent text from wrapping and indicate overflow.

- **`truncate`**: Composite utility that sets `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`. Prevents wrapping and truncates with ellipsis (...)

  ```html tailwind
  <p class="w-32 truncate">This text is too long and will be truncated.</p>
  ```

- **`text-ellipsis`**: Sets `text-overflow: ellipsis`. Use with `overflow: hidden` and `white-space: nowrap` to add ellipsis (...) to overflowing text
- **`text-clip`**: Sets `text-overflow: clip`. Truncates text at content area limit without indicator. Browser default

### Multi-line Clamping (`line-clamp`)

Truncate multi-line text after a specific number of lines.

- **`line-clamp-<number>`**: Limits text to specified lines (`line-clamp-2`, `line-clamp-3`). Sets `overflow: hidden`, `display: -webkit-box`, `-webkit-box-orient: vertical`, and `-webkit-line-clamp: <number>`

  ```html tailwind
  <div class="w-48">
    <p class="line-clamp-3">
      This is a longer block of text that will be limited to a maximum of three lines before being
      truncated with an ellipsis.
    </p>
  </div>
  ```

- **`line-clamp-none`**: Removes previously applied line clamp
- **Custom Values**: Use `line-clamp-[<value>]` for custom line counts

Apply responsively:

```html tailwind
<p class="line-clamp-2 md:line-clamp-4">
  This text will show 2 lines on small screens and 4 on medium screens and up.
</p>
<p class="line-clamp-[5] lg:line-clamp-[8]">This text uses arbitrary line counts.</p>
```

Tailwind's text wrapping and truncation utilities provide comprehensive control over text flow directly in HTML, making it easy to manage complex layouts and handle overflow scenarios consistently.
