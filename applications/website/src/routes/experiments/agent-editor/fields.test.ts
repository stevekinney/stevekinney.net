import { claudeAgentFrontmatterSchema, codexAgentSchema } from '@lostgradient/skillset';
import { describe, expect, it } from 'vitest';

import { claudeEffortLevels, claudeKeyOrder, codexKnownKeys } from './document';
import type { Target } from './document';
import { fieldDefinitions, fieldGroups, omittedKeys } from './fields';

const schemaKeys: Record<Target, string[]> = {
  claude: Object.keys(claudeAgentFrontmatterSchema.shape),
  codex: Object.keys(codexAgentSchema.shape),
};

const definedKeys = (target: Target): string[] =>
  fieldDefinitions.filter((field) => field.target === target).map((field) => field.key);

describe('field coverage', () => {
  // When skillset adds a field, this fails until the editor has a field for it
  // or `omittedKeys` says why it doesn't.
  it.each(['claude', 'codex'] as const)('gives every %s schema key a field', (target) => {
    const covered = new Set([
      ...definedKeys(target).map((key) => key.split('.')[0]),
      ...Object.keys(omittedKeys[target]),
    ]);

    expect(schemaKeys[target].filter((key) => !covered.has(key))).toEqual([]);
  });

  it('gives every key inside experimental a field', () => {
    const nested = Object.keys(claudeAgentFrontmatterSchema.shape.experimental.unwrap().shape);

    expect(nested.map((key) => `experimental.${key}`)).toEqual(
      definedKeys('claude').filter((key) => key.startsWith('experimental.')),
    );
  });

  it.each(['claude', 'codex'] as const)('defines no %s field the schema lacks', (target) => {
    const stale = [...definedKeys(target), ...Object.keys(omittedKeys[target])].filter(
      (key) => !schemaKeys[target].includes(key.split('.')[0] ?? key),
    );

    expect(stale).toEqual([]);
  });

  it('keeps the key lists in document.ts in step with the schemas', () => {
    expect([...claudeKeyOrder]).toEqual(schemaKeys.claude);
    expect([...codexKnownKeys]).toEqual(schemaKeys.codex);
    expect([...claudeEffortLevels]).toEqual(
      claudeAgentFrontmatterSchema.shape.effort.unwrap().options[0].options,
    );
  });

  it('puts every field in a group that exists for its tool', () => {
    const groups = new Set(fieldGroups.map((group) => `${group.target}:${group.id}`));
    const orphans = fieldDefinitions.filter(
      (field) => field.group !== 'essentials' && !groups.has(`${field.target}:${field.group}`),
    );

    expect(orphans).toEqual([]);
  });

  it('labels the undocumented fields as undocumented', () => {
    const undocumented = fieldDefinitions
      .filter((field) => field.group === 'claude-undocumented')
      .map((field) => field.key);

    expect(undocumented).toEqual(['observer', 'observerMessage', 'observeSubagents']);
  });
});
