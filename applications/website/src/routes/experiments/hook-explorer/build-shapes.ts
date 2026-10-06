import {
  claudeCommonHookInputSchema,
  claudeHookEventNames,
  claudeHookInputSchemas,
  claudeHookOutputSchema,
  claudeHookSpecificOutputSchemas,
  codexHookEventNames,
  codexHookInputSchemas,
  codexHookOutputSchemas,
} from '@lostgradient/skillset/hooks';
import { z } from 'zod';

import { fieldsOf, formatSample, isStrictObject, sampleObject } from './schema-tree';
import type { FieldNode, JsonSchema } from './schema-tree';
import type { Comparison, EventShape, FieldDifference, ToolShapes } from './shapes';

/** The plain JSON Schema for a zod schema, as the input it accepts. */
export const jsonSchemaOf = (schema: z.ZodType): JsonSchema =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;

const sameField = (a: FieldNode, b: FieldNode): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Splits fields into the ones in `common` (same shape, same requiredness) and the rest. */
const splitCommon = (
  fields: FieldNode[],
  common: FieldNode[],
): { own: FieldNode[]; shared: FieldNode[] } => {
  const isCommon = (field: FieldNode): boolean =>
    common.some((candidate) => sameField(candidate, field));

  return {
    own: fields.filter((field) => !isCommon(field)),
    shared: fields.filter(isCommon),
  };
};

const markCommon = (fields: FieldNode[]): FieldNode[] =>
  fields.map((field) => ({ ...field, common: true }));

/** The fields in every one of these lists, compared by their whole shape. */
const intersect = (lists: FieldNode[][]): FieldNode[] => {
  const [first = [], ...rest] = lists;

  return first.filter((field) =>
    rest.every((list) => list.some((other) => sameField(other, field))),
  );
};

const variantFor = (name: string): z.ZodType | undefined =>
  (claudeHookSpecificOutputSchemas as Record<string, z.ZodType | undefined>)[name];

const claudeOutputFields = jsonSchemaOf(claudeHookOutputSchema);

/** Every Claude Code event's payloads, with the fields every event shares listed once. */
export const buildClaudeShapes = (): ToolShapes => {
  const commonInput = fieldsOf(jsonSchemaOf(claudeCommonHookInputSchema));
  const commonOutput = fieldsOf(claudeOutputFields).filter(
    (field) => field.name !== 'hookSpecificOutput',
  );

  const events = claudeHookEventNames.map((name): EventShape => {
    const inputSchema = jsonSchemaOf(claudeHookInputSchemas[name]);
    const variant = variantFor(name);
    const variantSchema = variant ? jsonSchemaOf(variant) : null;

    const output: FieldNode[] = variantSchema
      ? [
          {
            name: 'hookSpecificOutput',
            type: 'object',
            required: false,
            children: fieldsOf(variantSchema),
          },
        ]
      : [];

    const sampleOutput = variantSchema
      ? { hookSpecificOutput: sampleObject(variantSchema, []) }
      : sampleObject(claudeOutputFields, ['systemMessage']);

    return {
      name,
      input: splitCommon(fieldsOf(inputSchema), commonInput).own,
      output,
      outputStrict: false,
      outputAny: false,
      sampleInput: formatSample(sampleObject(inputSchema, [])),
      sampleOutput: formatSample(sampleOutput),
    };
  });

  return { commonInput: markCommon(commonInput), commonOutput: markCommon(commonOutput), events };
};

/**
 * Every Codex event's payloads. Codex has no separate common schema, so the
 * common fields are the ones every event's input declares the same way.
 */
export const buildCodexShapes = (): ToolShapes => {
  const inputs = codexHookEventNames.map((name) => ({
    name,
    schema: jsonSchemaOf(codexHookInputSchemas[name]),
  }));
  const commonInput = intersect(inputs.map(({ schema }) => fieldsOf(schema)));

  const events = inputs.map(({ name, schema }): EventShape => {
    const outputSchema = jsonSchemaOf(codexHookOutputSchemas[name]);
    const properties = Object.keys(outputSchema.properties ?? {});
    const include = properties.includes('hookSpecificOutput')
      ? ['hookSpecificOutput']
      : ['systemMessage'];

    return {
      name,
      input: splitCommon(fieldsOf(schema), commonInput).own,
      output: fieldsOf(outputSchema),
      outputStrict: isStrictObject(outputSchema),
      outputAny: outputSchema.type === undefined,
      sampleInput: formatSample(sampleObject(schema, [])),
      sampleOutput: formatSample(
        outputSchema.type === undefined ? {} : sampleObject(outputSchema, include),
      ),
    };
  });

  return { commonInput: markCommon(commonInput), commonOutput: [], events };
};

/** Top-level names, plus `hookSpecificOutput.<name>` for the fields inside it. */
const outputNames = (fields: FieldNode[]): string[] =>
  fields.flatMap((field) =>
    field.name === 'hookSpecificOutput'
      ? (field.children ?? []).map((child) => `hookSpecificOutput.${child.name}`)
      : [field.name],
  );

const without = (names: string[], other: string[]): string[] =>
  names.filter((name) => !other.includes(name));

/** For each event both tools have, the fields only one of them sends or reads. */
export const compareTools = (claude: ToolShapes, codex: ToolShapes): Record<string, Comparison> => {
  const comparisons: Record<string, Comparison> = {};

  for (const codexEvent of codex.events) {
    const claudeEvent = claude.events.find((event) => event.name === codexEvent.name);
    if (!claudeEvent) continue;

    const claudeInput = [...claude.commonInput, ...claudeEvent.input].map((field) => field.name);
    const codexInput = [...codex.commonInput, ...codexEvent.input].map((field) => field.name);
    const claudeOutput = outputNames([...claude.commonOutput, ...claudeEvent.output]);
    const codexOutput = outputNames([...codex.commonOutput, ...codexEvent.output]);

    const onlyClaude: FieldDifference = {
      input: without(claudeInput, codexInput),
      output: without(claudeOutput, codexOutput),
    };
    const onlyCodex: FieldDifference = {
      input: without(codexInput, claudeInput),
      output: without(codexOutput, claudeOutput),
    };

    comparisons[codexEvent.name] = { onlyClaude, onlyCodex };
  }

  return comparisons;
};

export type HookShapes = {
  claude: ToolShapes;
  codex: ToolShapes;
  comparisons: Record<string, Comparison>;
};

export const buildHookShapes = (): HookShapes => {
  const claude = buildClaudeShapes();
  const codex = buildCodexShapes();

  return { claude, codex, comparisons: compareTools(claude, codex) };
};
