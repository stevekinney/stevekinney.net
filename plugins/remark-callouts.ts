import type { Blockquote, LinkReference, Paragraph, Root, Text } from 'mdast';
import type { Properties } from 'hast';
import type { Transformer } from 'unified';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

const CALLOUT_PATTERN = /^\s*\[?\s*!\s*([^\]\s+-]+)\s*\]?([+-])?\s*([\s\S]*)$/i;
const CALLOUT_MARKER = /^\s*\[?\s*!\s*[^\]\s+-]+\s*\]?([+-])?\s*/i;

const BASE_CLASSES = 'space-y-2 rounded-md border p-4 shadow-sm';
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
    ? value
    : typeof value === 'string'
      ? value.split(/\s+/).filter(Boolean)
      : [];
  return [...existing, ...next];
};

type HastData = {
  hName?: string;
  hProperties?: Properties & { className?: string | string[] };
};

const getHastData = (node: { data?: unknown }): HastData => {
  if (!node.data) node.data = {};
  return node.data as HastData;
};

const applyClasses = (node: { data?: unknown }, classes: string[]) => {
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
        nextChild.value = nextChild.value.replace(/^\s+/, '');
      }
    }
  }

  if (paragraph.children.length > 1) {
    const firstChild = paragraph.children[0];
    const nextChild = paragraph.children[1];
    if (
      firstChild.type === 'text' &&
      firstChild.value.trim() === '[' &&
      nextChild.type === 'text' &&
      CALLOUT_MARKER.test(nextChild.value)
    ) {
      paragraph.children.shift();
      stripped = true;
    }
  }

  for (const child of paragraph.children) {
    if (child.type !== 'text') continue;
    const updated = child.value.replace(CALLOUT_MARKER, '').trimStart();
    if (updated !== child.value) {
      child.value = updated;
      stripped = true;
      break;
    }
  }

  if (!stripped) return;

  const hasContent = paragraph.children.some((child) => {
    if (child.type === 'text') return child.value.trim().length > 0;
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

    if (child.type === 'text') {
      const newlineIndex = child.value.indexOf('\n');
      if (newlineIndex !== -1) {
        const before = child.value.slice(0, newlineIndex).trimEnd();
        const after = child.value.slice(newlineIndex + 1).trimStart();

        if (before) {
          titleChildren.push({ ...child, value: before });
        }
        if (after) {
          bodyChildren.push({ ...child, value: after });
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
    : [{ type: 'text', value: fallbackTitle }];

  if (!bodyChildren.length) return null;

  return { type: 'paragraph', children: bodyChildren };
};

export default function remarkCallouts(): Transformer<Root> {
  return function transformer(tree) {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const text = toString(firstChild);
      const match = CALLOUT_PATTERN.exec(text);
      if (!match) return;

      const [, rawVariant, foldIndicator, rawTitle] = match;
      const variant = normalizeVariant(rawVariant);
      const foldable = foldIndicator === '+' || foldIndicator === '-';
      const defaultOpen = foldIndicator === '+';
      const fallbackTitle = rawTitle.trim() || toTitle(rawVariant);
      const variantClasses = variationColors[variant] ?? variationColors.note;

      stripMarkerFromParagraph(firstChild, fallbackTitle);
      const bodyParagraph = splitParagraphAtNewline(firstChild, fallbackTitle);
      if (bodyParagraph) {
        node.children.splice(1, 0, bodyParagraph);
      }

      applyClasses(firstChild, [TITLE_CLASS]);
      applyClasses(node, [BASE_CLASSES, variantClasses]);

      const data = getHastData(node);
      data.hName = 'div';
      data.hProperties ??= {};
      data.hProperties['data-callout'] = variant;
      if (foldable) {
        data.hProperties['data-foldable'] = '';
        if (defaultOpen) {
          data.hProperties['data-default-open'] = '';
        }
      }
    });
  };
}
