/** A Svelte component tag such as `<Example value={a < b} />` located in raw markup. */
export type SvelteComponentTag = {
  name: string;
  start: number;
  end: number;
  selfClosing: boolean;
};

const openingTagStart = /<([A-Z][A-Za-z0-9_$]*(?:\.[A-Za-z0-9_$]+)*)(?=[\s/>])/gu;

/** Find component opening tags, skipping `>` and `<` inside quotes and `{}` expressions. */
export const findSvelteComponentTags = (source: string): SvelteComponentTag[] => {
  const tags: SvelteComponentTag[] = [];
  for (const match of source.matchAll(openingTagStart)) {
    const start = match.index;
    if (start < (tags.at(-1)?.end ?? 0)) continue;
    let depth = 0;
    let quote: string | undefined;
    for (let cursor = start + match[0].length; cursor < source.length; cursor++) {
      const character = source[cursor];
      if (quote) {
        if (character === '\\') cursor++;
        else if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'" || character === '`') quote = character;
      else if (character === '{') depth++;
      else if (character === '}') depth = Math.max(0, depth - 1);
      else if (character === '>' && depth === 0) {
        tags.push({
          name: match[1],
          start,
          end: cursor + 1,
          selfClosing: source[cursor - 1] === '/',
        });
        break;
      }
    }
  }
  return tags;
};

/** Blank component opening tags while preserving every offset. */
export const maskSvelteComponentTags = (source: string): string => {
  let masked = source;
  for (const tag of findSvelteComponentTags(source))
    masked = masked.slice(0, tag.start) + ' '.repeat(tag.end - tag.start) + masked.slice(tag.end);
  return masked;
};

/** Apply `transform` to the markup between component opening tags, leaving the tags untouched. */
export const mapOutsideSvelteComponentTags = (
  source: string,
  transform: (segment: string) => string,
): string => {
  let result = '';
  let cursor = 0;
  for (const tag of findSvelteComponentTags(source)) {
    result += transform(source.slice(cursor, tag.start)) + source.slice(tag.start, tag.end);
    cursor = tag.end;
  }
  return result + transform(source.slice(cursor));
};

/** Locate the matching `</Name>`, ignoring text inside `{}` expressions and their string literals. */
const findMatchingClosingTag = (
  source: string,
  opening: SvelteComponentTag,
  tags: SvelteComponentTag[],
): number | undefined => {
  const closing = `</${opening.name}>`;
  const nestedStarts = new Set(
    tags.filter((tag) => tag.name === opening.name && !tag.selfClosing).map((tag) => tag.start),
  );
  let depth = 1;
  let braces = 0;
  let quote: string | undefined;
  for (let cursor = opening.end; cursor < source.length; cursor++) {
    const character = source[cursor];
    if (braces > 0) {
      if (quote) {
        if (character === '\\') cursor++;
        else if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'" || character === '`') quote = character;
      else if (character === '{') braces++;
      else if (character === '}') braces--;
      continue;
    }
    if (character === '{') braces++;
    else if (source.startsWith(closing, cursor)) {
      depth--;
      cursor += closing.length - 1;
      if (depth === 0) return cursor + 1;
    } else if (nestedStarts.has(cursor)) depth++;
  }
  return undefined;
};

/** Component regions: self-closing tags, or an opening tag through its matching closing tag. */
export const findSvelteComponentRegions = (
  source: string,
): Array<{ start: number; end: number }> => {
  const tags = findSvelteComponentTags(source);
  const regions: Array<{ start: number; end: number }> = [];
  let covered = 0;
  for (const tag of tags) {
    if (tag.start < covered) continue;
    if (tag.selfClosing) {
      regions.push(tag);
      covered = tag.end;
      continue;
    }
    const end = findMatchingClosingTag(source, tag, tags);
    if (end !== undefined) {
      regions.push({ start: tag.start, end });
      covered = end;
    }
  }
  return regions;
};
