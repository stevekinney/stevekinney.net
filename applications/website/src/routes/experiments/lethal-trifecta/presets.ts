import { ciNodes, defaultCiScenario } from './ci-scenarios';
import type { CiScenario } from './ci-scenarios';
import type { TrifectaState } from './evaluate';
import { controls, nodes } from './model';
import type { ControlId, NodeId } from './model';

/**
 * A coding agent on a laptop, as it comes: everything it reads, everything it
 * can reach, and the five ways out it has without asking. MCP write actions
 * and deferred execution start off until their vector card turns them on.
 */
export const defaultNodes: Record<NodeId, boolean> = {
  issues: true,
  'web-pages': true,
  dependencies: true,
  'mcp-results': true,
  'ci-payloads': false,
  'cloned-repositories': true,
  environment: true,
  'env-files': true,
  source: true,
  'customer-data': false,
  transcripts: true,
  'shell-network': true,
  'unsandboxed-shell': true,
  'web-fetch': true,
  'git-push': true,
  'public-comment': true,
  'mcp-write': false,
  'deferred-execution': false,
};

export const noControls = Object.fromEntries(controls.map(({ id }) => [id, false])) as Record<
  ControlId,
  boolean
>;

const withControls = (...on: ControlId[]): Record<ControlId, boolean> => ({
  ...noControls,
  ...Object.fromEntries(on.map((id) => [id, true])),
});

export const defaultState = (): TrifectaState => ({
  nodes: { ...defaultNodes },
  controls: { ...noControls },
  allowlist: [],
  excludedNetworkCommand: false,
  ci: null,
});

export type Preset = {
  id: string;
  name: string;
  notice: string;
  state: () => TrifectaState;
};

export const presets: Preset[] = [
  {
    id: 'default',
    name: 'Default coding agent',
    notice:
      'All three legs are intact. You don’t choose whether that’s true. You choose which leg to cut.',
    state: defaultState,
  },
  {
    id: 'careful',
    name: 'Careful team',
    notice:
      'A firm line in CLAUDE.md, auto mode, and a curl deny. It looks careful, and none of it is a boundary.',
    state: () => ({
      ...defaultState(),
      controls: withControls('claude-md-line', 'auto-mode', 'deny-curl'),
    }),
  },
  {
    id: 'allowlist',
    name: 'Sandboxed, with a convenient allowlist',
    notice:
      'Default-deny egress, no unsandboxed retries, no web fetch, and a prompt on push. Then gist.github.com went on the allowlist, because something needed it.',
    state: () => ({
      ...defaultState(),
      controls: withControls(
        'default-deny-egress',
        'no-unsandboxed-retry',
        'deny-web-fetch',
        'publish-gate',
      ),
      allowlist: ['gist.github.com'],
    }),
  },
  {
    id: 'reader-doer',
    name: 'Reader/doer split',
    notice:
      'The agent that acts never sees the raw payload, so the untrusted-content leg is cut by the architecture.',
    state: () => ({ ...defaultState(), controls: withControls('reader-doer') }),
  },
  {
    id: 'container',
    name: 'Container, credentials outside, default-deny egress',
    notice:
      'The way out is cut. Private data is narrowed, not cut: tokens and credentials are out of reach, but the repository source is still there.',
    state: () => ({
      ...defaultState(),
      controls: withControls('container', 'default-deny-egress'),
    }),
  },
];

export const customNotice = 'Custom setup. Pick a preset to get back to a worked example.';

export const findPreset = (id: string | null | undefined): Preset | undefined =>
  presets.find((preset) => preset.id === id);

/** The state for a CI scenario: the CI agent's nodes, no controls, and the scenario itself. */
export const ciState = (scenario: CiScenario = defaultCiScenario): TrifectaState => ({
  ...defaultState(),
  nodes: { ...defaultNodes, ...ciNodes(scenario) },
  ci: { ...scenario },
});

/** Whether two states hold the same toggles. */
export const statesEqual = (first: TrifectaState, second: TrifectaState): boolean =>
  nodes.every(({ id }) => first.nodes[id] === second.nodes[id]) &&
  controls.every(({ id }) => first.controls[id] === second.controls[id]) &&
  first.excludedNetworkCommand === second.excludedNetworkCommand &&
  [...first.allowlist].sort().join() === [...second.allowlist].sort().join() &&
  JSON.stringify(first.ci) === JSON.stringify(second.ci);

/** The preset a state matches exactly, if any. */
export const presetMatching = (state: TrifectaState): Preset | undefined =>
  presets.find((preset) => statesEqual(preset.state(), state));
