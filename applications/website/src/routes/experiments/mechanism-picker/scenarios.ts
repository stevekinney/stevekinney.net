import type { MechanismId } from './mechanisms';

export type Scenario = {
  id: string;
  /** The card's text, such as "Format every file the agent edits". */
  text: string;
  /** The outline's answer. */
  answer: MechanismId;
  /** How the outline puts the answer, such as "A `PostToolUse` hook, or the formatter itself". */
  answerDetail?: string;
  reasoning: string;
  /** Other answers the outline would defend. Picking one isn't a miss. */
  alternatives: { id: MechanismId; note: string }[];
  /** The answer people reach for instead, and why it's wrong. */
  tempting: { id: MechanismId | null; label: string; why: string } | null;
  /** Whether a learner wrote this card. */
  custom?: boolean;
};

/** The card shown before anything else, which most people answer with a hook. */
export const predictScenario: Scenario = {
  id: 'predict',
  text: 'Ensure all contributors obey this check',
  answer: 'ci',
  answerDetail: 'Required CI checks and repository protections',
  reasoning:
    'Only the shared pipeline sees everyone’s changes, so only a required check can refuse a change for everyone.',
  alternatives: [],
  tempting: {
    id: 'hook',
    label: 'Hook',
    why: 'A local agent hook is not the shared integration boundary.',
  },
};

