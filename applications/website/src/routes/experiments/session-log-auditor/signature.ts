/**
 * Normalizes an error message into a signature, so the same failure groups
 * together however its paths, numbers, and IDs differ. Each replacement runs
 * in order: an ID has to go before the number rule would chew it into pieces.
 */

type Replacement = { pattern: RegExp; placeholder: string };

const REPLACEMENTS: Replacement[] = [
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    placeholder: '<uuid>',
  },
  // A Windows path, such as `C:\Users\me\app\index.ts`.
  { pattern: /\b[A-Za-z]:\\[^\s'"`,;)\]]+/g, placeholder: '<path>' },
  // A Unix path that starts at the root or a home directory, but not a closing tag or a URL.
  { pattern: /(?<![\w.~<:/-])(?:~(?=\/)|\$HOME(?=\/))?\/[^\s'"`,;:)\]]+/g, placeholder: '<path>' },
  // A home directory on its own, such as `~`.
  { pattern: /(?<![\w/])~(?![\w/])/g, placeholder: '<path>' },
  // A hash has at least one digit and one letter, so ordinary words and numbers aren't hashes.
  {
    pattern: /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,64}\b/gi,
    placeholder: '<hash>',
  },
  // A quoted identifier, such as `'lodash'` or "`--json`".
  { pattern: /(['"`‘“])[^\s'"`‘’“”]{1,120}(['"`’”])/g, placeholder: '$1<name>$2' },
  // A position such as `:12:5` or `line 12`, and any other standalone number.
  { pattern: /\b\d+(?:\.\d+)*\b/g, placeholder: '<n>' },
];

export const toSignature = (message: string): string =>
  REPLACEMENTS.reduce(
    (text, { pattern, placeholder }) => text.replace(pattern, placeholder),
    message,
  )
    .replace(/\s+/g, ' ')
    .trim();
