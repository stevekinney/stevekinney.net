import { describe, expect, it } from 'vitest';

import { findRung, rungs } from './ladder';
import {
  findMechanism,
  groupByDecider,
  isMechanismId,
  mechanismIds,
  mechanisms,
  mechanismsFor,
} from './mechanisms';

describe('the ladder', () => {
  it('runs from chat to the OS, weakest first, as the outline lists it', () => {
    expect(rungs.map((rung) => rung.name)).toEqual([
      'Something said in chat',
      'Auto memory',
      'Project instructions',
      'Skill',
      'Permission rule',
      'Hook',
      'Required CI check',
      'OS, sandbox, or network',
    ]);
    expect(rungs.filter((rung) => rung.refuses).map((rung) => rung.id)).toEqual([
      'permission',
      'hook',
      'ci',
      'sandbox',
    ]);
  });
});

describe('acceptance 3: the rung a mechanism lights', () => {
  it('lights “refuses at the tool boundary” for a permission rule', () => {
    expect(findRung(findMechanism('permission').rung)?.power).toBe('refuses at the tool boundary');
  });

  it('lights “asks, if it loads” for project instructions', () => {
    expect(findRung(findMechanism('instructions').rung)?.power).toBe('asks, if it loads');
  });

  it('puts every mechanism from the spec’s table on the rung the spec gives it', () => {
    const powers = Object.fromEntries(
      mechanisms.map((mechanism) => [mechanism.id, findRung(mechanism.rung)?.power ?? null]),
    );

    expect(powers).toMatchObject({
      prompt: 'asks, until compaction',
      skill: 'asks, if it activates',
      hook: 'refuses at one event',
      ci: 'refuses for everyone',
      sandbox: 'refuses no matter what the model thinks',
      subagent: null,
      'agent-team': null,
      workflow: null,
      goal: null,
      loop: null,
      routine: null,
      'external-loop': null,
      tool: null,
    });
    expect(findMechanism('subagent').enforcement).toMatch(/permissions decide/i);
    expect(findMechanism('external-loop').enforcement).toBe('Your script decides');
  });
});

describe('acceptance 5: the Context chip', () => {
  it('highlights project instructions, skills, and subagents', () => {
    expect(mechanismsFor('context')).toEqual(
      expect.arrayContaining(['instructions', 'skill', 'subagent']),
    );
  });

  it('highlights only the mechanisms that list the concern', () => {
    expect(mechanismsFor('control')).toEqual(
      expect.arrayContaining(['permission', 'hook', 'ci', 'sandbox']),
    );
    expect(mechanismsFor('control')).not.toContain('skill');
  });
});

describe('the mechanism records', () => {
  it('has one record for each ID, with no duplicates', () => {
    expect(mechanisms.map((mechanism) => mechanism.id)).toEqual([...mechanismIds]);
  });

  it('only links to mechanisms that exist', () => {
    for (const mechanism of mechanisms) {
      for (const target of mechanism.useInstead) expect(isMechanismId(target.id)).toBe(true);
      for (const pattern of mechanism.antiPatterns) {
        for (const id of pattern.instead) expect(isMechanismId(id)).toBe(true);
      }
    }
  });

  it('lists the outline’s hook anti-patterns, with CI for “ensure all contributors obey”', () => {
    const hook = findMechanism('hook');

    expect(hook.antiPatterns).toHaveLength(7);
    expect(hook.antiPatterns.map((pattern) => pattern.pattern).join(' ')).toMatch(
      /rewrite the prompt.*architecture.*npm.*install dependencies.*Monday.*retries.*contributors/is,
    );
    const contributors = hook.antiPatterns.find((pattern) =>
      pattern.pattern.includes('contributors'),
    );
    expect(contributors?.instead).toEqual(['ci']);
    expect(contributors?.why).toBe('A local agent hook is not the shared integration boundary.');
  });

  it('groups every mechanism under exactly one decider for the list form of the map', () => {
    const groups = groupByDecider();

    expect(groups.map((group) => group.decider)).toEqual(['you', 'model', 'event', 'schedule']);
    expect(groups.flatMap((group) => group.mechanisms)).toHaveLength(mechanisms.length);
  });
});
