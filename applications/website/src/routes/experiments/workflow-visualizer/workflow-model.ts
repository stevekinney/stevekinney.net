/**
 * The plain data the diagram renders. `analyze-workflow.ts` builds it from a
 * script; this file holds only types and small helpers, so the page can import
 * it without pulling in the parser.
 */

/** The largest workflow script Claude Code accepts, in bytes (512 KiB). */
export const maximumScriptBytes = 524_288;

/** An option the diagram shows. `dynamic` means it's an expression only the run can settle. */
export type OptionValue = { text: string; dynamic: boolean };

/** The top-level shape of an agent's output schema, or the expression that builds it. */
export type SchemaSummary =
  | { readable: true; properties: { name: string; required: boolean }[] }
  | { readable: false; text: string };

type StepBase = {
  /** Unique within one analysis, for keyed lists. */
  id: string;
  /** The 1-based line the step starts on. */
  line: number;
};

/** A variable the step's result is assigned to, such as `reviews`. */
type Assigned = { result: string | null };

export type AgentStep = StepBase &
  Assigned & {
    kind: 'agent';
    /** The `label` option, or a preview of the prompt when there's no label. */
    title: string;
    hasLabel: boolean;
    /** The prompt with each `${…}` kept as a visible placeholder, shortened. */
    prompt: string;
    model: OptionValue | null;
    effort: OptionValue | null;
    isolation: OptionValue | null;
    agentType: OptionValue | null;
    phase: OptionValue | null;
    schema: SchemaSummary | null;
    /** True when an option other than `label` can't be read until the script runs. */
    unreadOptions: boolean;
  };

export type PhaseStep = StepBase & {
  kind: 'phase';
  title: string;
  /** True when the title is an expression, so it's shown as code. */
  dynamic: boolean;
  /** The matching `meta.phases` entry's `detail`. */
  detail: string | null;
  steps: Step[];
};

export type ParallelStep = StepBase &
  Assigned & {
    kind: 'parallel';
    /** `parallel()` takes thunks; `Promise.all()` takes promises that have already started. */
    via: 'parallel' | 'Promise.all';
    branches: { id: string; steps: Step[] }[];
  };

export type FanOutStep = StepBase &
  Assigned & {
    kind: 'fan-out';
    via: 'parallel' | 'Promise.all';
    /** The source of the list each item comes from, such as `changed.files`. */
    over: string;
    /** The callback's parameter for one item, such as `file`. */
    item: string | null;
    /** What runs for one item. Empty when the work is built somewhere the diagram can't see. */
    branch: Step[];
  };

export type PipelineStage = { id: string; line: number; parameters: string; steps: Step[] };

export type PipelineStep = StepBase &
  Assigned & {
    kind: 'pipeline';
    over: string;
    stages: PipelineStage[];
  };

export type BranchArm = {
  id: string;
  kind: 'if' | 'else if' | 'else' | 'case' | 'default';
  /** The condition or case value as written. */
  test: string | null;
  steps: Step[];
};

export type BranchStep = StepBase & {
  kind: 'branch';
  /** What a `switch` compares, as written. `null` for an `if` or a `? :`. */
  subject: string | null;
  arms: BranchArm[];
};

export type LoopStep = StepBase & {
  kind: 'loop';
  /** The loop's head as written, such as `for (const file of files)`. */
  header: string;
  steps: Step[];
};

export type TryStep = StepBase & {
  kind: 'try';
  steps: Step[];
  handler: { parameter: string | null; steps: Step[] } | null;
  finalizer: Step[] | null;
};

export type HelperStep = StepBase &
  Assigned & {
    kind: 'helper';
    name: string;
    definedOn: number;
    steps: Step[];
    /**
     * `recursive` when the helper is already being expanded above this call,
     * and `limit` once the diagram has expanded as many helpers as it will.
     * Either way its steps are left out here.
     */
    status: 'expanded' | 'recursive' | 'limit';
  };

export type WorkflowCallStep = StepBase &
  Assigned & {
    kind: 'workflow';
    reference: string;
    dynamic: boolean;
  };

export type LogStep = StepBase & { kind: 'log'; message: string };

export type ReturnStep = StepBase & {
  kind: 'return';
  /** The returned expression as written, or `null` for a bare `return`. */
  expression: string | null;
};

export type CodeStep = StepBase & {
  kind: 'code';
  endLine: number;
  /** A short preview of each statement. Consecutive plain statements share one row. */
  statements: string[];
  /** Plain bookkeeping, shown quietly. A `throw` or an unused helper isn't. */
  muted: boolean;
  /** Prose about the code, with code marked in backticks. */
  note: string | null;
};

export type Step =
  | AgentStep
  | PhaseStep
  | ParallelStep
  | FanOutStep
  | PipelineStep
  | BranchStep
  | LoopStep
  | TryStep
  | HelperStep
  | WorkflowCallStep
  | LogStep
  | ReturnStep
  | CodeStep;

export type WorkflowHeader = {
  name: string;
  title: string | null;
  description: string;
  whenToUse: string | null;
};

/** Counts of what the script says, by call site: a helper called twice counts once. */
export type WorkflowSummary = {
  /** `agent()` call sites. */
  agentCalls: number;
  /** `parallel()` over a list, `pipeline()`, and `Promise.all()` over a list. */
  fanOuts: number;
  phases: number;
  /** Every `model` named in a literal option, in order of first use. */
  models: string[];
  /** Call sites that pass no `model`, so they run on the session's model. */
  sessionModelAgents: number;
  /** Call sites whose options, other than `label`, can't be read until the script runs. */
  unreadOptions: number;
};

export type ParseError = { message: string; line: number | null; column: number | null };

export type WorkflowAnalysis =
  | { ok: true; header: WorkflowHeader | null; steps: Step[]; summary: WorkflowSummary }
  | { ok: false; error: ParseError };

export type WorkflowCheck = {
  severity: 'error' | 'warning';
  /** Prose with code marked in backticks. */
  message: string;
  line: number | null;
};

/** A successful analysis: what the diagram draws. */
export type WorkflowDiagram = Extract<WorkflowAnalysis, { ok: true }>;

export type TextPart = { text: string; placeholder: boolean };

/**
 * Splits a prompt or label into plain text and `${…}` placeholders, matching
 * braces so `${format({ short: true })}` stays one placeholder. A placeholder
 * cut short by a shortened preview stays plain text.
 */
export const textParts = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let plain = '';
  let index = 0;

  while (index < text.length) {
    if (text.startsWith('${', index)) {
      let depth = 0;
      let end = index + 1;
      for (; end < text.length; end += 1) {
        if (text[end] === '{') depth += 1;
        if (text[end] === '}') depth -= 1;
        if (depth === 0) break;
      }

      if (end < text.length) {
        if (plain) parts.push({ text: plain, placeholder: false });
        parts.push({ text: text.slice(index, end + 1), placeholder: true });
        plain = '';
        index = end + 1;
        continue;
      }
    }

    plain += text[index];
    index += 1;
  }

  if (plain) parts.push({ text: plain, placeholder: false });

  return parts;
};
