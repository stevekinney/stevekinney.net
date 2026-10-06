import { describe, expect, it } from 'vitest';

import { comparePrediction, describeScenario, parseGuess } from './prediction';
import { defaultScenario } from './scenario';

describe('parseGuess', () => {
  it('reads a number, with or without a times sign', () => {
    expect(parseGuess('2')).toBe(2);
    expect(parseGuess(' 1.5x ')).toBe(1.5);
    expect(parseGuess('3×')).toBe(3);
    expect(parseGuess('2.5 times')).toBe(2.5);
    expect(parseGuess('1,8')).toBe(1.8);
  });

  it('rejects anything that isn’t a positive speedup', () => {
    expect(parseGuess('')).toBeNull();
    expect(parseGuess('0')).toBeNull();
    expect(parseGuess('fast')).toBeNull();
    expect(parseGuess('-2')).toBeNull();
    expect(parseGuess('5000')).toBeNull();
  });
});

describe('comparePrediction', () => {
  it('puts the answer beside the guess with the gap', () => {
    expect(comparePrediction(3, 60 / 45)).toMatchObject({
      sentence: 'You guessed 3×. The answer is 1.33×, so your guess was 1.67 too high.',
    });
    expect(comparePrediction(1, 60 / 45).sentence).toBe(
      'You guessed 1×. The answer is 1.33×, so your guess was 0.33 too low.',
    );
    expect(comparePrediction(1.33, 60 / 45).sentence).toBe(
      'You guessed 1.33×. The answer is 1.33×. Spot on.',
    );
  });
});

describe('describeScenario', () => {
  it('says the default scenario in plain words', () => {
    expect(describeScenario(defaultScenario('model'))).toBe(
      '60 minutes of work, 40% of it serial, 4 workers.',
    );
    expect(
      describeScenario({ ...defaultScenario('model'), mode: 'team', workers: 3, soloMinutes: 1 }),
    ).toBe('1 minute of work, 40% of it serial, 3 teammates (agent team).');
  });
});
