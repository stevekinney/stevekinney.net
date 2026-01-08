---
paths:
  - '**/*.svelte'
---

# Svelte Inline Styles

When toggling visibility with `style:display` in Svelte:

- Use `undefined` (not a specific value like `'block'`) to restore the element's natural display mode
- Setting `style:display={mounted ? 'block' : 'none'}` overrides CSS class-based layouts (e.g., `flex`, `grid`)
- Correct pattern: `style:display={mounted ? undefined : 'none'}` preserves Tailwind/CSS class behavior
