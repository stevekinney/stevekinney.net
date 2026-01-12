---
paths:
  - '**/plugins/remark-*'
  - '**/remark-*'
  - '**/rehype-*'
---

# Remark/Unified Plugin Development

When developing remark or unified plugins:

- **Don't discard regex capture groups**: When extracting data from patterns with multiple capture groups, ensure all relevant groups are used. Explicitly naming unused groups (e.g., `const [, variant, foldIndicator, title] = match`) makes intent clear and prevents accidental omission.

- **Preserve existing component semantics**: When migrating or refactoring plugins, check how the output was consumed by existing components. Features like foldable callouts (`+`/`-` indicators) or other interactive behaviors need to be preserved via data attributes or other mechanisms.

- **Use data attributes for component integration**: Set `data.hProperties` with semantic attributes (e.g., `data-callout`, `data-foldable`, `data-default-open`) rather than baking behavior into class names. This allows Svelte components to respond to the attributes appropriately.

- **Test edge cases in content**: Search the content directory for real-world usage patterns (e.g., `grep -r '\[!.*\]-'`) before assuming a feature isn't used. Existing content often uses features that aren't immediately obvious.
