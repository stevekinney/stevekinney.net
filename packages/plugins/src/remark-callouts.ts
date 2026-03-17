import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import type { Properties } from 'hast';
import type { Blockquote, LinkReference, Paragraph, Root, Text } from 'mdast';
import type { Node } from 'unist';
import type { Plugin } from 'unified';

interface HastData {
  hName?: string;
  hProperties?: Properties & { className?: string | string[] };
}

const CALLOUT_PATTERN = /^\s*\[?\s*!\s*([a-zA-Z]+)[^\S\n]*\]?([+-])?[^\S\n]*(.*)/i;
const CALLOUT_MARKER = /^\s*\[?\s*!\s*[a-zA-Z]+[^\S\n]*\]?([+-])?[^\S\n]*/i;

const BASE_CLASSES = 'space-y-2 rounded-md border px-4 py-2 shadow-sm';
const TITLE_CLASS = 'font-bold';

const variationAliases: Record<string, string> = {
  attention: 'warning',
  caution: 'warning',
  check: 'success',
  cite: 'quote',
  done: 'success',
  error: 'danger',
  fail: 'failure',
  faq: 'question',
  help: 'question',
  hint: 'tip',
  important: 'tip',
  information: 'info',
  missing: 'failure',
  summary: 'abstract',
  tldr: 'abstract',
};

const variationColors: Record<string, string> = {
  abstract:
    'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  bug: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  danger:
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  example:
    'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-50 dark:border-purple-900',
  failure:
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  note: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  question:
    'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-50 dark:border-orange-900',
  quote:
    'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-900',
  success:
    'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  tip: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  todo: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  warning:
    'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-50 dark:border-orange-900',
};

const normalizeVariant = (variant: string): string => {
  const lower = variant.toLowerCase();
  return variationAliases[lower] ?? lower;
};

const toTitle = (variant: string): string => {
  const lower = variant.toLowerCase();
  return lower ? lower[0].toUpperCase() + lower.slice(1) : '';
};

const mergeClassNames = (value: unknown, next: string[]): string[] => {
  const existing = Array.isArray(value)
    ? (value as string[])
    : typeof value === 'string'
      ? value.split(/\s+/).filter(Boolean)
      : [];
  return [...existing, ...next];
};

const getHastData = (node: { data?: unknown }): HastData => {
  if (!node.data) node.data = {};
  return node.data as HastData;
};

const applyClasses = (node: { data?: unknown }, classes: string[]): void => {
  const data = getHastData(node);
  data.hProperties ??= {};
  const hProperties = data.hProperties;
  hProperties.className = mergeClassNames(hProperties.className, classes);
};

const isCalloutReference = (node: Paragraph['children'][number]): node is LinkReference =>
  node.type === 'linkReference' &&
  typeof node.identifier === 'string' &&
  node.identifier.startsWith('!');

const stripMarkerFromParagraph = (paragraph: Paragraph, fallbackTitle: string): void => {
  let stripped = false;

  if (paragraph.children.length > 0) {
    const firstChild = paragraph.children[0];
    if (isCalloutReference(firstChild)) {
      paragraph.children.shift();
      stripped = true;
      const nextChild = paragraph.children[0];
      if (nextChild?.type === 'text') {
        (nextChild as Text).value = (nextChild as Text).value.replace(/^[+-]?[^\S\n]*/, '');
      }
    }
  }

  if (paragraph.children.length > 1) {
    const firstChild = paragraph.children[0];
    const nextChild = paragraph.children[1];
    if (
      firstChild.type === 'text' &&
      (firstChild as Text).value.trim() === '[' &&
      nextChild.type === 'text' &&
      CALLOUT_MARKER.test((nextChild as Text).value)
    ) {
      paragraph.children.shift();
      stripped = true;
    }
  }

  // Only scan remaining text nodes for a callout marker when the marker
  // was not already removed as a linkReference or bracket-text pattern above.
  // Running this unconditionally would strip leading spaces from body text
  // nodes (e.g. " branch." → "branch.").
  if (!stripped) {
    for (const child of paragraph.children) {
      if (child.type !== 'text') continue;
      const textChild = child as Text;
      const updated = textChild.value.replace(CALLOUT_MARKER, '').replace(/^[^\S\n]+/, '');
      if (updated !== textChild.value) {
        textChild.value = updated;
        stripped = true;
        break;
      }
    }
  }

  if (!stripped) return;

  const hasContent = paragraph.children.some((child) => {
    if (child.type === 'text') return (child as Text).value.trim().length > 0;
    return true;
  });

  if (!hasContent) {
    const textNode: Text = { type: 'text', value: fallbackTitle };
    paragraph.children = [textNode];
  }
};

