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
import { describe, expect, it } from 'vitest';

import { buildHookShapes, jsonSchemaOf } from './build-shapes';
import { claudeFacts, codexFacts, groups } from './facts';
import { fieldsOf, sampleObject, sampleValue, typeLabel } from './schema-tree';
import type { FieldNode } from './schema-tree';

const shapes = buildHookShapes();

const eventOf = (tool: 'claude' | 'codex', name: string) => {
  const event = shapes[tool].events.find((candidate) => candidate.name === name);
  if (!event) throw new Error(`No ${tool} event ${name}`);

  return event;
};

const names = (fields: FieldNode[]): string[] => fields.map((field) => field.name);

describe('the field tree', () => {
  it('lists every field of a schema in order, with its requiredness', () => {
    const schema = jsonSchemaOf(claudeHookInputSchemas.PreCompact);
    const fields = fieldsOf(schema);

    expect(names(fields)).toEqual(Object.keys(schema.properties ?? {}));
    expect(fields.find((field) => field.name === 'cwd')?.required).toBe(true);
    expect(fields.find((field) => field.name === 'agent_id')?.required).toBe(false);
  });

  it('labels types, constants, enums, and nullable fields', () => {
    const fields = fieldsOf(jsonSchemaOf(claudeHookInputSchemas.PreCompact));
    const field = (name: string) => fields.find((candidate) => candidate.name === name);

    expect(field('hook_event_name')).toMatchObject({ type: 'string', values: ['PreCompact'] });
    expect(field('trigger')).toMatchObject({ type: 'string', values: ['manual', 'auto'] });
    expect(field('custom_instructions')?.type).toBe('string or null');
    expect(field('effort')?.children?.map((child) => child.name)).toEqual(['level']);
  });

  it('draws an array of objects as the item’s fields', () => {
    const toolCalls = eventOf('claude', 'PostToolBatch').input.find(
      (field) => field.name === 'tool_calls',
    );

    expect(toolCalls?.type).toBe('array of objects');
    expect(names(toolCalls?.children ?? [])).toContain('tool_use_id');
  });

  it('names each shape of a union by the key that tells them apart', () => {
    const suggestions = eventOf('claude', 'PermissionRequest').input.find(
      (field) => field.name === 'permission_suggestions',
    );

    expect(suggestions?.variants?.map((variant) => variant.label)).toEqual([
      'type: addRules',
      'type: replaceRules',
      'type: removeRules',
      'type: setMode',
      'type: addDirectories',
      'type: removeDirectories',
    ]);
  });

  it('calls a field with no type any JSON', () => {
    expect(typeLabel({})).toBe('any JSON');
    expect(sampleValue('tool_input', {})).toEqual({});
  });

  it('refuses a schema with a reference it can’t inline', () => {
    expect(() => fieldsOf({ $ref: '#/$defs/thing' })).toThrow(/\$ref/);
  });

  it('marks strict Codex outputs and the nested objects in them', () => {
    const preToolUse = eventOf('codex', 'PreToolUse');

    expect(preToolUse.outputStrict).toBe(true);
    expect(preToolUse.output.find((field) => field.name === 'hookSpecificOutput')?.strict).toBe(
      true,
    );
    expect(eventOf('claude', 'PreToolUse').outputStrict).toBe(false);
  });
});

describe('the sample generator', () => {
  it('fills required fields with constants, first values, and typed placeholders', () => {
    const sample = sampleObject(jsonSchemaOf(claudeHookInputSchemas.MessageDisplay), []);

    expect(sample).toMatchObject({
      session_id: '<session_id>',
      hook_event_name: 'MessageDisplay',
      index: 0,
      final: false,
    });
    expect(sample).not.toHaveProperty('agent_id');
  });

  it('fills a nullable field with its non-null type', () => {
    const sample = sampleObject(jsonSchemaOf(claudeHookInputSchemas.PreCompact), []);

    expect(sample).toMatchObject({
      trigger: 'manual',
      custom_instructions: '<custom_instructions>',
    });
  });

  it('takes the first shape of a required union', () => {
    expect(JSON.parse(eventOf('claude', 'PermissionRequest').sampleOutput)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } },
    });
  });
});

