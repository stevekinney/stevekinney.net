# Markdown Formatting Guidelines

## Headings

- **No Numbering:** Do not number headings.
- **Markdown Only:** Use only Markdown heading markers (`#`, `##`, `###`, etc.); if a title exists, use H1; otherwise, start with H2 and descend.
- **Consistent Capitalization:** Use a uniform capitalization style (Title or Sentence case).
- **No Bold:** Use Markdown heading syntax without extra bolding. Do not wrap headings in bold syntax.

## Document Structure

- **No Horizontal Rules:** Never use horizontal rules (e.g., `---`, `***`). Use clear headings and blank lines for separation.

## Paragraphs & Lists

- **Prefer Paragraphs:** Write explanations in paragraphs.
- **Lists Only When Essential:** Use bulleted or numbered lists for steps or key points; lists must never contain code blocks.
- **No Code in Lists:** Keep code blocks out of list items.

## Code

- **Fenced Code Blocks:** Wrap multi-line code in triple backticks (optionally specify language, e.g., `ts, `json).
- **Inline Code:** Always wrap inline code in single backticks (e.g., `z.parse()`).

## Block Quotes & Callouts

- **Standard Block Quotes:** Use `>` for quotes.
- **Obsidian-Style Callouts:** Use these callout types (and their aliases):

  - **Abstract** (aliases: `summary`, `tldr`)
  - **Info**
  - **Todo**
  - **Tip** (aliases: `hint`, `important`)
  - **Success** (aliases: `check`, `done`)
  - **Question** (aliases: `help`, `faq`)
  - **Warning** (aliases: `caution`, `attention`)
  - **Failure** (aliases: `fail`, `missing`)
  - **Danger** (alias: `error`)
  - **Bug**
  - **Example**
  - **Quote** (alias: `cite`)

  _Example:_

  > [!TIP] Tip Title
  > This is a quick tip.

## Links & Images

- **Links:** Format as `[text](URL)`.
- **Images:** Format as `![alt](URL)`.

## Emphasis

- Use `**bold**` for strong emphasis and `*italics*` or `_underscores_` for subtle emphasis. Use sparingly.

## Indentation & Spacing

- Separate paragraphs with a blank line.
- Indent nested list items by two spaces.
- For explicit line breaks, end a line with two spaces.

## Consistency & Readability

- Follow uniform conventions for headings, lists, and code.
- Keep formatting simple and uncluttered.
