---
paths:
  - '**/*purify*'
  - '**/sanitiz*'
---

# DOMPurify Configuration

When using DOMPurify for HTML sanitization:

- **Wildcards don't work in ALLOWED_ATTR**: Patterns like `'aria-*'` and `'data-*'` are treated as literal strings, not wildcards. Use the boolean options `ALLOW_ARIA_ATTR` and `ALLOW_DATA_ATTR` instead (both default to `true`).

- **SVG requires explicit attributes**: When allowing `svg` and `path` tags, you must also allow their required attributes: `d`, `viewBox`, `fill`, `stroke`, `width`, `height`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `xmlns`. Without `d`, path elements render empty.

- **Form elements need comprehensive coverage**: Include `select`, `option`, and `textarea` in ALLOWED_TAGS. Add form-related attributes: `name`, `disabled`, `checked`, `selected`, `rows`, `cols`, `readonly`, `required`, `multiple`.

- **Serverless/Edge incompatibility**: `isomorphic-dompurify` uses `jsdom` on the server, which causes 500 errors in Vercel serverless functions. Move sanitization to build time (e.g., in remark/rehype plugins) instead of runtime.