describe('every event', () => {
  it.each(claudeHookEventNames)(
    'Claude Code %s has a tree and samples its schemas accept',
    (name) => {
      const event = eventOf('claude', name);
      const sampleInput: unknown = JSON.parse(event.sampleInput);
      const sampleOutput: unknown = JSON.parse(event.sampleOutput);

      expect(event.input.length).toBeGreaterThan(0);
      expect(claudeHookInputSchemas[name].safeParse(sampleInput).success).toBe(true);
      expect(claudeHookOutputSchema.safeParse(sampleOutput).success).toBe(true);

      const variant = (claudeHookSpecificOutputSchemas as Record<string, unknown>)[name];
      if (variant) {
        expect(sampleOutput).toMatchObject({ hookSpecificOutput: { hookEventName: name } });
        expect(names(event.output)).toEqual(['hookSpecificOutput']);
      } else {
        expect(sampleOutput).not.toHaveProperty('hookSpecificOutput');
        expect(event.output).toEqual([]);
      }
    },
  );

  it.each(codexHookEventNames)('Codex %s has a tree and samples its schemas accept', (name) => {
    const event = eventOf('codex', name);

    expect(event.input.length).toBeGreaterThan(0);
    expect(codexHookInputSchemas[name].safeParse(JSON.parse(event.sampleInput)).success).toBe(true);
    expect(codexHookOutputSchemas[name].safeParse(JSON.parse(event.sampleOutput)).success).toBe(
      true,
    );
  });

  it('lists the events in the order the schemas do', () => {
    expect(shapes.claude.events.map((event) => event.name)).toEqual([...claudeHookEventNames]);
    expect(shapes.codex.events.map((event) => event.name)).toEqual([...codexHookEventNames]);
  });

  it('accepts anything for the one Codex output with no schema', () => {
    expect(eventOf('codex', 'SessionEnd')).toMatchObject({ outputAny: true, sampleOutput: '{}' });
  });
});

describe('common fields', () => {
  it('lists the Claude Code common fields once, marked common', () => {
    expect(names(shapes.claude.commonInput)).toEqual(
      Object.keys(claudeCommonHookInputSchema.shape),
    );
    expect(shapes.claude.commonInput.every((field) => field.common)).toBe(true);
    expect(eventOf('claude', 'PreToolUse').input.some((field) => field.name === 'cwd')).toBe(false);
  });

  it('keeps a field an event redeclares as required with that event', () => {
    const own = eventOf('claude', 'SubagentStop').input;

    expect(own.find((field) => field.name === 'agent_id')?.required).toBe(true);
    expect(own.find((field) => field.name === 'agent_type')?.required).toBe(true);
  });

  it('finds the fields every Codex event declares the same way', () => {
    expect(names(shapes.codex.commonInput)).toEqual(['session_id', 'transcript_path', 'cwd']);
  });

  it('lists what every Claude Code event can print, apart from hookSpecificOutput', () => {
    expect(names(shapes.claude.commonOutput)).toEqual(
      Object.keys(claudeHookOutputSchema.shape).filter((key) => key !== 'hookSpecificOutput'),
    );
    expect(shapes.codex.commonOutput).toEqual([]);
  });
});

describe('the comparison', () => {
  it('covers each event both tools have', () => {
    expect(Object.keys(shapes.comparisons).sort()).toEqual(
      codexHookEventNames.filter((name) => name !== 'Interrupt').sort(),
    );
  });

  it('lists the fields only one tool has', () => {
    expect(shapes.comparisons['PreToolUse']).toEqual({
      onlyClaude: {
        input: ['scratchpad_dir', 'prompt_id', 'effort', 'mcp_server'],
        output: ['stopReason', 'terminalSequence'],
      },
      onlyCodex: { input: ['model', 'turn_id'], output: [] },
    });
  });
});

describe('the event facts', () => {
  it('cover every Claude Code event and no others', () => {
    expect(Object.keys(claudeFacts).sort()).toEqual([...claudeHookEventNames].sort());
  });

  it('cover every Codex event and no others', () => {
    expect(Object.keys(codexFacts).sort()).toEqual([...codexHookEventNames].sort());
  });

  it('put every event in a known group', () => {
    const ids = groups.map((group) => group.id);

    for (const fact of [...Object.values(claudeFacts), ...Object.values(codexFacts)]) {
      expect(ids).toContain(fact.group);
    }
  });
});

describe('page data', () => {
  it('stays small enough to send with the page', () => {
    expect(JSON.stringify(shapes).length).toBeLessThan(80_000);
  });
});
