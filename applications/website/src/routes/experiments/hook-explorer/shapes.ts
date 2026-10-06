import type { FieldNode } from './schema-tree';

/** One event's payloads, as plain data the page draws. */
export type EventShape = {
  name: string;
  /** stdin fields this event adds to the ones every event gets. */
  input: FieldNode[];
  /**
   * stdout fields beyond the ones every event can print. For Claude Code, the
   * event's `hookSpecificOutput`, if it has one. For Codex, the event's whole output.
   */
  output: FieldNode[];
  /** The output rejects keys it doesn't list. */
  outputStrict: boolean;
  /** The output schema accepts any value. */
  outputAny: boolean;
  sampleInput: string;
  sampleOutput: string;
};

export type ToolShapes = {
  /** stdin fields every event of this tool carries, identically. */
  commonInput: FieldNode[];
  /** stdout fields every event can print. Empty for Codex, where each event lists its own. */
  commonOutput: FieldNode[];
  events: EventShape[];
};

/** Field names one tool has for an event and the other doesn't. */
export type FieldDifference = { input: string[]; output: string[] };

export type Comparison = { onlyClaude: FieldDifference; onlyCodex: FieldDifference };