export const outlineScenarios: readonly Scenario[] = [
  {
    id: 'format-every-file',
    text: 'Format every file the agent edits',
    answer: 'hook',
    answerDetail: 'A `PostToolUse` hook, or the formatter itself',
    reasoning:
      'Formatting is deterministic, so it goes to the formatter. A `PostToolUse` hook runs it on only the files the agent just changed.',
    alternatives: [],
    tempting: {
      id: 'instructions',
      label: 'Project instructions',
      why: '“Always format” in your instructions only asks.',
    },
  },
  {
    id: 'never-read-env',
    text: 'Never read `.env` files',
    answer: 'permission',
    answerDetail:
      'A permission deny on `Read(**/.env*)`, ideally with the credentials out of reach',
    reasoning:
      'It has to hold every time, and a permission rule refuses at the tool boundary. Better still, the agent never has the credentials.',
    alternatives: [
      {
        id: 'sandbox',
        note: 'Keeping the credentials out of the agent’s reach is stronger still.',
      },
    ],
    tempting: {
      id: 'instructions',
      label: 'Project instructions',
      why: 'An instruction is not a guarantee.',
    },
  },
  {
    id: 'monday-audit',
    text: 'Run a dependency audit every Monday',
    answer: 'routine',
    answerDetail: 'A scheduler or scheduled CI',
    reasoning: 'It runs on a calendar, whether or not anyone has a session open.',
    alternatives: [{ id: 'ci', note: 'As a scheduled CI job, rather than a required check.' }],
    tempting: {
      id: 'hook',
      label: 'Hook',
      why: 'Monday is a scheduling event, not an agent lifecycle event.',
    },
  },
  {
    id: 'contract-tests',
    text: 'Ensure every contributor’s change passes the contract tests',
    answer: 'ci',
    reasoning: 'It has to refuse for everyone, at the point where everyone’s changes meet.',
    alternatives: [],
    tempting: {
      id: 'hook',
      label: 'Hook',
      why: 'A local hook is not the shared integration boundary.',
    },
  },
  {
    id: 'investigate-billing',
    text: 'How to investigate a failed billing contract test',
    answer: 'skill',
    reasoning: 'It’s a reusable procedure that only matters when a billing test fails.',
    alternatives: [],
    tempting: {
      id: 'instructions',
      label: 'Project instructions',
      why: 'It’s a procedure, not a standing rule.',
    },
  },
  {
    id: 'billing-command',
    text: 'Run `pnpm test:billing` from `apps/api` after billing changes',
    answer: 'instructions',
    reasoning: 'It’s a standing rule with a command, a path, and a trigger.',
    alternatives: [],
    tempting: { id: 'skill', label: 'Skill', why: 'It’s a short operational fact.' },
  },
  {
    id: 'three-investigations',
    text: 'Three to five independent investigations',
    answer: 'subagent',
    answerDetail: 'Subagents in the background',
    reasoning: 'Each gets its own context and comes back with a summary.',
    alternatives: [],
    tempting: { id: 'workflow', label: 'Dynamic workflow', why: 'Too small for a workflow.' },
  },
  {
    id: 'hundreds-of-agents',
    text: 'Dozens to hundreds of agents, or an orchestration you’ll rerun',
    answer: 'workflow',
    reasoning: 'A script fans the work out deterministically and can resume it.',
    alternatives: [],
    tempting: {
      id: 'agent-team',
      label: 'Agent team',
      why: 'At that size, a team costs too much.',
    },
  },
  {
    id: 'workers-argue',
    text: 'Workers need to argue with each other',
    answer: 'agent-team',
    reasoning: 'Teammates message each other directly, so they can change each other’s minds.',
    alternatives: [],
    tempting: {
      id: 'subagent',
      label: 'Subagent',
      why: 'Subagents can’t change each other’s minds mid-task.',
    },
  },
  {
    id: 'checkable-outcome',
    text: 'A checkable outcome that takes many turns',
    answer: 'goal',
    reasoning: 'A separate model checks the condition after every turn and keeps the work going.',
    alternatives: [],
    tempting: { id: 'loop', label: '/loop', why: '`/loop` is for waiting, not working.' },
  },
  {
    id: 'one-command-decides',
    text: 'One command decides it’s done',
    answer: 'hook',
    answerDetail: 'A `Stop` hook',
    reasoning: 'A command is deterministic, so run it when the agent tries to stop.',
    alternatives: [],
    tempting: {
      id: 'goal',
      label: '/goal',
      why: 'Don’t make a model judge what a command can decide.',
    },
  },
  {
    id: 'watch-deploy',
    text: 'Watch for a deploy to finish while the session is open',
    answer: 'loop',
    answerDetail: '`/loop`, ideally with an event monitor',
    reasoning: 'The value is in noticing a change, and the session is open anyway.',
    alternatives: [],
    tempting: {
      id: 'goal',
      label: '/goal',
      why: 'There’s nothing to work toward. You’re waiting.',
    },
  },
  {
    id: 'while-away',
    text: 'Must run while you’re away',
    answer: 'routine',
    answerDetail: 'A routine or desktop scheduled task',
    reasoning: 'It has to outlive the session.',
    alternatives: [],
    tempting: { id: 'loop', label: '/loop', why: '`/loop` dies with the session.' },
  },
  {
    id: 'hard-caps',
    text: 'Hard spending caps and fresh context for each attempt',
    answer: 'external-loop',
    reasoning: 'Your script holds the caps and starts each attempt clean.',
    alternatives: [],
    tempting: {
      id: 'goal',
      label: '/goal',
      why: '`/goal` is a continuing thread with no hard cap.',
    },
  },
  {
    id: 'different-model',
    text: 'A different model, tools, or permissions for one task',
    answer: 'subagent',
    reasoning: 'You need another execution context, not reusable instructions.',
    alternatives: [],
    tempting: {
      id: 'skill',
      label: 'Skill',
      why: 'A skill is instructions. It runs in a context you already have.',
    },
  },
  {
    id: 'worktree-pull-requests',
    text: 'Five to thirty worktree pull requests',
    answer: 'batch',
    reasoning: '`/batch` already splits one change into independent worktree pull requests.',
    alternatives: [],
    tempting: {
      id: 'workflow',
      label: 'Dynamic workflow',
      why: 'Size the workflow to the work. This is smaller.',
    },
  },
  {
    id: 'one-edit',
    text: 'One edit you’re watching',
    answer: 'prompt',
    reasoning: 'You’re right there, and it happens once.',
    alternatives: [],
    tempting: {
      id: null,
      label: 'Anything heavier',
      why: 'Anything heavier costs more than the edit.',
    },
  },
  {
    id: 'mid-run-approval',
    text: 'Mid-run human approval is required',
    answer: 'dispatch',
    reasoning: 'You start each step yourself, so you can approve between them.',
    alternatives: [],
    tempting: {
      id: 'workflow',
      label: 'Dynamic workflow',
      why: 'A workflow takes no input mid-run.',
    },
  },
];

export type Grade = 'match' | 'alternative' | 'miss';

/** Whether a pick matches the outline. A defensible alternative is not a miss. */
export const grade = (scenario: Scenario, pick: MechanismId): Grade => {
  if (pick === scenario.answer) return 'match';
  if (scenario.alternatives.some((alternative) => alternative.id === pick)) return 'alternative';

  return 'miss';
};

/** Why a particular wrong pick is wrong, when the outline says. */
export const missReason = (scenario: Scenario, pick: MechanismId): string | null =>
  scenario.tempting && scenario.tempting.id === pick ? scenario.tempting.why : null;
