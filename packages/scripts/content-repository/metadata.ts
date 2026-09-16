import { toString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import { parseDocument, isMap, isScalar, isPair, type Document, type Pair } from 'yaml';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import {
  classifyContentSource,
  toDateString,
  type ContentSourceKind,
} from '@stevekinney/utilities/frontmatter';

export type Metadata = {
  title?: string;
  description?: string;
  date?: string;
};

export type MetadataIssue = {
  file: string;
  message: string;
  line?: number;
  severity?: 'error' | 'warning';
  field?: string;
  fixable?: boolean;
};

export type MetadataOptions = {
  file: string;
  kind?: ContentSourceKind | null;
  publicationDate?: string;
  titleCandidates?: string[];
};

export type MetadataResult = {
  metadata: Metadata;
  normalizedSource: string;
  issues: MetadataIssue[];
};

type SourceEdit = { start: number; end: number; replacement: string };

const yamlKeys = new Set(['title', 'description', 'date']);
const obsoleteKeys = new Set(['modified', 'tags', 'status', 'exclude', 'published', 'layout']);
const markdownParser = unified().use(remarkParse);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/gu, ' ').trim();
const codePointLength = (value: string): number => [...value].length;

const frontmatterBounds = (
  source: string,
): { start: number; end: number; yaml: string; body: string } | null => {
  const match = /^(\uFEFF?)(---)[ \t]*(?:\r?\n|$)/u.exec(source);
  if (!match) return null;
  const openingEnd = match[0].length;
  const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/gmu;
  closing.lastIndex = openingEnd;
  const found = closing.exec(source);
  if (!found) return null;
  return {
    start: openingEnd,
    end: found.index,
    yaml: source.slice(openingEnd, found.index),
    body: source.slice(found.index + found[0].length),
  };
};

const frontmatterFenceRepairs = (
  source: string,
  bounds: { end: number },
): { edits: SourceEdit[]; issues: string[] } => {
  const edits: SourceEdit[] = [];
  const issues: string[] = [];
  const opening = /^(\uFEFF?)(---)([ \t]*)(\r?\n|$)/u.exec(source);
  if (opening?.[1]) {
    edits.push({ start: 0, end: 1, replacement: '' });
    issues.push('Opening frontmatter fence contains a BOM; normalize it.');
  }
  if (opening?.[3]) {
    const start = opening[1].length + opening[2].length;
    edits.push({ start, end: start + opening[3].length, replacement: '' });
    issues.push('Opening frontmatter fence has trailing whitespace; normalize it.');
  }
  const closing = /^(---|\.\.\.)([ \t]*)(\r?\n|$)/u.exec(source.slice(bounds.end));
  if (closing) {
    if (closing[1] !== '---') {
      edits.push({ start: bounds.end, end: bounds.end + closing[1].length, replacement: '---' });
      issues.push("Closing frontmatter marker must be '---'; normalize it.");
    }
    if (closing[2]) {
      const start = bounds.end + closing[1].length;
      edits.push({ start, end: start + closing[2].length, replacement: '' });
      issues.push('Closing frontmatter fence has trailing whitespace; normalize it.');
    }
  }
  return { edits, issues };
};

const scalarValue = (pair: Pair<unknown, unknown> | undefined): string | undefined => {
  if (!pair || !isScalar(pair.value) || typeof pair.value.value !== 'string') return undefined;
  return pair.value.value;
};

const mapPairs = (document: Document): Pair<unknown, unknown>[] => {
  if (!isMap(document.contents)) return [];
  return document.contents.items.filter(isPair) as Pair<unknown, unknown>[];
};

const keyName = (pair: Pair<unknown, unknown>): string | undefined =>
  isScalar(pair.key) && typeof pair.key.value === 'string' ? pair.key.value : undefined;

const validDate = (value: string): string | null => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (dateOnly) return toDateString(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/u.test(value))
    return null;
  return toDateString(value);
};

