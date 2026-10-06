import type { SourceFile } from '$lib/experiments/dropped-files';
import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';

/**
 * The skill editor's document and the rules for what each tool reads. Nothing
 * here imports a library, so the page can load it up front; parsing, writing,
 * and validating live in `workbench.ts`, which loads after mount.
 */

export type Target = 'claude' | 'codex';

export const targetNames: Record<Target, string> = { claude: 'Claude Code', codex: 'Codex' };

/** The structured fields, which are edited as YAML text. */
export type DraftKey = 'hooks' | 'metadata';

export const draftKeys: readonly DraftKey[] = ['hooks', 'metadata'];

/**
 * One skill, whichever tool it's for. Switching targets changes what's shown,
 * checked, and exported, never this.
 */
export type SkillDocument = {
  /** The folder SKILL.md sits in. Null means it follows `name`. */
  directoryName: string | null;
  /**
   * SKILL.md's frontmatter as loaded, with the person's edits applied. Untouched
   * values keep their original form, such as `allowed-tools` written as one
   * string, so an unchanged file exports byte for byte.
   */
  frontmatter: Record<string, unknown>;
  body: string;
  /** `agents/openai.yaml` as loaded, with edits. Empty when there's none. */
  openai: Record<string, unknown>;
  /** The YAML text of each structured field, which can be mid-edit and invalid. */
  drafts: Record<DraftKey, string>;
  /** The files as loaded, so an export keeps their comments and formatting. */
  source: { skill: string | null; openai: string | null };
};

/** A finding from skillset about the whole file. */
export type SkillIssue = { severity: 'error' | 'warning'; message: string };

export type ExportFile = {
  /** Where the file goes inside the skill's folder, such as `release-notes/agents/openai.yaml`. */
  path: string;
  /** The name it downloads as. */
  fileName: string;
  text: string;
  mediaType: string;
};

/** What the workbench reports for a document and a target. */
export type SkillResults = {
  target: Target;
  files: ExportFile[];
  valid: boolean;
  issues: SkillIssue[];
  /** Schema problems, keyed by field key. */
  fieldIssues: Record<string, FieldIssue[]>;
};

/** The enum values the page offers, read from skillset's schemas on the server. */
export type SkillOptions = {
  context: string[];
  shell: string[];
  effort: string[];
  products: string[];
};

/** The two keys Codex requires, which Claude Code also reads. */
export const sharedKeys = ['name', 'description'] as const;

/** Keys from the agentskills.io standard. Both tools accept them. */
export const specKeys = ['license', 'compatibility', 'metadata', 'allowed-tools', 'arguments'];

/** Keys only Claude Code reads. A Codex export leaves them out. */
export const claudeOnlyKeys = [
  'when_to_use',
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',
  'disallowed-tools',
  'disallowedTools',
  'model',
  'effort',
  'context',
  'agent',
  'background',
  'hooks',
  'paths',
  'shell',
];

const knownKeys = new Set<string>([...sharedKeys, ...specKeys, ...claudeOnlyKeys]);

export const blankDocument = (): SkillDocument => ({
  directoryName: null,
  frontmatter: {},
  body: '',
  openai: {},
  drafts: { hooks: '', metadata: '' },
  source: { skill: null, openai: null },
});

export const isMapping = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Blank strings, empty lists, and empty mappings, which an export leaves out. */
export const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isMapping(value) && Object.keys(value).length === 0);

/** Drops empty values at every depth. Returns undefined when nothing is left. */
export const pruneEmpty = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const items = value.map(pruneEmpty).filter((item) => item !== undefined);

    return items.length > 0 ? items : undefined;
  }

  if (isMapping(value)) {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, pruneEmpty(item)] as const)
      .filter(([, item]) => item !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return isEmptyValue(value) ? undefined : value;
};

/** The skill's folder: the one set, or else its name. */
export const effectiveDirectory = (skill: SkillDocument): string => {
  if (skill.directoryName) return skill.directoryName;

  const { name } = skill.frontmatter;

  return typeof name === 'string' ? name.trim() : '';
};

/** Frontmatter keys neither tool reads. Both exports write them back unchanged. */
export const unknownKeys = (skill: SkillDocument): string[] =>
  Object.keys(skill.frontmatter).filter((key) => !knownKeys.has(key));

export const hasOpenaiSettings = (skill: SkillDocument): boolean =>
  pruneEmpty(skill.openai) !== undefined;

/** What the target's export leaves out, so the page can say so. */
export const notWrittenFor = (skill: SkillDocument, target: Target): string[] => {
  if (target === 'claude') return hasOpenaiSettings(skill) ? ['agents/openai.yaml'] : [];

  return claudeOnlyKeys.filter((key) => !isEmptyValue(skill.frontmatter[key]));
};

/**
 * Guesses the target from what was loaded: an `agents/openai.yaml` means
 * Codex, and a key only Claude Code reads means Claude Code. Null keeps the
 * current target.
 */
export const detectTarget = (
  frontmatter: Record<string, unknown>,
  hasOpenai: boolean,
): Target | null => {
  if (hasOpenai) return 'codex';
  if (claudeOnlyKeys.some((key) => key in frontmatter)) return 'claude';

  return null;
};

export type PickedSkillFiles = {
  skill: SourceFile | null;
  openai: SourceFile | null;
  /** The folder SKILL.md came from, when a folder was dropped. */
  directoryName: string | null;
  /** Files the editor leaves alone, such as scripts and references. */
  otherFiles: number;
  /** Further SKILL.md files, when a folder of several skills was dropped. */
  otherSkills: number;
};

const baseName = (path: string): string => path.split('/').at(-1) ?? path;
const parentOf = (path: string): string => path.split('/').slice(0, -1).join('/');
const depthOf = (path: string): number => path.split('/').length;

/**
 * Finds the skill in what was dropped or picked: the shallowest SKILL.md (or
 * a lone Markdown file), the `agents/openai.yaml` beside it, and the folder
 * it sits in. Without a SKILL.md, a lone `openai.yaml` still counts.
 */
export const pickSkillFiles = (files: readonly SourceFile[]): PickedSkillFiles => {
  const skillFiles = files
    .filter((file) => baseName(file.path).toLowerCase() === 'skill.md')
    .sort((first, second) => depthOf(first.path) - depthOf(second.path));

  let skill = skillFiles[0] ?? null;
  if (!skill && files.length === 1 && /\.(md|markdown)$/i.test(files[0]?.path ?? '')) {
    skill = files[0] ?? null;
  }

  const folder = skill ? parentOf(skill.path) : null;
  const openai = skill
    ? (files.find((file) => {
        const path = file.path.toLowerCase();
        const prefix = folder ? `${folder.toLowerCase()}/` : '';

        return path === `${prefix}agents/openai.yaml` || path === `${prefix}agents/openai.yml`;
      }) ?? null)
    : (files.find((file) => /^openai\.ya?ml$/i.test(baseName(file.path))) ?? null);

  return {
    skill,
    openai,
    directoryName: folder ? baseName(folder) : null,
    otherFiles: files.filter(
      (file) => file !== skill && file !== openai && !skillFiles.includes(file),
    ).length,
    otherSkills: Math.max(0, skillFiles.length - 1),
  };
};
