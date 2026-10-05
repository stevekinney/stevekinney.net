import { describe, expect, it } from 'vitest';

import { presetMatching, presets } from './presets';
import { clampField, defaultScenario, parseField } from './scenario';
import { decodeScenario, encodeScenario, scenarioFromLink } from './share-link';
import { splitPlan } from './split';
import { oldestText, projectionToCsv, summaryToMarkdown, sustainableText } from './summary';
import { simulate } from './model';

describe('the default inputs', () => {
  it('match the specification’s table', () => {
    expect(defaultScenario).toEqual({
      agents: 3,
      prsPerAgent: 2,
      linesPerPr: 300,
      linesPerSitting: 400,
      minutesPerSitting: 60,
      sittings: 3,
      policy: 'queue',
      fatiguedFactor: 0.5,
      defectDensity: 15,
      freshDetection: 70,
      followUpShare: 52.3,
      followUpMinutes: 20,
      days: 10,
    });
  });
});

describe('parseField', () => {
  it('reads numbers with grouping and a percent sign', () => {
    expect(parseField('linesPerPr', '1,500')).toBe(1_500);
    expect(parseField('followUpShare', '52.3%')).toBe(52.3);
    expect(parseField('fatiguedFactor', '.5')).toBe(0.5);
    expect(parseField('agents', '0')).toBe(0);
  });

  it('rejects text, values out of range, and fractions in whole-number fields', () => {
    expect(parseField('agents', 'three')).toBeNull();
    expect(parseField('agents', '51')).toBeNull();
    expect(parseField('agents', '2.5')).toBeNull();
    expect(parseField('fatiguedFactor', '1.5')).toBeNull();
    expect(parseField('linesPerPr', '0')).toBeNull();
    expect(parseField('days', '')).toBeNull();
  });

  it('allows a fractional rate of pull requests per agent', () => {
    expect(parseField('prsPerAgent', '2.5')).toBe(2.5);
  });
});

describe('clampField', () => {
  it('holds a value inside its range and rounds whole-number fields', () => {
    expect(clampField('agents', 99)).toBe(50);
    expect(clampField('agents', 2.6)).toBe(3);
    expect(clampField('fatiguedFactor', 3)).toBe(1);
  });
});

describe('share links', () => {
  it('round-trip a changed scenario', () => {
    const changed = {
      ...defaultScenario,
      agents: 5,
      prsPerAgent: 1.5,
      policy: 'tired' as const,
      fatiguedFactor: 0.4,
      followUpShare: 10.3,
      days: 20,
    };

    expect(scenarioFromLink(encodeScenario(changed))).toEqual(changed);
  });

  it('keep values inside their limits and drop what is not valid', () => {
    expect(decodeScenario('agents=999&prs=-1&policy=maybe&fatigue=abc&days=0')).toEqual({
      agents: 50,
      days: 1,
    });
  });

  it('return null when nothing applies', () => {
    expect(decodeScenario('')).toBeNull();
    expect(decodeScenario('utm_source=newsletter')).toBeNull();
  });
});

describe('presets', () => {
  it('start from the defaults and cover the specification’s edge cases', () => {
    expect(presets[0].scenario).toEqual(defaultScenario);
    expect(presetMatching(defaultScenario)?.id).toBe('three-agents');
    expect(presetMatching({ ...defaultScenario, agents: 0 })?.id).toBe('no-agents');
    expect(presetMatching({ ...defaultScenario, fatiguedFactor: 1 })?.id).toBe('no-fatigue');
    expect(presetMatching({ ...defaultScenario, agents: 7 })).toBeUndefined();
  });

  it('have unique ids', () => {
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
  });
});

describe('splitPlan', () => {
  it('needs two sittings for 470 lines and splits it into two units of 235', () => {
    expect(splitPlan(470, 400, 60)).toEqual({
      lines: 470,
      sittings: 2,
      minutes: 120,
      parts: [235, 235],
    });
  });

  it('fits a pull request of one sitting or less in one unit', () => {
    expect(splitPlan(400, 400, 60).parts).toEqual([400]);
    expect(splitPlan(0, 400, 60)).toEqual({ lines: 0, sittings: 0, minutes: 0, parts: [] });
  });

  it('spreads the remainder over the first parts', () => {
    expect(splitPlan(1_501, 400, 60).parts).toEqual([376, 375, 375, 375]);
  });
});

describe('summaryToMarkdown', () => {
  const summary = summaryToMarkdown(defaultScenario);

  it('lists the inputs, the sustainable count, the backlog after 10 days, and the defect projection', () => {
    expect(summary).toContain('- Parallel agents: 3');
    expect(summary).toContain('- Sustainable: 2 agents');
    expect(summary).toContain('- Gap: +600 lines');
    expect(summary).toContain('- Follow-up: 62.8 minutes');
    expect(summary).toContain('## After 10 working days');
    expect(summary).toContain(
      '- Queue it: 6,000 lines waiting in 20 pull requests, oldest opened on day 7, 3 working days earlier',
    );
    expect(summary).toContain('- Review it tired: 11.25 escaped defects a day');
    expect(summary).toContain('- If every line were reviewed fresh: 8.10 escaped defects a day');
  });
});

describe('sustainableText and oldestText', () => {
  it('read in words', () => {
    expect(sustainableText(1)).toBe('1 agent');
    expect(sustainableText(null)).toContain('any number');

    const [first] = simulate(defaultScenario, 'queue').days;
    expect(oldestText(first)).toBe('opened that day (day 1)');
    expect(oldestText(simulate({ ...defaultScenario, agents: 2 }, 'queue').days[0])).toBe(
      'nothing waiting',
    );
  });
});

describe('projectionToCsv', () => {
  it('has a header and one row per day', () => {
    const rows = projectionToCsv(defaultScenario).trim().split('\n');

    expect(rows).toHaveLength(11);
    expect(rows[10]).toBe('10,1800,6000,20,7,600,54.0000,58.5000');
  });
});
