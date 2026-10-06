import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parseDocument, stringify as stringifyYaml } from 'yaml';
import type { Document } from 'yaml';
import type { z } from 'zod';

import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
import { readFrontmatterFile, writeFrontmatterFile } from '$lib/experiments/frontmatter-file';
import {
  claudeAgentFrontmatterSchema,
  claudeAgentMcpServerSchema,
  codexAgentSchema,
  validateSubagentMetadata,
} from '@lostgradient/skillset';

import { ownChecks } from './checks';
import { emitCodexAgent } from './codex-toml';
import {
  blankDocument,
  claudeValues,
  codexValues,
  effectiveFileName,
  exportFileName,
  fieldPath,
  readValue,
} from './document';
import type { AgentDocument, FieldPath, Target } from './document';
import { fieldDefinitions } from './fields';
import type { FieldDefinition } from './fields';

/**
 * Everything that parses, writes, or validates an agent file. It pulls in
 * skillset, zod, YAML, and TOML, so the page loads it with `import()` after
 * mount, and the server uses it to prerender the sample's answer.
 */

/** A finding about the whole file, as skillset reports it. */
export type VerdictIssue = { severity: 'error' | 'warning'; message: string };

export type AgentReport = {
  target: Target;
  /** The exported file's name, such as `code-reviewer.md`. */
  fileName: string;
  /** The file's full text, as it would be downloaded. */
  text: string;
  issues: VerdictIssue[];
  /** What the target's schema says about each field. */
  fieldIssues: Record<FieldPath, FieldIssue[]>;
};

/** The parsed frontmatter of a loaded `.md` file, so an export keeps its comments and formatting. */
export type ClaudeSource = Document;

type ZodIssue = z.core.$ZodIssue;

/** A branch that failed on the value's own type, such as a string expected where a mapping was given. */
const missesType = (branch: readonly ZodIssue[]): boolean =>
  branch.some((issue) => issue.code === 'invalid_type' && issue.path.length === 0);

/**
 * A zod union failure lists every branch's issues. The branch the value nearly
 * matched is the one worth showing: one whose type fits, with the fewest
 * issues, such as the `http` transport for an entry with `type: http`.
 */
const flattenIssue = (issue: ZodIssue): ZodIssue[] => {
  if (issue.code !== 'invalid_union' || issue.errors.length === 0) return [issue];

  const branches = issue.errors.map((branch) => ({
    issues: branch.flatMap(flattenIssue),
    missesType: missesType(branch),
  }));
  const closest = branches.reduce((best, branch) =>
    Number(branch.missesType) < Number(best.missesType) ||
    (branch.missesType === best.missesType && branch.issues.length < best.issues.length)
      ? branch
      : best,
  );

  return closest.issues.map((inner) => ({ ...inner, path: [...issue.path, ...inner.path] }));
};

const describePath = (path: readonly PropertyKey[]): string =>
  path
    .map((segment, index) =>
      typeof segment === 'number' ? `[${segment}]` : `${index === 0 ? '' : '.'}${String(segment)}`,
    )
    .join('');

const addFieldIssue = (
  record: Record<FieldPath, FieldIssue[]>,
  field: FieldPath,
  issue: FieldIssue,
): void => {
  (record[field] ??= []).push(issue);
};

/** Maps a schema issue to the field that holds its value: `experimental.cacheTtl`, or the top key. */
const claudeField = (path: readonly PropertyKey[]): { field: FieldPath; rest: PropertyKey[] } => {
  const [head, ...rest] = path;
  if (head === 'experimental' && rest[0] === 'cacheTtl') {
    return { field: 'claude.experimental.cacheTtl', rest: rest.slice(1) };
  }

  return { field: fieldPath('claude', String(head ?? '')), rest };
};

const schemaMessage = (rest: readonly PropertyKey[], message: string): string =>
  rest.length > 0 ? `\`${describePath(rest)}\`: ${message}` : message;

const claudeReport = (document: AgentDocument, source: ClaudeSource | null): AgentReport => {
  const values = claudeValues(document);
  const text = writeFrontmatterFile({ document: source, values, body: document.body });
  const fileName = effectiveFileName(document);
  const validation = validateSubagentMetadata(text, fileName ? { fileName } : {});
  const fieldIssues: Record<FieldPath, FieldIssue[]> = {};

  const parsed = claudeAgentFrontmatterSchema.safeParse(values);
  for (const issue of parsed.success ? [] : parsed.error.issues.flatMap(flattenIssue)) {
    const { field, rest } = claudeField(issue.path);
    addFieldIssue(fieldIssues, field, {
      severity: 'error',
      message: schemaMessage(rest, issue.message),
    });
  }

  const servers = values['mcpServers'];
  if (Array.isArray(servers)) {
    servers.forEach((item: unknown, index) => {
      const result = claudeAgentMcpServerSchema.safeParse(item);
      if (result.success) return;

      const details = result.error.issues
        .flatMap(flattenIssue)
        .map((issue) => schemaMessage(issue.path, issue.message))
        .join('; ');
      addFieldIssue(fieldIssues, 'claude.mcpServers', {
        severity: 'warning',
        message: `Item ${index + 1} (${details}). Claude Code drops this item and still loads the agent.`,
      });
    });
  }

  return {
    target: 'claude',
    fileName: exportFileName(document, 'claude'),
    text,
    issues: validation.issues,
    fieldIssues,
  };
};

