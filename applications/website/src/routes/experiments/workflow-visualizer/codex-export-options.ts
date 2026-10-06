/**
 * The settings of a Codex export, kept apart from `codex-export.ts` so the
 * panel can render its controls before the heavy converter loads.
 */

export const codexSandboxModes = ['read-only', 'workspace-write', 'danger-full-access'] as const;

export type CodexSandboxMode = (typeof codexSandboxModes)[number];

/** The `CONFIG.models` key for agents that set no `model`. */
export const inheritedModelKey = 'inherit';

export type CodexExportOptions = {
  /**
   * Claude model name (or `inherit`) to Codex model id. A blank or missing
   * entry becomes `null` in the file, which uses Codex's default model.
   */
  models: Readonly<Record<string, string>>;
  sandboxMode: CodexSandboxMode;
  networkAccessEnabled: boolean;
};

export const defaultCodexExportOptions: CodexExportOptions = {
  models: {},
  sandboxMode: 'workspace-write',
  networkAccessEnabled: false,
};

/** One difference between running the workflow in Claude Code and running the export. */
export type CompatibilityNote = {
  severity: 'info' | 'warning';
  feature: string;
  /** Plain text; a literal (code) is wrapped in backticks. */
  message: string;
  /** The line of the original script it's about. */
  line?: number;
};

/** Split a note's message into plain text and the literals between backticks. */
export const noteSegments = (message: string): Array<{ text: string; code: boolean }> =>
  message
    .split('`')
    .map((text, index) => ({ text, code: index % 2 === 1 }))
    .filter((segment) => segment.text !== '');
