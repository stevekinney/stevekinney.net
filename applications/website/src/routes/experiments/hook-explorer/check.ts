import {
  claudeHookInputSchemas,
  claudeHookOutputSchema,
  claudeHookSpecificOutputSchemas,
  codexHookInputSchemas,
  codexHookOutputSchemas,
} from '@lostgradient/skillset/hooks';
import { z } from 'zod';

import type { Tool } from './facts';

/**
 * Checks a pasted payload against one event's schema. The page loads this
 * with `import()`, so the schemas never weigh on the first paint.
 */

export type PayloadKind = 'input' | 'output';

export type CheckIssue = {
  /** Where the problem is, such as `hookSpecificOutput.decision`, or empty for the whole payload. */
  path: string;
  message: string;
};

export type CheckResult =
  { ok: true } | { ok: false; syntaxError: string | null; issues: CheckIssue[] };

/** `['tool_calls', 0, 'tool_name']` becomes `tool_calls[0].tool_name`. */
export const formatPath = (path: readonly PropertyKey[]): string =>
  path
    .map((part, index) =>
      typeof part === 'number' ? `[${part}]` : `${index === 0 ? '' : '.'}${String(part)}`,
    )
    .join('');

const lookup = (schemas: Record<string, z.ZodType>, event: string): z.ZodType => {
  const schema = schemas[event];
  if (!schema) throw new Error(`Unknown event ${event}.`);

  return schema;
};

/**
 * A Claude Code event's stdout: the shared fields plus only this event's
 * `hookSpecificOutput`, since its `hookEventName` has to name the event that ran.
 */
const claudeOutputFor = (event: string): z.ZodType => {
  const variant = (claudeHookSpecificOutputSchemas as Record<string, z.ZodType | undefined>)[event];

  return claudeHookOutputSchema.extend({
    hookSpecificOutput: variant
      ? variant.optional()
      : z.undefined({ error: `${event} has no hookSpecificOutput, so leave it out.` }).optional(),
  });
};

/** The schema a payload is checked against. */
export const schemaFor = (tool: Tool, event: string, kind: PayloadKind): z.ZodType => {
  if (tool === 'claude') {
    const input = lookup(claudeHookInputSchemas, event);

    return kind === 'input' ? input : claudeOutputFor(event);
  }

  return lookup(kind === 'input' ? codexHookInputSchemas : codexHookOutputSchemas, event);
};

export const checkPayload = (
  tool: Tool,
  event: string,
  kind: PayloadKind,
  text: string,
): CheckResult => {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      syntaxError: error instanceof Error ? error.message : 'This isn’t valid JSON.',
      issues: [],
    };
  }

  const result = schemaFor(tool, event, kind).safeParse(payload);
  if (result.success) return { ok: true };

  return {
    ok: false,
    syntaxError: null,
    issues: result.error.issues.map((issue) => ({
      path: formatPath(issue.path),
      message: issue.message,
    })),
  };
};
