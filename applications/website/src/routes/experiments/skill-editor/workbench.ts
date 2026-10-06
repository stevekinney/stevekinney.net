import { Document, isMap, parseDocument, stringify } from 'yaml';

import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
import { readFrontmatterFile, writeFrontmatterFile } from '$lib/experiments/frontmatter-file';
import {
  claudeSkillFrontmatterSchema,
  codexSkillFrontmatterSchema,
  openaiConfigurationSchema,
  validateSkillMetadata,
} from '@lostgradient/skillset';

import {
  blankDocument,
  claudeOnlyKeys,
  detectTarget,
  effectiveDirectory,
  isEmptyValue,
  isMapping,
  pruneEmpty,
} from './skill-document';
import type {
  DraftKey,
  ExportFile,
  SkillDocument,
  SkillIssue,
  SkillResults,
  Target,
} from './skill-document';
import { fields, getIn, readList, skillKeyOrder } from './skill-fields';

/**
 * Everything that needs a library: reading files, writing them back, and
 * validating with skillset. The page loads this with `import()` after mount,
 * and the server imports it to prerender the sample's results.
 */

export type LoadedFile = { path: string; text: string };

export type LoadResult =
  | {
      ok: true;
      document: SkillDocument;
      /** The target the files are for, or null when they don't say. */
      target: Target | null;
      /** Whether the undocumented `disallowedTools` alias was folded into `disallowed-tools`. */
      foldedAlias: boolean;
    }
  | { ok: false; message: string };

export type DraftResult = { ok: true; value: unknown } | { ok: false; message: string };

/** YAML errors quote the offending lines after the first; the first says enough, as a sentence. */
const firstLine = (message = 'parse error'): string => {
  const line = (message.split('\n')[0] ?? message).trim().replace(/:$/, '');

  return line.endsWith('.') ? line : `${line}.`;
};

const sameValue = (first: unknown, second: unknown): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

// Parsing the loaded SKILL.md for every export would be wasteful, so the last one is kept.
let cachedSource: { text: string; document: Document | null } | null = null;

const sourceDocument = (text: string | null): Document | null => {
  if (text === null) return null;
  if (cachedSource?.text !== text) {
    const result = readFrontmatterFile(text);
    cachedSource = { text, document: result.ok ? result.document : null };
  }

  return cachedSource.document;
};

/** Writes a value as the YAML text a structured field edits. Empty values give blank text. */
const toDraft = (value: unknown): string =>
  isEmptyValue(value) ? '' : stringify(value, { lineWidth: 0 });

const metadataDraft = (metadata: unknown): string => {
  if (!isMapping(metadata)) return toDraft(metadata);

  return toDraft(
    Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'short-description')),
  );
};

const draftsFor = (frontmatter: Record<string, unknown>): SkillDocument['drafts'] => ({
  hooks: toDraft(frontmatter.hooks),
  metadata: metadataDraft(frontmatter.metadata),
});

/**
 * Folds the undocumented `disallowedTools` alias into `disallowed-tools`,
 * where the alias sat if `disallowed-tools` wasn't there.
 */
const foldAlias = (frontmatter: Record<string, unknown>): Record<string, unknown> => {
  if (!('disallowedTools' in frontmatter)) return frontmatter;

  const alias = frontmatter.disallowedTools;
  const hasDocumented = 'disallowed-tools' in frontmatter;
  const merged = hasDocumented
    ? [
        ...new Set([
          ...readList(frontmatter['disallowed-tools'], 'tools'),
          ...readList(alias, 'tools'),
        ]),
      ]
    : alias;

  return Object.fromEntries(
    Object.entries(frontmatter).flatMap(([key, value]): [string, unknown][] => {
      if (key === 'disallowed-tools') return [[key, merged]];
      if (key === 'disallowedTools') return hasDocumented ? [] : [['disallowed-tools', merged]];

      return [[key, value]];
    }),
  );
};

const parseOpenai = (
  file: LoadedFile,
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } => {
  const document = parseDocument(file.text);
  if (document.errors.length > 0) {
    return {
      ok: false,
      message: `\`${file.path}\` isn’t valid YAML: ${firstLine(document.errors[0]?.message)}`,
    };
  }

  const value: unknown = document.toJS() ?? {};
  if (!isMapping(value)) {
    return { ok: false, message: `\`${file.path}\` has to be a set of \`key: value\` lines.` };
  }

  return { ok: true, value };
};

/**
 * Reads a SKILL.md, an `agents/openai.yaml`, or both into a document. With
 * only an `openai.yaml`, it replaces that part of `current`. A file that
 * doesn't parse fails the whole load, so the current document stays as it was.
 */
