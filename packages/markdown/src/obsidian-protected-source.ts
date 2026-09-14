import { tokenizer } from 'acorn';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';

const parser = unified().use(remarkParse).use(remarkMath);

/** Mask executable regions while retaining UTF-16 offsets, code literals, and math. */
export const maskObsidianProtectedSource = (source: string): string => {
  const characters = source.split('');
  const ranges: Array<{ start: number; end: number }> = [];
  const mask = (start: number, end: number): void => {
    for (let index = start; index < end; index++)
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
  };
  const frontmatter = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(source);
  if (frontmatter) {
    ranges.push({ start: 0, end: frontmatter[0].length });
    mask(0, frontmatter[0].length);
  }
  if (!source.includes('{') && !source.includes('<')) return characters.join('');
  visit(parser.parse(characters.join('')), (node) => {
    if (!['code', 'inlineCode', 'html', 'math', 'inlineMath'].includes(node.type)) return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    ranges.push({ start, end });
    if (node.type === 'html') mask(start, end);
  });
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  let rangeIndex = 0;
  for (let index = source.indexOf('{'); index >= 0; index = source.indexOf('{', index + 1)) {
    while (rangeIndex < ranges.length && ranges[rangeIndex].end <= index) rangeIndex++;
    const protectedRange = ranges[rangeIndex];
    if (protectedRange && protectedRange.start <= index) {
      index = protectedRange.end - 1;
      continue;
    }
    if (source[index - 1] === '\\') continue;
    const directive = /^[#:@/][A-Za-z]+\b/.exec(source.slice(index + 1));
    const expressionStart = index + 1 + (directive?.[0].length ?? 0);
    const tokens = tokenizer(source.slice(expressionStart), {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
    });
    let depth = 1;
    try {
      while (depth) {
        const token = tokens.getToken();
        if (token.type.label === 'eof') break;
        if (token.type.label === '{' || token.type.label === '${') depth++;
        if (token.type.label === '}') depth--;
        if (!depth) {
          const end = expressionStart + token.end;
          mask(index, end);
          index = end - 1;
        }
      }
    } catch {
      /* Invalid expressions remain intact for mdsvex/Svelte diagnostics. */
    }
  }
  return characters.join('');
};
