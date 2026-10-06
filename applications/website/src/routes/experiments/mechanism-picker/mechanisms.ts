import type { RungId } from './ladder';

/**
 * Every mechanism the guide knows about. The content is the course outline's
 * editorial guidance, gathered from "The Operating Model", "Skill or Subagent?",
 * "Rungs on the Ladder", "Anti-Patterns with Hooks", "What to Use and when", and
 * "Choosing a Mechanism". It describes how the outline recommends using each
 * one, not how any tool behaves.
 */
export const mechanismIds = [
  'prompt',
  'instructions',
  'skill',
  'subagent',
  'agent-team',
  'permission',
  'hook',
  'workflow',
  'goal',
  'loop',
  'routine',
  'external-loop',
  'ci',
  'sandbox',
  'tool',
  'batch',
  'dispatch',
] as const;

export type MechanismId = (typeof mechanismIds)[number];

/** The map's x-axis: who or what decides that the mechanism runs. */
export const deciders = ['you', 'model', 'event', 'schedule'] as const;
export type Decider = (typeof deciders)[number];

export const deciderLabels: Record<Decider, string> = {
  you: 'You',
  model: 'The model',
  event: 'An event',
  schedule: 'A schedule',
};

/** The five concerns from the outline's operating model. */
export const concerns = ['context', 'capability', 'control', 'state', 'evidence'] as const;
export type Concern = (typeof concerns)[number];

export const concernLabels: Record<Concern, string> = {
  context: 'Context',
  capability: 'Capability',
  control: 'Control',
  state: 'State',
  evidence: 'Evidence',
};

export const concernQuestions: Record<Concern, string> = {
  context: 'What should the agent know?',
  capability: 'What can it do?',
  control: 'What’s allowed to happen, and when?',
  state: 'What survives this session?',
  evidence: 'What proves we did the thing?',
};

export type AntiPattern = {
  /** The tempting use, such as "Run a dependency audit every Monday." */
  pattern: string;
  why: string;
  better: string;
  /** Mechanisms the better choice points to, which the card links to. */
  instead: MechanismId[];
};

export type Mechanism = {
  id: MechanismId;
  name: string;
  /** Extra words for the name, such as "CLAUDE.md / AGENTS.md". */
  aside?: string;
  definition: string;
  holds: string;
  triggeredBy: string;
  decidedBy: Decider;
  /** The ladder rung it sits on, or `null` when it enforces nothing itself. */
  rung: RungId | null;
  /** What it can enforce, in the outline's words. */
  enforcement: string;
  cost: string;
  concerns: Concern[];
  fits: string[];
  antiPatterns: AntiPattern[];
  /** Where to go when this one is the wrong fit, and when. */
  useInstead: { id: MechanismId; when: string }[];
};