export const readSkillFiles = (
  {
    skill,
    openai,
    directoryName,
  }: { skill: LoadedFile | null; openai: LoadedFile | null; directoryName: string | null },
  current: SkillDocument = blankDocument(),
): LoadResult => {
  let openaiValues: Record<string, unknown> = {};
  if (openai) {
    const parsed = parseOpenai(openai);
    if (!parsed.ok) return parsed;
    openaiValues = parsed.value;
  }

  if (!skill) {
    if (!openai) return { ok: false, message: 'That didn’t include a `SKILL.md`.' };

    return {
      ok: true,
      document: {
        ...current,
        openai: openaiValues,
        source: { ...current.source, openai: openai.text },
      },
      target: 'codex',
      foldedAlias: false,
    };
  }

  const read = readFrontmatterFile(skill.text);
  if (!read.ok) return { ok: false, message: `\`${skill.path}\`: ${firstLine(read.message)}` };

  const frontmatter = foldAlias(read.values);

  return {
    ok: true,
    document: {
      directoryName,
      frontmatter,
      body: read.body,
      openai: openaiValues,
      drafts: draftsFor(frontmatter),
      source: { skill: skill.text, openai: openai?.text ?? null },
    },
    target: detectTarget(frontmatter, openai !== null),
    foldedAlias: frontmatter !== read.values,
  };
};

/** Parses a structured field's YAML text, checking it has the shape the field needs. */
export const parseDraft = (key: DraftKey, text: string): DraftResult => {
  if (text.trim() === '') return { ok: true, value: undefined };

  const document = parseDocument(text);
  if (document.errors.length > 0) {
    return {
      ok: false,
      message: `This isn’t valid YAML: ${firstLine(document.errors[0]?.message)}`,
    };
  }

  const value: unknown = document.toJS();
  if (!isMapping(value)) {
    return { ok: false, message: 'Write this as YAML `key: value` lines.' };
  }
  if (key === 'metadata' && 'short-description' in value) {
    return {
      ok: false,
      message: 'The short description has its own field. Set it there instead.',
    };
  }

  return { ok: true, value };
};

/** Puts known keys in field order and keeps everything else after them, as it was. */
const inKeyOrder = (values: Record<string, unknown>): Record<string, unknown> => {
  const ordered: Record<string, unknown> = {};
  for (const key of skillKeyOrder) if (key in values) ordered[key] = values[key];
  for (const [key, value] of Object.entries(values)) if (!(key in ordered)) ordered[key] = value;

  return ordered;
};

const openaiKeyOrder = fields
  .filter((field) => field.file === 'openai')
  .map((field) => field.key.split('.'));

/** Orders `agents/openai.yaml` the way the fields are listed: interface, policy, dependencies. */
const inOpenaiOrder = (values: Record<string, unknown>): Record<string, unknown> => {
  const ordered: Record<string, unknown> = {};
  for (const [section, key] of openaiKeyOrder) {
    if (section === undefined || key === undefined) continue;
    const sectionValues = values[section];
    if (!isMapping(sectionValues) || !(key in sectionValues)) continue;
    const target = (ordered[section] ??= {}) as Record<string, unknown>;
    target[key] = sectionValues[key];
  }
  for (const [section, sectionValues] of Object.entries(values)) {
    if (!(section in ordered)) {
      ordered[section] = sectionValues;
    } else if (isMapping(sectionValues)) {
      const target = ordered[section] as Record<string, unknown>;
      for (const [key, value] of Object.entries(sectionValues))
        if (!(key in target)) target[key] = value;
    }
  }

  return ordered;
};

/**
 * Brings a parsed YAML document in line with new values, editing only what
 * changed, so comments and formatting elsewhere survive.
 */
const syncMapping = (
  document: Document,
  path: string[],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): void => {
  for (const key of Object.keys(before)) {
    if (!(key in after)) document.deleteIn([...path, key]);
  }

  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (sameValue(previous, value)) continue;

    if (isMapping(previous) && isMapping(value) && isMap(document.getIn([...path, key], true))) {
      syncMapping(document, [...path, key], previous, value);
    } else {
      document.setIn([...path, key], value);
    }
  }
};

const writeYamlFile = (source: string | null, values: Record<string, unknown>): string => {
  const parsed = source === null ? null : parseDocument(source);
  const document = parsed && parsed.errors.length === 0 ? parsed : new Document({});
  if (!isMap(document.contents)) document.contents = document.createNode({});

  const before: unknown = document.toJS();
  syncMapping(document, [], isMapping(before) ? before : {}, values);

  return document.toString({ lineWidth: 0 });
};

/** The frontmatter a target's export writes: Codex leaves out what only Claude Code reads. */
const valuesFor = (skill: SkillDocument, target: Target): Record<string, unknown> => {
  const values =
    target === 'codex'
      ? Object.fromEntries(
          Object.entries(skill.frontmatter).filter(([key]) => !claudeOnlyKeys.includes(key)),
        )
      : skill.frontmatter;

  return inKeyOrder(values);
};

