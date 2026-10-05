import { defaultScenario } from './scenario';
import type { Scenario } from './scenario';

export type Preset = {
  id: string;
  name: string;
  scenario: Scenario;
  /** What to notice about this scenario. */
  notice: string;
};

export const customNotice = 'Your own scenario. Pick a preset to get back to a worked example.';

export const presets: readonly Preset[] = [
  {
    id: 'three-agents',
    name: 'Three agents',
    scenario: defaultScenario,
    notice:
      'Three agents open 1,800 lines a day against your 1,200. The extra 600 either waits or gets a tired review.',
  },
  {
    id: 'two-agents',
    name: 'Two agents',
    scenario: { ...defaultScenario, agents: 2 },
    notice:
      'Two agents open exactly what you can review fresh. Nothing waits, and both policies come out the same.',
  },
  {
    id: 'five-agents',
    name: 'Five agents',
    scenario: { ...defaultScenario, agents: 5 },
    notice:
      'The top of the recommended range opens 3,000 lines a day, two and a half times what you can review well.',
  },
  {
    id: 'oversized',
    name: 'One huge pull request',
    scenario: { ...defaultScenario, agents: 1, prsPerAgent: 1, linesPerPr: 1_500 },
    notice:
      'A single 1,500-line pull request is more than a whole day of good sittings, so even one of them queues across days.',
  },
  {
    id: 'no-fatigue',
    name: 'No fatigue',
    scenario: { ...defaultScenario, fatiguedFactor: 1 },
    notice:
      'With a fatigued factor of 1, a tired review is as good as a fresh one. The policies match on quality per line and differ only in the backlog.',
  },
  {
    id: 'no-agents',
    name: 'No agents',
    scenario: { ...defaultScenario, agents: 0 },
    notice: 'With no agents, nothing is generated, so nothing waits and nothing escapes.',
  },
];

const sameScenario = (first: Scenario, second: Scenario): boolean =>
  (Object.keys(first) as (keyof Scenario)[]).every((key) => first[key] === second[key]);

/** The preset whose numbers match a scenario exactly, if there is one. */
export const presetMatching = (scenario: Scenario): Preset | undefined =>
  presets.find((preset) => sameScenario(preset.scenario, scenario));
