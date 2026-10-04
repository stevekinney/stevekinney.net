import { setModelLine } from './agent-definition';
import { families } from './models';
import type { Family, ModelValue } from './models';
import { resolve } from './resolve';
import type { FleetAnalysis, FleetRow } from './fleet';
import { thresholds } from './version-boundaries';
import { formatVersion, isAtLeast } from './versions';

export type DiffLine = { kind: 'context' | 'add' | 'remove'; text: string };

/**
 * A short diff between two versions of a file. The edit touches one line, so
 * this trims the lines both versions share from each end and keeps two lines
 * of context.
 */
export const diffPreview = (before: string, after: string): DiffLine[] => {
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);

  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) {
    start += 1;
  }

  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const context = 2;
  const lines: DiffLine[] = [];
  for (const text of oldLines.slice(Math.max(0, start - context), start)) {
    lines.push({ kind: 'context', text });
  }
  for (const text of oldLines.slice(start, oldEnd)) lines.push({ kind: 'remove', text });
  for (const text of newLines.slice(start, newEnd)) lines.push({ kind: 'add', text });
  for (const text of newLines.slice(newEnd, newEnd + context)) {
    lines.push({ kind: 'context', text });
  }

  return lines;
};

export type FixSuggestion = {
  /** The model the edit pins. */
  intended: Family;
  /** What to do to the file, in a sentence. */
  editInstruction: string;
  /** The model the agent would run on the later version after the edit. */
  modelAfterEdit: ModelValue;
  /** Whether the edit does what it says on the later version. */
  editWorks: boolean;
  /** Why it doesn't, when it doesn't. */
  editProblem: string | null;
  /** The "everything on X" alternative, or `null` when the later version predates FORCE. */
  forceInstruction: string | null;
  forceUnavailable: string | null;
  /** A patched copy of an uploaded file, with a diff to preview first. */
  patch: {
    fileName: string;
    contents: string;
    diff: DiffLine[];
    /** The file already says this. */
    alreadySet: boolean;
  } | null;
  /** Why there's no patched copy. */
  noPatchReason: string | null;
};

/** The model a row would keep running on: the one it ran on before, if it's a family. */
export const defaultIntendedModel = (row: FleetRow): Family => {
  const isFamily = (value: ModelValue | null): value is Family =>
    value !== null && (families as readonly string[]).includes(value);

  if (isFamily(row.before)) return row.before;
  if (isFamily(row.after)) return row.after;

  return 'sonnet';
};

const fileNameOf = (path: string): string => path.split(/[\\/]/).at(-1) ?? 'agent.md';

/** The smallest edit that pins `intended` for a row, checked against the rules on the later version. */
export const suggestFix = (
  row: FleetRow,
  analysis: FleetAnalysis,
  intended: Family = defaultIntendedModel(row),
): FixSuggestion => {
  const { context, columns } = analysis;
  const definition = row.definition;

  const after = resolve({
    kind: 'custom',
    definitionModel: intended,
    invocationModel: 'unset',
    environmentModel: context.environmentModel,
    force: context.force,
    mainModel: context.mainModel,
    providerGroup: context.providerGroup,
    version: columns.after,
    resumed: context.resumed,
  });

  const forceActive = context.force && isAtLeast(columns.after, thresholds.force);
  const editWorks = after.model === intended;
  const editProblem = editWorks
    ? null
    : forceActive
      ? `FORCE is on at ${formatVersion(columns.after)}, so it ignores every \`model:\` line. Change the env var instead.`
      : `On ${formatVersion(columns.after)}, this edit still resolves to \`${after.model}\`.`;

  const editInstruction = definition
    ? definition.rawModel === null
      ? `Add \`model: ${intended}\` to the frontmatter of \`${definition.path}\`.`
      : `Change \`model: ${definition.rawModel}\` to \`model: ${intended}\` in \`${definition.path}\`.`
    : `Create an agent named \`${row.name}\`, such as \`.claude/agents/${row.name.toLowerCase()}.md\`, with \`model: ${intended}\`. A definition with a built-in’s name replaces it.`;

  const forceAvailable = isAtLeast(columns.after, thresholds.force);

  let patch: FixSuggestion['patch'] = null;
  let noPatchReason: string | null = null;

  if (!definition) {
    noPatchReason = 'A built-in has no file to patch.';
  } else if (definition.source !== 'upload' || definition.fileText === null) {
    noPatchReason =
      definition.source === 'paste'
        ? 'This agent came from pasted output, so there’s no file to patch. Upload it to get a patched copy.'
        : 'This agent didn’t come from an uploaded file.';
  } else if (!definition.patchable) {
    noPatchReason = 'This file has no well-formed frontmatter to edit.';
  } else {
    const contents = setModelLine(definition.fileText, intended);

    if (contents === null) {
      noPatchReason = 'This file has no well-formed frontmatter to edit.';
    } else {
      patch = {
        fileName: fileNameOf(definition.path),
        contents,
        diff: diffPreview(definition.fileText, contents),
        alreadySet: contents === definition.fileText,
      };
    }
  }

  return {
    intended,
    editInstruction,
    modelAfterEdit: after.model,
    editWorks,
    editProblem,
    forceInstruction: forceAvailable
      ? `Set \`CLAUDE_CODE_SUBAGENT_MODEL=${intended}\` and \`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1\` in the \`env\` block of your settings. That puts every subagent on \`${intended}\`, except forks and skills with \`model: inherit\`.`
      : null,
    forceUnavailable: forceAvailable
      ? null
      : `FORCE needs ${formatVersion(thresholds.force)} or later, and the later version here is ${formatVersion(columns.after)}.`,
    patch,
    noPatchReason,
  };
};