/** The files to write for a target: SKILL.md, and for Codex an `agents/openai.yaml` when one is set. */
export const exportSkill = (skill: SkillDocument, target: Target): ExportFile[] => {
  const directory = effectiveDirectory(skill);
  const inFolder = (path: string): string => (directory ? `${directory}/${path}` : path);

  const files: ExportFile[] = [
    {
      path: inFolder('SKILL.md'),
      fileName: 'SKILL.md',
      mediaType: 'text/markdown',
      text: writeFrontmatterFile({
        document: sourceDocument(skill.source.skill),
        values: valuesFor(skill, target),
        body: skill.body,
      }),
    },
  ];

  const openai = pruneEmpty(skill.openai);
  if (target === 'codex' && isMapping(openai)) {
    files.push({
      path: inFolder('agents/openai.yaml'),
      fileName: 'openai.yaml',
      mediaType: 'text/yaml',
      text: writeYamlFile(skill.source.openai, inOpenaiOrder(openai)),
    });
  }

  return files;
};

type SchemaIssue = { code: string; path: PropertyKey[]; message: string };

const formatPath = (path: readonly PropertyKey[]): string =>
  path
    .map((segment, index) =>
      typeof segment === 'number' ? `[${segment}]` : `${index === 0 ? '' : '.'}${String(segment)}`,
    )
    .join('');

/** Where a SKILL.md schema problem shows: its field, by the issue's first path segment. */
const skillFieldKey = (path: readonly PropertyKey[]): string =>
  path[0] === 'metadata' && path[1] === 'short-description'
    ? 'metadata.short-description'
    : String(path[0] ?? '');

const openaiFieldKey = (path: readonly PropertyKey[]): string => {
  const key = `${String(path[0] ?? '')}.${String(path[1] ?? '')}`;

  return fields.some((field) => field.file === 'openai' && field.key === key)
    ? key
    : String(path[0] ?? '');
};

const describeSchemaIssue = (
  issue: SchemaIssue,
  values: Record<string, unknown>,
  depth: number,
  target: Target,
): string => {
  const missing = issue.path.length <= depth && getIn(values, issue.path.map(String)) === undefined;
  if (missing && issue.code === 'invalid_type') {
    return target === 'codex' ? 'Codex requires this field.' : 'This field is required.';
  }
  const [section, list, index, key] = issue.path;
  if (
    section === 'dependencies' &&
    list === 'tools' &&
    typeof index === 'number' &&
    typeof key === 'string' &&
    issue.path.length === 4 &&
    issue.code === 'invalid_type'
  ) {
    const entries = getIn(values, ['dependencies', 'tools']);
    const entry: unknown = Array.isArray(entries) ? entries[index] : undefined;
    if (isMapping(entry) && entry[key] === undefined) {
      return `Tool ${index + 1} needs a \`${key}\`.`;
    }
  }
  if (issue.path[0] === 'effort' && issue.code === 'invalid_union') {
    return 'Use `low`, `medium`, `high`, `xhigh`, or `max`, or a whole number.';
  }

  const rest = issue.path.slice(depth);

  return rest.length > 0 ? `\`${formatPath(rest)}\`: ${issue.message}` : issue.message;
};

const addIssue = (issues: Record<string, FieldIssue[]>, key: string, issue: FieldIssue): void => {
  (issues[key] ??= []).push(issue);
};

const capitalize = (message: string): string => message.charAt(0).toUpperCase() + message.slice(1);

/**
 * Exports and checks a skill for a target. skillset's validator judges the
 * file that would be written; the target's schema puts problems on the field
 * they're about.
 */
export const analyzeSkill = (skill: SkillDocument, target: Target): SkillResults => {
  const files = exportSkill(skill, target);
  const directoryName = effectiveDirectory(skill) || undefined;
  const validation = validateSkillMetadata(files[0]?.text ?? '', { target, directoryName });

  const issues: SkillIssue[] = validation.issues.map((issue) => ({
    severity: issue.severity,
    message: capitalize(issue.message),
  }));
  const fieldIssues: Record<string, FieldIssue[]> = {};

  const schema = target === 'codex' ? codexSkillFrontmatterSchema : claudeSkillFrontmatterSchema;
  const parsed = schema.safeParse(skill.frontmatter);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = skillFieldKey(issue.path);
      const depth = key === 'metadata.short-description' ? 2 : 1;
      addIssue(fieldIssues, key, {
        severity: 'error',
        message: describeSchemaIssue(issue, skill.frontmatter, depth, target),
      });
    }
  }

  const openai = pruneEmpty(skill.openai);
  if (target === 'codex' && isMapping(openai)) {
    const result = openaiConfigurationSchema.safeParse(openai);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = openaiFieldKey(issue.path);
        addIssue(fieldIssues, key, {
          severity: 'error',
          message: describeSchemaIssue(issue, openai, key.split('.').length, target),
        });
        issues.push({
          severity: 'error',
          message: `\`agents/openai.yaml\`: \`${formatPath(issue.path)}\`: ${issue.message}`,
        });
      }
    }
  }

  return {
    target,
    files,
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    fieldIssues,
  };
};
