import { readFileSync } from 'node:fs';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const template = readFileSync(join(__dirname, './tailwind-template.html'), 'utf-8');

/**
 * Converts a code snippet into a Tailwind CSS playground component.
 * The code is wrapped in a TailwindExample component with the provided HTML template.
 *
 * @param {string} code - The code snippet to be converted.
 * @param {string} [codeBlock] - Optional code block metadata (not used in this function).
 * @returns {string} - The HTML string for the TailwindExample component.
 */
export function toTailwindPlayground(code, codeBlock) {
  const html = template.replace('<!--CONTENT-->', code);
  const encoded = Buffer.from(html).toString('base64');
  const dataUrl = `data:text/html;base64,${encoded}`;

  return `<TailwindExample code="${dataUrl}">${codeBlock}</TailwindExample>`;
}