const codexReport = (document: AgentDocument): AgentReport => {
  const values = codexValues(document);
  const text = emitCodexAgent(values);
  const issues: VerdictIssue[] = [];
  const fieldIssues: Record<FieldPath, FieldIssue[]> = {};

  // Validate the file as written, so a problem in the writer would show up here too.
  let written: Record<string, unknown> = values;
  try {
    written = parseToml(text);
  } catch (cause) {
    issues.push({
      severity: 'error',
      message: `The exported file isn’t valid TOML: ${firstLine(cause)}`,
    });
  }

  const parsed = codexAgentSchema.safeParse(written);
  for (const issue of parsed.success ? [] : parsed.error.issues.flatMap(flattenIssue)) {
    const [head, ...rest] = issue.path;
    issues.push({
      severity: 'error',
      message: `\`${describePath(issue.path)}\`: ${issue.message}`,
    });
    addFieldIssue(fieldIssues, fieldPath('codex', String(head ?? '')), {
      severity: 'error',
      message: schemaMessage(rest, issue.message),
    });
  }

  for (const issue of ownChecks(document, 'codex')) {
    if (issue.verdict && issue.severity !== 'tip') {
      issues.push({ severity: issue.severity, message: issue.message });
    }
  }

  return {
    target: 'codex',
    fileName: exportFileName(document, 'codex'),
    text,
    issues,
    fieldIssues,
  };
};

/** The exported file for one tool, and everything the checks found in it. */
export const buildReport = (
  document: AgentDocument,
  target: Target,
  source: ClaudeSource | null = null,
): AgentReport => (target === 'claude' ? claudeReport(document, source) : codexReport(document));

const firstLine = (cause: unknown): string =>
  (cause instanceof Error ? cause.message : String(cause)).split('\n')[0] ?? '';

const baseName = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.(md|toml)$/i, '');

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);

const withoutKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));

export type LoadedAgent =
  | { ok: true; target: Target; document: AgentDocument; source: ClaudeSource | null }
  | { ok: false; message: string };

/**
 * Reads an agent file into a document: a `.md` file as a Claude Code
 * subagent, a `.toml` file as a Codex agent. Keys the tool doesn't define stay
 * in the document and are written back unchanged.
 */
export const readAgentFile = (path: string, text: string): LoadedAgent => {
  const fileName = baseName(path);

  if (/\.toml$/i.test(path)) {
    let table: Record<string, unknown>;
    try {
      table = parseToml(text);
    } catch (cause) {
      return { ok: false, message: `That file isn’t valid TOML: ${firstLine(cause)}` };
    }

    return {
      ok: true,
      target: 'codex',
      source: null,
      document: {
        ...blankDocument(),
        fileName,
        name: asText(table['name']),
        description: asText(table['description']),
        model: asText(table['model']),
        body: asText(table['developer_instructions']),
        codex: withoutKeys(table, ['name', 'description', 'model', 'developer_instructions']),
      },
    };
  }

  const file = readFrontmatterFile(text);
  if (!file.ok) return { ok: false, message: file.message };

  return {
    ok: true,
    target: 'claude',
    source: file.document,
    document: {
      ...blankDocument(),
      fileName,
      name: asText(file.values['name']),
      description: asText(file.values['description']),
      model: asText(file.values['model']),
      body: file.body,
      claude: withoutKeys(file.values, ['name', 'description', 'model']),
    },
  };
};

const structuredFields = fieldDefinitions.filter((field) => field.kind === 'structured');

const fieldId = (field: FieldDefinition): FieldPath => fieldPath(field.target, field.key);

/** The text a structured field shows for a value: YAML for Claude Code, a TOML table for Codex. */
export const structuredText = (field: FieldDefinition, value: unknown): string => {
  if (value === undefined) return '';

  return field.format === 'toml'
    ? stringifyToml({ [field.key]: value }).trim()
    : stringifyYaml(value, { lineWidth: 0 }).trimEnd();
};

/** The text of every structured field that holds a value, keyed by field. */
export const structuredDrafts = (document: AgentDocument): Record<FieldPath, string> =>
  Object.fromEntries(
    structuredFields.flatMap((field) => {
      const value = readValue(document, field.target, field.key);

      return value === undefined ? [] : [[fieldId(field), structuredText(field, value)]];
    }),
  );

export type StructuredParse = { ok: true; value: unknown } | { ok: false; message: string };

/** Parses what the person typed into a structured field. Blank means the key is left out. */
export const parseStructured = (field: FieldDefinition, text: string): StructuredParse => {
  if (text.trim().length === 0) return { ok: true, value: undefined };

  if (field.format === 'toml') {
    let table: Record<string, unknown>;
    try {
      table = parseToml(text);
    } catch (cause) {
      return { ok: false, message: `This isn’t valid TOML: ${firstLine(cause)}` };
    }

    const others = Object.keys(table).filter((key) => key !== field.key);
    if (others.length > 0) {
      return {
        ok: false,
        message: `Start every table header with \`${field.key}\`, as in \`[${field.key}]\` or \`[${field.key}.name]\`. Found: ${others.map((key) => `\`${key}\``).join(', ')}.`,
      };
    }

    return { ok: true, value: table[field.key] };
  }

  const parsed = parseDocument(text);
  if (parsed.errors.length > 0) {
    return {
      ok: false,
      message: `This isn’t valid YAML: ${firstLine(parsed.errors[0]?.message ?? 'parse error')}`,
    };
  }

  return { ok: true, value: parsed.toJS() ?? undefined };
};
