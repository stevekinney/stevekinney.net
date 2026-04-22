import DOMPurify from 'isomorphic-dompurify';

import type { Config } from 'dompurify';

const DOM_PURIFY_CONFIGURATION = {
  ALLOWED_TAGS: [
    'div',
    'span',
    'p',
    'a',
    'button',
    'input',
    'label',
    'form',
    'select',
    'option',
    'textarea',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'img',
    'svg',
    'path',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'main',
    'aside',
    'code',
    'pre',
    'em',
    'strong',
    'b',
    'i',
    'u',
    'small',
    'mark',
    'del',
    'ins',
    'sub',
    'sup',
    'br',
    'hr',
  ],
  ALLOWED_ATTR: [
    'class',
    'id',
    'href',
    'src',
    'alt',
    'title',
    'type',
    'value',
    'placeholder',
    'for',
    'role',
    'tabindex',
    'name',
    'disabled',
    'checked',
    'selected',
    'rows',
    'cols',
    'readonly',
    'required',
    'multiple',
    'd',
    'viewBox',
    'fill',
    'stroke',
    'width',
    'height',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'xmlns',
    'style',
  ],
} satisfies Config;

export const sanitizeTailwindPlaygroundHtml = (html: string): string =>
  DOMPurify.sanitize(html, DOM_PURIFY_CONFIGURATION);

export const escapeSvelteDelimiters = (html: string): string =>
  html.replace(/[{}`]/g, (character) => {
    return { '{': '&#123;', '}': '&#125;', '`': '&#96;' }[character] ?? character;
  });

export const encodeTailwindPlaygroundHtml = (html: string): string => encodeURIComponent(html);

export const decodeTailwindPlaygroundHtml = (html: string): string => decodeURIComponent(html);

export const buildTailwindPlaygroundSource = (playgrounds: string[]): string => {
  if (playgrounds.length === 0) {
    return '<div class="tailwind-playground-source"></div>\n';
  }

  return `${playgrounds.map((playground) => `${playground}\n`).join('\n')}`;
};
