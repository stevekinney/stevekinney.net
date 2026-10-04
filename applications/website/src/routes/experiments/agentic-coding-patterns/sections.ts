export type Heading = {
  level: number;
  text: string;
  /** The index of the heading's own line. */
  line: number;
};

const headingPattern = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*$/;
const fencePattern = /^ {0,3}(`{3,}|~{3,})/;

/** Lowercases a heading and drops emphasis and a trailing colon, so `**TL;DR:**` matches `tl;dr`. */
export const normalizeHeading = (text: string): string =>
  text
    .replace(/[*_`]/g, '')
    .replace(/[ \t]+#+$/, '')
    .replace(/:$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Finds every heading outside fenced code, since a `# comment` in a code block isn't one. */
export const findHeadings = (lines: string[]): Heading[] => {
  const headings: Heading[] = [];
  let fence: string | null = null;

  lines.forEach((line, index) => {
    const opening = fencePattern.exec(line);

    if (fence) {
      if (opening && opening[1]?.[0] === fence[0] && (opening[1]?.length ?? 0) >= fence.length) {
        fence = null;
      }

      return;
    }

    if (opening) {
      fence = opening[1] ?? null;

      return;
    }

    const heading = headingPattern.exec(line);
    if (heading) {
      headings.push({
        level: heading[1]?.length ?? 1,
        text: (heading[2] ?? '').replace(/[ \t]+#+$/, ''),
        line: index,
      });
    }
  });

  return headings;
};

/**
 * Returns a section's content: the lines under the first heading whose text
 * matches, up to the next heading of the same or a higher level. The heading
 * can be at any level, because some notes nest everything under a `##` title
 * and use `###` for the sections. Headings further down the note that repeat
 * the text, such as in follow-up research, are ignored. Returns `null` when
 * no heading matches.
 */
export const extractSection = (
  lines: string[],
  headings: Heading[],
  headingText: string,
): string | null => {
  const wanted = normalizeHeading(headingText);
  const position = headings.findIndex((heading) => normalizeHeading(heading.text) === wanted);
  if (position === -1) return null;

  const heading = headings[position];
  if (!heading) return null;

  const next = headings.slice(position + 1).find((candidate) => candidate.level <= heading.level);
  const content = lines.slice(heading.line + 1, next ? next.line : lines.length);

  return content.join('\n').trim();
};