const scalarSource = (value: string, original: string): string => {
  const quote = original.trimStart()[0];
  if (quote === "'") return `'${value.replace(/'/gu, "''")}'`;
  if (quote === '"') return JSON.stringify(value);
  const safePlain =
    /^[A-Za-z0-9_./-]+$/u.test(value) &&
    !/^(?:true|false|null|yes|no|[-+]?\d+(?:\.\d+)?)$/iu.test(value);
  return safePlain ? value : JSON.stringify(value);
};

const leadingHeading = (body: string): string | undefined => {
  const tree = markdownParser.parse(body);
  const headings = tree.children.filter((node) => node.type === 'heading' && node.depth === 1);
  if (headings.length !== 1 || tree.children[0] !== headings[0]) return undefined;
  return normalizeWhitespace(toString(headings[0]));
};

const containsMarkdownMarkup = (value: string): boolean => {
  const tree = markdownParser.parse(value);
  let markup = false;
  visit(tree, (node) => {
    if (!['root', 'paragraph', 'text'].includes(node.type)) markup = true;
  });
  return markup;
};

const issue = (
  file: string,
  message: string,
  field?: string,
  extra: Partial<MetadataIssue> = {},
): MetadataIssue => ({ file, message, ...(field ? { field } : {}), ...extra });