const splitParagraphAtNewline = (paragraph: Paragraph, fallbackTitle: string): Paragraph | null => {
  const titleChildren: Paragraph['children'] = [];
  const bodyChildren: Paragraph['children'] = [];
  let split = false;

  for (const child of paragraph.children) {
    if (split) {
      bodyChildren.push(child);
      continue;
    }

    // mdsvex may represent line breaks as break/softBreak nodes
    // instead of \n characters inside text nodes.
    if (child.type === 'break') {
      split = true;
      continue;
    }

    if (child.type === 'text') {
      const textChild = child as Text;
      const newlineIndex = textChild.value.indexOf('\n');
      if (newlineIndex !== -1) {
        const before = textChild.value.slice(0, newlineIndex).trimEnd();
        const after = textChild.value.slice(newlineIndex + 1).trimStart();

        if (before) {
          titleChildren.push({ ...textChild, value: before });
        }
        if (after) {
          bodyChildren.push({ ...textChild, value: after });
        }
        split = true;
        continue;
      }
    }

    titleChildren.push(child);
  }

  if (!split) return null;

  paragraph.children = titleChildren.length
    ? titleChildren
    : [{ type: 'text', value: fallbackTitle } as Text];

  if (!bodyChildren.length) return null;

  return { type: 'paragraph', children: bodyChildren };
};

const remarkCallouts: Plugin<[], Root> = () => {
  return function transformer(tree: Node): void {
    const handleBlockquote = (node: Blockquote): void => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const paragraph = firstChild as Paragraph;
      const text = toString(paragraph);
      const match = CALLOUT_PATTERN.exec(text);
      if (!match) return;

      const [, rawVariant, foldIndicator] = match;
      const variant = normalizeVariant(rawVariant);
      const foldable = foldIndicator === '+' || foldIndicator === '-';
      const defaultOpen = foldIndicator === '+';
      const fallbackTitle = toTitle(rawVariant);
      const variantClasses = variationColors[variant] ?? variationColors.note;

      stripMarkerFromParagraph(paragraph, fallbackTitle);
      let bodyParagraph = splitParagraphAtNewline(paragraph, fallbackTitle);

      // When the newline split failed, check if the first remaining child in
      // the paragraph is empty text or a break node — this means the callout
      // marker was on its own line and the remaining children are body content.
      // mdsvex can represent the line break as a break node, a space, or strip
      // it entirely, so splitParagraphAtNewline may not find a split point.
      if (!bodyParagraph && paragraph.children.length > 0) {
        const first = paragraph.children[0];
        const markerWasAlone =
          first.type === 'break' || (first.type === 'text' && !(first as Text).value.trim());

        if (markerWasAlone) {
          const bodyChildren = paragraph.children.filter((child) => {
            if (child.type === 'text' && !(child as Text).value.trim()) return false;
            if (child.type === 'break') return false;
            return true;
          });
          if (bodyChildren.length) {
            bodyParagraph = { type: 'paragraph', children: bodyChildren };
            const textNode: Text = { type: 'text', value: toTitle(rawVariant) };
            paragraph.children = [textNode];
          }
        }
      }

      if (bodyParagraph) {
        node.children.splice(1, 0, bodyParagraph);
      }

      // Check if the title paragraph is just the fallback (variant name).
      // If so, the author didn't provide an explicit title — remove the
      // title paragraph entirely and let the body stand on its own.
      const titleText = toString(paragraph).trim();
      if (titleText === fallbackTitle) {
        node.children.shift();
      } else {
        applyClasses(paragraph, [TITLE_CLASS]);
      }

      applyClasses(node, [BASE_CLASSES, variantClasses]);

      const data = getHastData(node);
      data.hName = 'div';
      data.hProperties ??= {};
      data.hProperties['data-callout'] = variant;
      if (foldable) {
        data.hProperties['data-foldable'] = 'true';
        if (defaultOpen) {
          data.hProperties['data-default-open'] = 'true';
        }
      }
    };

    visit(tree as Root, 'blockquote', handleBlockquote);
  };
};

export default remarkCallouts;
