const ANNOTATION_PATTERNS: readonly RegExp[] = [
  /^\s*\/\/\s*\[!note\s+(.*?)\]\s*$/,
  /^\s*#\s*\[!note\s+(.*?)\]\s*$/,
  /^\s*\/\*\s*\[!note\s+(.*?)\]\s*\*\/\s*$/,
  /^\s*<!--\s*\[!note\s+(.*?)\]\s*-->\s*$/,
];

const INLINE_CODE_PATTERN = /(`[^`\n]+`)/g;

export type ExtractedAnnotations = {
  cleanedCode: string;
  annotations: Map<number, string>;
};

/**
 * Strip annotation comment lines from code. Returns cleaned code and a map
 * of line indices (0-based, in the cleaned output) to annotation text.
 * Each annotation attaches to the code line immediately above it.
 */
export function extractAnnotations(code: string): ExtractedAnnotations {
  const lines = code.split('\n');
  const cleanedLines: string[] = [];
  const annotations = new Map<number, string>();

  for (const line of lines) {
    let annotationText: string | null = null;

    for (const pattern of ANNOTATION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        annotationText = match[1];
        break;
      }
    }

    if (annotationText !== null) {
      const previousIndex = cleanedLines.length - 1;
      if (previousIndex >= 0) {
        annotations.set(previousIndex, annotationText);
      }
      continue;
    }

    cleanedLines.push(line);
  }

  return { cleanedCode: cleanedLines.join('\n'), annotations };
}

/**
 * Escape characters that Svelte would interpret as template syntax.
 * Used for annotation text injected after escapeSvelte has already run.
 */
function escapeAnnotationText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/`/g, '&#96;');
}

/**
 * Render annotation text as safe HTML, preserving backtick-delimited inline code.
 */
export function renderAnnotationHtml(text: string): string {
  return text
    .split(INLINE_CODE_PATTERN)
    .map((segment) => {
      if (segment.startsWith('`') && segment.endsWith('`')) {
        return `<code>${escapeAnnotationText(segment.slice(1, -1))}</code>`;
      }

      return escapeAnnotationText(segment);
    })
    .join('');
}

/**
 * Inject annotation HTML elements after the specified lines in Shiki output.
 * Splits on <span class="line"> boundaries and inserts annotation spans.
 */
export function injectAnnotations(html: string, annotations: Map<number, string>): string {
  if (annotations.size === 0) return html;

  const parts = html.split(/(?=<span class="line">)/);
  const result: string[] = [];
  let lineIndex = 0;

  const renderAnnotation = (annotation: string): string =>
    `<span class="code-annotation"><span class="code-annotation-indicator">Note</span> ${renderAnnotationHtml(annotation)}</span>`;

  for (const part of parts) {
    if (part.startsWith('<span class="line">')) {
      if (lineIndex > 0) {
        const annotation = annotations.get(lineIndex - 1);
        if (annotation !== undefined) {
          result.push(renderAnnotation(annotation));
        }
      }
      lineIndex++;
    }

    result.push(part);
  }

  const lastAnnotation = annotations.get(lineIndex - 1);
  if (lastAnnotation !== undefined) {
    const lastIndex = result.length - 1;
    result[lastIndex] = result[lastIndex].replace(
      '</code></pre>',
      `${renderAnnotation(lastAnnotation)}</code></pre>`,
    );
  }

  return result.join('');
}