/** Normalize supported content metadata while preserving untouched source bytes. */
export const normalizeContentMetadata = (raw: string, options: MetadataOptions): MetadataResult => {
  const kind = classifyContentSource(options.file) ?? options.kind ?? null;
  if (!kind) return { metadata: {}, normalizedSource: raw, issues: [] };
  const bounds = frontmatterBounds(raw);
  if (!bounds)
    return {
      metadata: {},
      normalizedSource: raw,
      issues: [issue(options.file, 'Missing or malformed YAML frontmatter.')],
    };
  const fenceRepairs = frontmatterFenceRepairs(raw, bounds);

  let document: Document;
  try {
    document = parseDocument(bounds.yaml, {
      schema: 'core',
      uniqueKeys: true,
      keepSourceTokens: true,
    });
  } catch (error) {
    return {
      metadata: {},
      normalizedSource: raw,
      issues: [issue(options.file, `Invalid YAML frontmatter: ${(error as Error).message}`)],
    };
  }
  if (document.errors.length > 0) {
    return {
      metadata: {},
      normalizedSource: raw,
      issues: document.errors.map((error) =>
        issue(options.file, `Invalid YAML frontmatter: ${error.message}`),
      ),
    };
  }

  if (!isMap(document.contents)) {
    return {
      metadata: {},
      normalizedSource: raw,
      issues: [issue(options.file, 'Frontmatter must be a mapping/object.')],
    };
  }
  const pairs = mapPairs(document);
  const known = new Map<string, Pair<unknown, unknown>>();
  const issues: MetadataIssue[] = fenceRepairs.issues.map((message) =>
    issue(options.file, message, undefined, { fixable: true }),
  );
  const edits: SourceEdit[] = [];
  const isFlowMap = isMap(document.contents) && document.contents.flow === true;
  for (const pair of pairs) {
    const key = keyName(pair);
    if (!key) {
      issues.push(issue(options.file, 'Frontmatter keys must be strings.'));
      continue;
    }
    if (known.has(key)) {
      issues.push(issue(options.file, `Duplicate frontmatter key '${key}'.`, key));
      continue;
    }
    known.set(key, pair);
    const obsolete =
      obsoleteKeys.has(key) ||
      (key === 'url' && kind === 'course') ||
      (key === 'date' && kind === 'lesson');
    if (isFlowMap && obsolete)
      issues.push(
        issue(
          options.file,
          `Cannot safely remove obsolete field '${key}' from flow-style frontmatter; convert it to block YAML first.`,
          key,
        ),
      );
    if (!yamlKeys.has(key) && !obsolete)
      issues.push(issue(options.file, `Unknown frontmatter field '${key}'.`, key));
    if (
      obsolete &&
      pair.key &&
      pair.value &&
      (pair.key as { range?: [number, number] }).range &&
      (pair.value as { range?: [number, number] }).range
    ) {
      const start = (pair.key as { range: [number, number] }).range[0];
      let end = (pair.value as { range: [number, number] }).range[1];
      if (bounds.yaml.slice(end, end + 2).startsWith('\r\n')) end += 2;
      else if (bounds.yaml[end] === '\n') end += 1;
      const lineStart = bounds.yaml.lastIndexOf('\n', start - 1) + 1;
      edits.push({
        start: lineStart,
        end,
        replacement: '',
      });
      issues.push(
        issue(options.file, `Removed obsolete frontmatter field '${key}'.`, key, {
          fixable: true,
        }),
      );
    }
  }
  if (issues.some((entry) => !entry.fixable))
    return { metadata: {}, normalizedSource: raw, issues };

  const metadata: Metadata = {};
  const invalidFields = new Set<string>();
  for (const field of yamlKeys) {
    if (field === 'date' && kind === 'lesson') continue;
    const pair = known.get(field);
    const value = scalarValue(pair);
    const authoredNull =
      pair?.value &&
      isScalar(pair.value) &&
      pair.value.range &&
      /^(?:null|~)$/iu.test(bounds.yaml.slice(pair.value.range[0], pair.value.range[1]).trim());
    if (
      pair &&
      pair.value &&
      (!isScalar(pair.value) ||
        (pair.value.value !== null && typeof pair.value.value !== 'string') ||
        authoredNull)
    ) {
      issues.push(issue(options.file, `Frontmatter '${field}' must be a string.`, field));
      invalidFields.add(field);
      continue;
    }
    if (value !== undefined && value.trim() !== '')
      metadata[field as keyof Metadata] = normalizeWhitespace(value);
    if (value !== undefined && pair?.value && isScalar(pair.value) && pair.value.range) {
      const normalized: string | null =
        field === 'date' ? validDate(value.trim()) : normalizeWhitespace(value);
      if (field === 'date' && value.trim() !== '' && normalized === null) {
        issues.push(
          issue(
            options.file,
            `Invalid '${field}' value. Use YYYY-MM-DD or a zoned ISO datetime.`,
            field,
          ),
        );
      } else if (normalized !== null && normalized !== value) {
        const range = pair.value.range;
        const original = bounds.yaml.slice(range[0], range[1]);
        edits.push({
          start: range[0],
          end: range[1],
          replacement:
            scalarSource(normalized, original) +
            (original.endsWith('\r\n') ? '\r\n' : original.endsWith('\n') ? '\n' : ''),
        });
        metadata[field as keyof Metadata] = normalized;
        issues.push(
          issue(options.file, `Normalized '${field}' whitespace or date value.`, field, {
            fixable: true,
          }),
        );
      }
      if (field === 'description' && containsMarkdownMarkup(value)) {
        issues.push(
          issue(
            options.file,
            'Description contains markup and cannot be safely normalized.',
            field,
          ),
        );
      }
    }
  }

  const candidates = [...(options.titleCandidates ?? [])];
  if (!metadata.title && !invalidFields.has('title')) {
    const heading = leadingHeading(bounds.body);
    if (heading) candidates.push(heading);
    const uniqueCandidates = [...new Set(candidates.map(normalizeWhitespace).filter(Boolean))];
    if (uniqueCandidates.length === 1) {
      metadata.title = uniqueCandidates[0];
      const existingTitle = known.get('title');
      if (existingTitle?.value && isScalar(existingTitle.value) && existingTitle.value.range) {
        edits.push({
          start: existingTitle.value.range[0],
          end: existingTitle.value.range[1],
          replacement:
            (existingTitle.value.range[0] === existingTitle.value.range[1] ? ' ' : '') +
            scalarSource(
              metadata.title,
              bounds.yaml.slice(existingTitle.value.range[0], existingTitle.value.range[1]),
            ),
        });
      } else {
        const newline = bounds.yaml.includes('\r\n') ? '\r\n' : '\n';
        edits.push({
          start: 0,
          end: 0,
          replacement: `title: ${scalarSource(metadata.title, '')}${newline}`,
        });
      }
      issues.push(issue(options.file, "Recovered missing 'title'.", 'title', { fixable: true }));
    } else if (uniqueCandidates.length > 1)
      issues.push(
        issue(
          options.file,
          `Conflicting title candidates: ${uniqueCandidates.join(', ')}.`,
          'title',
        ),
      );
  }
  if (metadata.title && codePointLength(metadata.title) > 60)
    issues.push(
      issue(options.file, 'Title exceeds 60 Unicode code points.', 'title', {
        severity: 'warning',
      }),
    );
  if (metadata.description && codePointLength(metadata.description) > 160)
    issues.push(issue(options.file, 'Description exceeds 160 Unicode code points.', 'description'));

  const required =
    kind === 'lesson'
      ? ['title', 'description']
      : kind === 'writing' || kind === 'course'
        ? ['title', 'description', 'date']
        : [];
  for (const field of required) {
    if (metadata[field as keyof Metadata]) continue;
    if (field === 'date' && options.publicationDate) {
      const normalized = validDate(options.publicationDate);
      if (normalized) {
        metadata.date = normalized;
        const existingDate = known.get('date');
        if (existingDate?.value && isScalar(existingDate.value) && existingDate.value.range) {
          edits.push({
            start: existingDate.value.range[0],
            end: existingDate.value.range[1],
            replacement:
              (existingDate.value.range[0] === existingDate.value.range[1] ? ' ' : '') +
              scalarSource(
                normalized,
                bounds.yaml.slice(existingDate.value.range[0], existingDate.value.range[1]),
              ),
          });
        } else {
          const newline = bounds.yaml.includes('\r\n') ? '\r\n' : '\n';
          edits.push({ start: 0, end: 0, replacement: `date: ${normalized}${newline}` });
        }
        issues.push(
          issue(options.file, "Backfilled missing 'date' from publication date.", 'date', {
            fixable: true,
          }),
        );
        continue;
      }
    }
    issues.push(issue(options.file, `Missing required '${field}' frontmatter.`, field));
  }

  if (issues.some((entry) => entry.severity !== 'warning' && !entry.fixable))
    return { metadata, normalizedSource: raw, issues };
  const sourceEdits = [
    ...fenceRepairs.edits,
    ...edits.map((edit) => ({
      ...edit,
      start: edit.start + bounds.start,
      end: edit.end + bounds.start,
    })),
  ];
  const normalizedSource = sourceEdits
    .sort((left, right) => right.start - left.start)
    .reduce(
      (value, edit) => value.slice(0, edit.start) + edit.replacement + value.slice(edit.end),
      raw,
    );
  const reparsedBounds = frontmatterBounds(normalizedSource);
  if (!reparsedBounds)
    return {
      metadata,
      normalizedSource: raw,
      issues: [
        ...issues,
        issue(
          options.file,
          'Refused normalization because the edited frontmatter could not be reparsed.',
        ),
      ],
    };
  const reparsed = parseDocument(reparsedBounds.yaml, { schema: 'core', uniqueKeys: true });
  const reparsedPairs = isMap(reparsed.contents) ? mapPairs(reparsed) : [];
  const reparsedValues = new Map(reparsedPairs.map((pair) => [keyName(pair), scalarValue(pair)]));
  const safe =
    reparsed.errors.length === 0 &&
    [...Object.entries(metadata)].every(([field, value]) => reparsedValues.get(field) === value);
  if (!safe)
    return {
      metadata,
      normalizedSource: raw,
      issues: [
        ...issues,
        issue(
          options.file,
          'Refused normalization because edited metadata did not round-trip safely.',
        ),
      ],
    };
  return { metadata, normalizedSource, issues };
};

/** Find descriptions that collide after case and whitespace normalization. */
export const validateDuplicateDescriptions = (
  entries: { file: string; description: string }[],
): MetadataIssue[] => {
  const groups = new Map<string, string[]>();
  for (const entry of entries) {
    const key = normalizeWhitespace(entry.description).toLocaleLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), entry.file]);
  }
  return [...groups.values()]
    .filter((files) => files.length > 1)
    .flatMap((files) =>
      files.map((file) =>
        issue(
          file,
          `Duplicate description also used by: ${files.filter((other) => other !== file).join(', ')}.`,
          'description',
        ),
      ),
    );
};