export const mechanisms: readonly Mechanism[] = [
  {
    id: 'prompt',
    name: 'Prompt',
    definition: 'Something you type into the session for the task in front of you.',
    holds: 'A one-off instruction',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: 'chat',
    enforcement: 'Asks, until compaction',
    cost: 'Only the turn it’s in, but it can vanish at the next compaction.',
    concerns: ['context'],
    fits: ['One edit you’re watching', 'The immediate goal of a task, and its acceptance test'],
    antiPatterns: [
      {
        pattern: 'Repeating the same rule at the start of every session.',
        why: 'A standing rule said only in chat is gone after compaction or a new session.',
        better: 'Put a standing rule in project instructions.',
        instead: ['instructions'],
      },
    ],
    useInstead: [
      { id: 'instructions', when: 'it’s a standing rule for every session' },
      { id: 'skill', when: 'it’s a procedure you keep retyping' },
    ],
  },
  {
    id: 'instructions',
    name: 'Project instructions',
    aside: 'CLAUDE.md / AGENTS.md',
    definition:
      'A file loaded into every session that holds the project’s standing rules and operational facts.',
    holds: 'Standing rules and operational facts',
    triggeredBy: 'Loaded each session',
    decidedBy: 'event',
    rung: 'instructions',
    enforcement: 'Asks, if it loads',
    cost: 'Every line is in context on every turn of every session.',
    concerns: ['context', 'state'],
    fits: [
      'Run `pnpm test:billing` from `apps/api` after billing changes.',
      'Where to look for documentation, and when it’s worth reading',
      'Project-wide conventions',
    ],
    antiPatterns: [
      {
        pattern: 'A giant living wiki.',
        why: 'Too much always-loaded detail hides the few rules that do matter.',
        better: 'Tell the agent where the documentation is and when to go looking.',
        instead: ['skill'],
      },
      {
        pattern: '“Never read .env files.”',
        why: 'An instruction is a request, not a guarantee.',
        better: 'A permission deny rule, and credentials kept out of reach.',
        instead: ['permission', 'sandbox'],
      },
      {
        pattern: '“Maintain high quality code.”',
        why: 'It’s hard to test or act on, so it changes no decision.',
        better: 'When $trigger, do $action, then verify $result.',
        instead: [],
      },
      {
        pattern: 'A multi-step procedure for one kind of task.',
        why: 'It loads into every session whether or not the task comes up.',
        better: 'A skill, with a one-line pointer left behind.',
        instead: ['skill'],
      },
    ],
    useInstead: [
      { id: 'permission', when: 'it must hold every time' },
      { id: 'skill', when: 'it’s a procedure, not a standing rule' },
      { id: 'hook', when: 'it’s deterministic, such as formatting' },
    ],
  },
  {
    id: 'skill',
    name: 'Skill',
    definition:
      'Reusable instructions, and any scripts or references they need, loaded when the task calls for them.',
    holds: 'A reusable procedure or knowledge',
    triggeredBy: 'The model, or you with a slash command',
    decidedBy: 'model',
    rung: 'skill',
    enforcement: 'Asks, if it activates',
    cost: 'Its description loads every session. The body loads only when it activates.',
    concerns: ['context', 'capability'],
    fits: [
      'How to investigate a failed billing contract test',
      'A workflow you want to steer step by step yourself',
      'Interpreting what a tool returns, such as version changes and their risk',
    ],
    antiPatterns: [
      {
        pattern: 'Two or more skills with near-duplicate descriptions.',
        why: 'The model can’t tell which one to activate.',
        better: 'One skill, or descriptions that say when each applies.',
        instead: [],
      },
      {
        pattern: 'Burying the reasons to call the skill in its body.',
        why: 'Only the description is loaded until it activates.',
        better: 'Put triggers and exclusions in the description.',
        instead: [],
      },
      {
        pattern: 'A short operational fact as a skill.',
        why: 'It may never activate, and it’s one line.',
        better: 'Keep it in project instructions.',
        instead: ['instructions'],
      },
    ],
    useInstead: [
      { id: 'subagent', when: 'it needs a different model, tools, or permissions' },
      { id: 'hook', when: 'it must run every time, deterministically' },
      { id: 'tool', when: 'it’s a capability rather than instructions' },
    ],
  },
  {
    id: 'subagent',
    name: 'Subagent',
    definition:
      'A separate agent with its own context that takes an independent, bounded task and reports back.',
    holds: 'An independent, bounded task in its own context',
    triggeredBy: 'The model, or you by name or @-mention',
    decidedBy: 'model',
    rung: null,
    enforcement: 'No enforcement of its own. Permissions decide what it can do.',
    cost: 'Its own context and tokens. You get back a summary, not the whole investigation.',
    concerns: ['context', 'capability', 'evidence'],
    fits: [
      'Three to five independent investigations',
      'A huge investigation you want compressed',
      'An independent, adversarial opinion',
      'A different model, tools, or permissions for one task',
    ],
    antiPatterns: [
      {
        pattern: 'Telling a worker not to edit files and calling it read-only.',
        why: 'Hidden authority: only permissions make it read-only.',
        better: 'Restrict its tools and permissions.',
        instead: ['permission'],
      },
      {
        pattern: 'Delegating a task smaller than the hand-off.',
        why: 'Integration costs exceed parallel savings.',
        better: 'Just do it in the session.',
        instead: ['prompt'],
      },
      {
        pattern: 'Spawning a new agent to get past a denial.',
        why: 'If the denial was right, you’ve bypassed it. If it was wrong, fix the rule.',
        better: 'Fix the permission rule.',
        instead: ['permission'],
      },
    ],
    useInstead: [
      { id: 'agent-team', when: 'workers have to change each other’s minds mid-task' },
      { id: 'workflow', when: 'it’s dozens of agents, or an orchestration you’ll rerun' },
      { id: 'skill', when: 'you need reusable instructions, not another context' },
    ],
  },
  {
    id: 'agent-team',
    name: 'Agent team',
    definition:
      'Subagents that share a task list and message each other directly instead of only reporting to a lead.',
    holds: 'Workers who must change each other’s minds mid-task',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'A three-teammate team runs about 3–4× the tokens of one sequential session.',
    concerns: ['capability'],
    fits: [
      'Competing hypotheses, where each teammate tries to disprove the others',
      'Multi-lens review that argues about severity',
      'Cross-layer work after the contract between layers is frozen',
    ],
    antiPatterns: [
      {
        pattern: 'A team when the lead only needs final answers.',
        why: 'Subagents give the same parallelism for about half the tokens.',
        better: 'Subagents.',
        instead: ['subagent'],
      },
      {
        pattern: 'Teammates with no tools or model restriction.',
        why: 'They can inherit the ability to spawn more agents and recurse.',
        better: 'Give every role an explicit tools list and model.',
        instead: [],
      },
    ],
    useInstead: [
      { id: 'subagent', when: 'the lead only needs final answers' },
      { id: 'workflow', when: 'you need dozens of agents' },
    ],
  },
  {
    id: 'permission',
    name: 'Permission rule',
    definition: 'An allow, ask, or deny rule that the harness checks before every tool call.',
    holds: 'Allow, ask, or deny for a tool call',
    triggeredBy: 'Every tool call',
    decidedBy: 'event',
    rung: 'permission',
    enforcement: 'Refuses at the tool boundary',
    cost: 'Nothing per turn.',
    concerns: ['control'],
    fits: [
      'Never read `.env` files: deny `Read(**/.env*)`',
      'Keep a worker read-only',
      'Forbid a destructive command',
    ],
    antiPatterns: [
      {
        pattern: 'Treating a deny rule as the whole boundary for secrets.',
        why: 'The agent shouldn’t have the credentials at all.',
        better: 'Keep credentials out of reach.',
        instead: ['sandbox'],
      },
    ],
    useInstead: [
      { id: 'hook', when: 'the decision needs code, not a pattern' },
      { id: 'sandbox', when: 'it must hold no matter what the model thinks' },
    ],
  },
  {
    id: 'hook',
    name: 'Hook',
    definition:
      'Deterministic code the harness runs at a lifecycle event, such as after a tool call.',
    holds: 'Deterministic code at a lifecycle event',
    triggeredBy: 'That event',
    decidedBy: 'event',
    rung: 'hook',
    enforcement: 'Refuses at one event',
    cost: 'A script on every matching event. Whatever it prints back costs context.',
    concerns: ['control', 'evidence'],
    fits: [
      'Format every file the agent edits (`PostToolUse`)',
      'Block edits to generated files (`PreToolUse`)',
      'One command decides it’s done (`Stop`)',
      'Inject the branch and ticket at session start (`SessionStart`)',
    ],
    antiPatterns: [
      {
        pattern: 'Before every answer, rewrite the prompt into our preferred format.',
        why: 'It silently changes the interaction and can distort intent.',
        better: 'Clear instructions, or a planning skill you invoke explicitly.',
        instead: ['instructions', 'skill'],
      },
      {
        pattern: 'After every edit, ask another model whether the architecture is good.',
        why: 'It reviews unfinished work at an arbitrary point, over and over.',
        better: 'A review subagent after a coherent change.',
        instead: ['subagent'],
      },
      {
        pattern: 'Whenever a command uses npm, secretly rewrite it to Bun.',
        why: 'It changes the requested operation instead of explaining the convention.',
        better:
          'Instructions first, then a targeted warning or rejection where there’s a concrete incompatibility.',
        instead: ['instructions'],
      },
      {
        pattern: 'Install dependencies and recreate infrastructure at every session start.',
        why: 'Merely opening a session becomes an expensive, mutating operation.',
        better: 'An explicit, idempotent setup command or provisioning process.',
        instead: [],
      },
      {
        pattern: 'Run a dependency audit every Monday.',
        why: 'Monday is a scheduling event, not an agent lifecycle event.',
        better: 'A scheduler or a scheduled CI job.',
        instead: ['routine'],
      },
      {
        pattern: 'When one subagent finishes, launch the next five and manage retries.',
        why: 'Dependencies, cancellation, state, and retries hide across callbacks.',
        better: 'An explicit coordinator or workflow runner.',
        instead: ['workflow'],
      },
      {
        pattern: 'Ensure all contributors obey this check.',
        why: 'A local agent hook is not the shared integration boundary.',
        better: 'Required CI checks and repository protections.',
        instead: ['ci'],
      },
    ],
    useInstead: [
      { id: 'ci', when: 'it has to hold for everyone' },
      { id: 'routine', when: 'it runs on a schedule' },
      { id: 'permission', when: 'a pattern can decide it' },
    ],
  },
  {
    id: 'workflow',
    name: 'Dynamic workflow',
    definition:
      'A script that fans work out to many agents in parallel, deterministically and resumably.',
    holds: 'A scripted fan-out of many agents',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'Every agent’s tokens. It warns after about 25 agents or 1.5 million projected tokens.',
    concerns: ['capability', 'state'],
    fits: [
      'Dozens to hundreds of agents',
      'An orchestration you’ll rerun',
      'A known fan-out you want deterministic and resumable',
    ],
    antiPatterns: [
      {
        pattern: 'A workflow when nothing can run in parallel.',
        why: 'Size the workflow to the work.',
        better: 'Direct agent dispatch.',
        instead: ['dispatch'],
      },
      {
        pattern: 'A workflow that needs human approval partway through.',
        why: 'A workflow script takes no input mid-run.',
        better: 'Direct agent dispatch.',
        instead: ['dispatch'],
      },
    ],
    useInstead: [
      { id: 'subagent', when: 'it’s three to five investigations' },
      { id: 'batch', when: 'it’s five to thirty worktree pull requests' },
      { id: 'dispatch', when: 'the plan may change or you must approve mid-run' },
    ],
  },
  {
    id: 'goal',
    name: '/goal',
    definition:
      'Keeps the session working until a separate, small model judges that a condition is met.',
    holds: 'A checkable outcome over many turns, judged by a separate model',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'Every turn, plus an evaluator call after each one. No hard spending cap.',
    concerns: ['state', 'evidence'],
    fits: ['A checkable outcome that takes many turns'],
    antiPatterns: [
      {
        pattern: 'A goal that one command could decide.',
        why: 'Don’t make a model judge what a command can decide.',
        better: 'A `Stop` hook.',
        instead: ['hook'],
      },
      {
        pattern: '“Make this polished.”',
        why: 'The target must be falsifiable.',
        better: 'Name the tests that must pass and the evidence to show.',
        instead: [],
      },
    ],
    useInstead: [
      { id: 'hook', when: 'one command decides it’s done' },
      { id: 'loop', when: 'you’re waiting, not working' },
      { id: 'external-loop', when: 'you need hard caps and fresh context' },
    ],
  },
  {
    id: 'loop',
    name: '/loop',
    definition:
      'Repeats a prompt on a schedule inside the current session, for noticing when something changes.',
    holds: 'Waiting and noticing a change while the session is open',
    triggeredBy: 'A schedule',
    decidedBy: 'schedule',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'Every run is a turn in the current conversation, so each costs a little more.',
    concerns: ['state'],
    fits: ['Watch for a deploy to finish while the session is open, ideally with a monitor'],
    antiPatterns: [
      {
        pattern: 'A loop for work that must happen while you’re away.',
        why: 'Everything in it dies with the session.',
        better: 'A routine or desktop scheduled task.',
        instead: ['routine'],
      },
      {
        pattern: 'A loop to move work toward an outcome.',
        why: '`/loop` is for waiting. `/goal` is for working.',
        better: '`/goal`.',
        instead: ['goal'],
      },
    ],
    useInstead: [
      { id: 'goal', when: 'the value is in moving work forward' },
      { id: 'routine', when: 'it has to outlive the session' },
    ],
  },
  {
    id: 'routine',
    name: 'Routine or scheduled task',
    definition: 'A prompt that runs on a schedule or an external event, without you there.',
    holds: 'Work that runs while you’re away',
    triggeredBy: 'Time or an event',
    decidedBy: 'schedule',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'A whole run each time it fires, with nobody watching.',
    concerns: ['state'],
    fits: ['Must run while you’re away', 'Run a dependency audit every Monday'],
    antiPatterns: [
      {
        pattern: 'Trusting a green status.',
        why: 'A green status means the process exited, not that the task succeeded.',
        better: 'An oracle other than the agent, and a notification on absence.',
        instead: ['ci'],
      },
      {
        pattern: 'A schedule that can fire itself.',
        why: 'Schedules can create infinite loops by accident.',
        better: 'Actor filters, idempotency keys, and run caps.',
        instead: [],
      },
    ],
    useInstead: [
      { id: 'loop', when: 'the session is open and you’re only waiting' },
      { id: 'ci', when: 'it’s a gate at integration' },
    ],
  },
  {
    id: 'external-loop',
    name: 'External loop (Ralph)',
    definition:
      'Your own script that starts a fresh agent for each attempt, with caps the agent can’t edit.',
    holds: 'Hard caps, fresh context each attempt',
    triggeredBy: 'Your script',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Your script decides',
    cost: 'Whatever your script caps it at.',
    concerns: ['control', 'state'],
    fits: ['Hard spending caps and fresh context for each attempt'],
    antiPatterns: [
      {
        pattern: 'A check the worker can edit its way past.',
        why: 'The oracle has to be out of the worker’s reach.',
        better: 'Run the check from the script, outside the worker.',
        instead: [],
      },
    ],
    useInstead: [{ id: 'goal', when: 'a continuing thread with no hard cap is fine' }],
  },
  {
    id: 'ci',
    name: 'Required CI check',
    definition:
      'A check that has to pass before anyone’s change merges, run by the shared pipeline.',
    holds: 'A gate for everyone at integration',
    triggeredBy: 'A push or pull request',
    decidedBy: 'event',
    rung: 'ci',
    enforcement: 'Refuses for everyone',
    cost: 'CI time on every push or pull request.',
    concerns: ['control', 'evidence'],
    fits: [
      'Ensure every contributor’s change passes the contract tests',
      'Forbidden imports, through the linter',
    ],
    antiPatterns: [
      {
        pattern: 'Relying on each person’s local hook instead.',
        why: 'A local agent hook is not the shared integration boundary.',
        better: 'Required checks and repository protections.',
        instead: [],
      },
    ],
    useInstead: [{ id: 'hook', when: 'you want feedback during the session, before a push' }],
  },
  {
    id: 'sandbox',
    name: 'OS, sandbox, or network',
    definition:
      'Containment outside the agent: what the operating system, sandbox, network, and credentials allow.',
    holds: 'Containment',
    triggeredBy: 'Always',
    decidedBy: 'event',
    rung: 'sandbox',
    enforcement: 'Refuses no matter what the model thinks',
    cost: 'Setup once. Nothing per turn.',
    concerns: ['control'],
    fits: [
      '“Don’t write to production”: the agent shouldn’t have the credentials',
      'Keeping secrets out of the agent’s reach',
    ],
    antiPatterns: [
      {
        pattern: 'Giving the agent production credentials and asking it to be careful.',
        why: 'An instruction can only ask.',
        better: 'Don’t hand it the credentials.',
        instead: [],
      },
    ],
    useInstead: [{ id: 'permission', when: 'a rule at the tool boundary is enough' }],
  },
  {
    id: 'tool',
    name: 'Tool or MCP server',
    definition:
      'Something the harness can do: a built-in tool, an installed command, or an MCP server.',
    holds: 'An external capability',
    triggeredBy: 'The model',
    decidedBy: 'model',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'Its tool definitions take context, and every call returns output.',
    concerns: ['capability'],
    fits: ['Query package registry data'],
    antiPatterns: [
      {
        pattern: 'A tool that’s really instructions about how to use another tool.',
        why: 'A tool is what the harness can do. A skill is how to do it.',
        better: 'A skill.',
        instead: ['skill'],
      },
    ],
    useInstead: [{ id: 'skill', when: 'it’s instructions about how to use a tool' }],
  },
  {
    id: 'batch',
    name: '/batch',
    definition: 'Splits one change into many independent worktree pull requests.',
    holds: 'Many parallel, independent pull requests',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'An agent for each pull request.',
    concerns: ['capability'],
    fits: ['Five to thirty worktree pull requests'],
    antiPatterns: [],
    useInstead: [{ id: 'workflow', when: 'it’s hundreds of agents or a rerunnable orchestration' }],
  },
  {
    id: 'dispatch',
    name: 'Direct agent dispatch',
    definition: 'You, or the main session, start each agent one step at a time.',
    holds: 'A plan that may change, and a person in the loop',
    triggeredBy: 'You',
    decidedBy: 'you',
    rung: null,
    enforcement: 'Not an enforcement mechanism',
    cost: 'One agent per step, with you reviewing between them.',
    concerns: ['control'],
    fits: [
      'Mid-run human approval, or a stop-and-verify handshake',
      'A graph with no real parallelism and a plan that may change',
    ],
    antiPatterns: [],
    useInstead: [{ id: 'workflow', when: 'the plan is stable and the parallel work is real' }],
  },
];

export const isMechanismId = (value: unknown): value is MechanismId =>
  typeof value === 'string' && (mechanismIds as readonly string[]).includes(value);

export const findMechanism = (id: MechanismId): Mechanism => {
  const mechanism = mechanisms.find((entry) => entry.id === id);
  if (!mechanism) throw new Error(`Unknown mechanism: ${id}`);

  return mechanism;
};

/** The mechanisms that serve a concern, for the filter chips. */
export const mechanismsFor = (concern: Concern): MechanismId[] =>
  mechanisms.filter((mechanism) => mechanism.concerns.includes(concern)).map(({ id }) => id);

/** The mechanisms grouped by who decides they run, for the list form of the map. */
export const groupByDecider = (): { decider: Decider; mechanisms: Mechanism[] }[] =>
  deciders.map((decider) => ({
    decider,
    mechanisms: mechanisms.filter((mechanism) => mechanism.decidedBy === decider),
  }));
