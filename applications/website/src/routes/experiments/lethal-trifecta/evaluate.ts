import { ciCuts } from './ci-scenarios';
import type { CiScenario } from './ci-scenarios';
import { exfiltrationMatches } from './domains';
import { exits, nodes, privateData, sources } from './model';
import type { ControlId, ExitId, GraphNode, Leg, NodeId, PrivateId, SourceId } from './model';

/** Everything the learner can change. One object, and every view derives from it. */
export type TrifectaState = {
  nodes: Record<NodeId, boolean>;
  controls: Record<ControlId, boolean>;
  /** Domains in the sandbox's allowlist, including ones that `WebFetch(domain:…)` allow rules add. */
  allowlist: string[];
  /** `sandbox.excludedCommands` includes a command that can reach the network. */
  excludedNetworkCommand: boolean;
  /** An agent in CI, or `null` for one on a laptop. */
  ci: CiScenario | null;
};

/** Why an edge is gone: a control, or the platform in a CI scenario. */
export type Cut = { control: ControlId | null; label: string };

export type EdgeState =
  /** The node is turned off, so there's no edge. */
  | 'absent'
  | 'live'
  /** Removed by a structural or architectural control. */
  | 'cut'
  /** Held only by a person reading a prompt. */
  | 'gated';

export type Edge = {
  node: GraphNode;
  state: EdgeState;
  cuts: Cut[];
  /** Extra words for a live edge, such as which allowlisted domain reopened it. */
  note: string | null;
  /** How the node reads at the end of a path sentence. */
  phrase: string;
  /** Every control that removes or narrows this edge when it's on, for highlighting. */
  touchedBy: ControlId[];
};

export type ExploitPath = {
  source: Edge;
  data: Edge;
  exit: Edge;
  sentence: string;
};

export type LegStatus = 'intact' | 'cut' | 'empty';

export type Residual = { kind: 'human-gate' | 'partial'; text: string };

export type Evaluation = {
  edges: Record<NodeId, Edge>;
  legs: Record<Leg, LegStatus>;
  exploitable: boolean;
  /** Names of the cut legs, such as "a way out". */
  cutLegNames: string[];
  path: ExploitPath | null;
  live: { sources: Edge[]; data: Edge[]; exits: Edge[] };
  residualRisks: Residual[];
  /** No untrusted content is enabled at all, which is unusual for a coding agent. */
  noSources: boolean;
};

const edge = (
  node: GraphNode,
  state: EdgeState,
  touchedBy: ControlId[],
  options: { cuts?: Cut[]; note?: string | null; phrase?: string } = {},
): Edge => ({
  node,
  state,
  cuts: options.cuts ?? [],
  note: options.note ?? null,
  phrase: options.phrase ?? node.phrase,
  touchedBy,
});

const sourceEdge = (node: GraphNode<SourceId>, state: TrifectaState): Edge => {
  const touchedBy: ControlId[] = ['reader-doer', 'plan-first'];
  if (!state.nodes[node.id]) return edge(node, 'absent', touchedBy);

  if (state.controls['reader-doer']) {
    return edge(node, 'cut', touchedBy, {
      cuts: [{ control: 'reader-doer', label: 'Reader/doer split' }],
    });
  }
  // A fixed plan decides which actions run, but the content still supplies their
  // arguments, such as the URL a planned fetch goes to. So it narrows the edge, and
  // only the reader/doer split cuts it.
  if (state.controls['plan-first']) {
    return edge(node, 'live', touchedBy, {
      note: 'Partial: fixes the actions, not their arguments. The content can still supply a value such as a destination URL.',
    });
  }

  return edge(node, 'live', touchedBy);
};

const dataEdge = (node: GraphNode<PrivateId>, state: TrifectaState): Edge => {
  const { controls } = state;
  const platform = ciCuts(state.ci)[node.id];
  const containerCut: Cut = { control: 'container', label: 'Container, credentials outside' };

  switch (node.id) {
    case 'environment': {
      const touchedBy: ControlId[] = ['container', 'environment-scrub'];
      if (!state.nodes[node.id]) return edge(node, 'absent', touchedBy);

      const cuts: Cut[] = [];
      if (controls.container) cuts.push(containerCut);
      if (controls['environment-scrub']) {
        cuts.push({ control: 'environment-scrub', label: 'Environment scrub' });
      }
      if (platform) cuts.push({ control: null, label: platform });

      return edge(node, cuts.length > 0 ? 'cut' : 'live', touchedBy, { cuts });
    }
    case 'env-files': {
      const touchedBy: ControlId[] = ['container', 'deny-read-env', 'sandbox-deny-read-env'];
      if (!state.nodes[node.id]) return edge(node, 'absent', touchedBy);
      if (controls.container) return edge(node, 'cut', touchedBy, { cuts: [containerCut] });

      const readTool = controls['deny-read-env'];
      const shell = controls['sandbox-deny-read-env'];
      if (readTool && shell) {
        return edge(node, 'cut', touchedBy, {
          cuts: [
            { control: 'deny-read-env', label: 'Read(**/.env*) deny' },
            { control: 'sandbox-deny-read-env', label: 'Sandbox denyRead' },
          ],
        });
      }
      if (readTool) {
        return edge(node, 'live', touchedBy, {
          note: 'The Read tool is denied, but cat .env in the shell still works.',
          phrase: 'a .env file read with cat',
        });
      }
      if (shell) {
        return edge(node, 'live', touchedBy, {
          note: 'The shell is denied, but the Read tool still reads it.',
          phrase: 'a .env file read with the Read tool',
        });
      }

      return edge(node, 'live', touchedBy);
    }
    case 'transcripts': {
      const touchedBy: ControlId[] = ['container'];
      if (!state.nodes[node.id]) return edge(node, 'absent', touchedBy);

      return controls.container
        ? edge(node, 'cut', touchedBy, { cuts: [containerCut] })
        : edge(node, 'live', touchedBy);
    }
    default:
      return edge(node, state.nodes[node.id] ? 'live' : 'absent', []);
  }
};

const networkExits: ExitId[] = [
  'shell-network',
  'unsandboxed-shell',
  'web-fetch',
  'git-push',
  'public-comment',
  'mcp-write',
];

const exitEdge = (node: GraphNode<ExitId>, state: TrifectaState): Edge => {
  const { controls } = state;
  const deny = controls['default-deny-egress'];
  // With a container, default-deny egress applies to the whole process, not only the shell.
  const wholeProcess = deny && controls.container;
  const reopenedBy = deny ? exfiltrationMatches(state.allowlist)[0] : undefined;
  const platform = ciCuts(state.ci)[node.id];
  const isNetwork = networkExits.includes(node.id);

  // Default-deny egress removes the shell network on its own, and every other network exit
  // only alongside a container, so a hover highlights only what the pair would remove.
  const egressControls: ControlId[] = [
    ...(node.id === 'shell-network' || controls.container
      ? (['default-deny-egress'] as ControlId[])
      : []),
    ...(deny ? (['container'] as ControlId[]) : []),
  ];
  const touchedBy: ControlId[] = [
    ...(isNetwork ? egressControls : []),
    ...((
      {
        'shell-network': ['deny-curl'],
        'unsandboxed-shell': ['no-unsandboxed-retry'],
        'web-fetch': ['deny-web-fetch'],
        'git-push': ['publish-gate'],
        'public-comment': ['publish-gate'],
        'mcp-write': [],
        'deferred-execution': ['fsmonitor-off'],
      } as Record<ExitId, ControlId[]>
    )[node.id] ?? []),
  ];

  if (!state.nodes[node.id]) return edge(node, 'absent', touchedBy);

  // An allowlisted exfiltration domain reopens the network layer: the shell's own egress, or
  // the whole process in a container. It doesn't undo a control on a particular exit, so each
  // exit still goes through its own checks below.
  const layerClosed = isNetwork && (wholeProcess || (deny && node.id === 'shell-network'));
  const layerReopened = layerClosed && reopenedBy !== undefined;

  /** A live edge, saying which allowlisted domain let it out when the network layer is closed. */
  const open = (options: { note?: string; phrase?: string } = {}): Edge => {
    if (!layerReopened || !reopenedBy) return edge(node, 'live', touchedBy, options);

    const { host, reason } = reopenedBy.domain;
    const allowlistNote = `Default-deny egress is on, but the allowlist admits ${host}. ${reason}`;

    return edge(node, 'live', touchedBy, {
      note: options.note ? `${options.note} ${allowlistNote}` : allowlistNote,
      phrase: `${options.phrase ?? node.phrase} to allowlisted ${host}`,
    });
  };

  if (layerClosed && !layerReopened) {
    return wholeProcess
      ? edge(node, 'cut', touchedBy, {
          cuts: [{ control: 'container', label: 'Container with default-deny egress' }],
        })
      : edge(node, 'cut', touchedBy, {
          cuts: [{ control: 'default-deny-egress', label: 'Default-deny egress' }],
        });
  }

  switch (node.id) {
    case 'shell-network': {
      if (layerReopened) return open();
      if (controls['deny-curl']) {
        return open({
          note: 'curl is denied. wget, python, node, and the rest are not.',
          phrase: 'the shell network, through any HTTP client but curl',
        });
      }

      return open();
    }
    case 'unsandboxed-shell': {
      if (controls['no-unsandboxed-retry']) {
        if (state.excludedNetworkCommand) {
          return open({
            note: 'Retries are off, but an excluded command can reach the network outside the sandbox.',
            phrase: 'an excluded command outside the sandbox',
          });
        }

        return edge(node, 'cut', touchedBy, {
          cuts: [{ control: 'no-unsandboxed-retry', label: 'allowUnsandboxedCommands: false' }],
        });
      }

      return open();
    }
    case 'web-fetch':
      return controls['deny-web-fetch']
        ? edge(node, 'cut', touchedBy, {
            cuts: [{ control: 'deny-web-fetch', label: 'Web-fetch deny' }],
          })
        : open();
    case 'git-push':
    case 'public-comment': {
      if (platform)
        return edge(node, 'cut', touchedBy, { cuts: [{ control: null, label: platform }] });

      return controls['publish-gate']
        ? edge(node, 'gated', touchedBy, {
            cuts: [{ control: 'publish-gate', label: 'Prompt on push and publish' }],
          })
        : open();
    }
    case 'mcp-write':
      return open();
    case 'deferred-execution':
      // core.fsmonitor is one vector. Git hooks and build scripts run later are others.
      return controls['fsmonitor-off']
        ? edge(node, 'live', touchedBy, {
            note: 'Partial: core.fsmonitor only. Git hooks and build scripts that run later, outside the sandbox, still run what the agent wrote.',
            phrase: 'a Git hook or build script that runs later',
          })
        : edge(node, 'live', touchedBy);
    default:
      return edge(node, 'live', touchedBy);
  }
};

const legStatus = (edges: Edge[]): LegStatus => {
  const present = edges.filter((candidate) => candidate.state !== 'absent');
  if (present.length === 0) return 'empty';

  return present.some((candidate) => candidate.state === 'live') ? 'intact' : 'cut';
};

export const pathSentence = (source: Edge, data: Edge, exit: Edge): string =>
  `${source.phrase} → agent context ← ${data.phrase} → ${exit.phrase}.`;

export const evaluate = (state: TrifectaState): Evaluation => {
  const sourceEdges = sources.map((node) => sourceEdge(node, state));
  const dataEdges = privateData.map((node) => dataEdge(node, state));
  const exitEdges = exits.map((node) => exitEdge(node, state));

  const edges = Object.fromEntries(
    [...sourceEdges, ...dataEdges, ...exitEdges].map((candidate) => [candidate.node.id, candidate]),
  ) as Record<NodeId, Edge>;

  const legs: Record<Leg, LegStatus> = {
    untrusted: legStatus(sourceEdges),
    private: legStatus(dataEdges),
    exit: legStatus(exitEdges),
  };

  const live = {
    sources: sourceEdges.filter((candidate) => candidate.state === 'live'),
    data: dataEdges.filter((candidate) => candidate.state === 'live'),
    exits: exitEdges.filter((candidate) => candidate.state === 'live'),
  };

  const exploitable =
    legs.untrusted === 'intact' && legs.private === 'intact' && legs.exit === 'intact';

  // Every path has the same length, so the shortest is the first in the catalog's order,
  // which lists the most common vectors first.
  const path: ExploitPath | null = exploitable
    ? {
        source: live.sources[0],
        data: live.data[0],
        exit: live.exits[0],
        sentence: pathSentence(live.sources[0], live.data[0], live.exits[0]),
      }
    : null;

  const cutLegNames = [
    // Only the reader/doer split cuts a source.
    ...(legs.untrusted === 'cut' ? ['untrusted content reaching the acting agent'] : []),
    ...(legs.private === 'cut' ? ['private data'] : []),
    ...(legs.exit === 'cut' ? ['a way out'] : []),
  ];

  const residualRisks: Residual[] = [];
  const firstSource = live.sources[0];
  const firstData = live.data[0];

  if (firstSource && firstData) {
    for (const gated of exitEdges.filter((candidate) => candidate.state === 'gated')) {
      residualRisks.push({
        kind: 'human-gate',
        text: `${pathSentence(firstSource, firstData, gated).slice(0, -1)}, held only by the prompt on push and publish. It holds while you actually read the prompts.`,
      });
    }
  }

  if (state.controls['deny-curl'] && edges['shell-network'].state === 'live') {
    residualRisks.push({
      kind: 'partial',
      text: 'Bash(curl *) deny blocks curl only. wget, python, node, nc, and git still reach the network.',
    });
  }
  if (state.controls['plan-first'] && live.sources.length > 0) {
    residualRisks.push({
      kind: 'partial',
      text: 'Planning before reading fixes which actions run, not their arguments. An issue can still supply the URL a planned fetch goes to.',
    });
  }
  if (edges['env-files'].state === 'live' && edges['env-files'].note) {
    residualRisks.push({ kind: 'partial', text: `.env files: ${edges['env-files'].note}` });
  }
  if (state.nodes['deferred-execution'] && state.controls['fsmonitor-off']) {
    residualRisks.push({
      kind: 'partial',
      text: 'core.fsmonitor is one deferred-execution vector. Git hooks and build scripts you run later outside the sandbox are others.',
    });
  }

  return {
    edges,
    legs,
    exploitable,
    cutLegNames,
    path,
    live,
    residualRisks,
    noSources: legs.untrusted === 'empty',
  };
};

/** The node IDs in display order, for code that walks every edge. */
export const nodeIds = nodes.map((node) => node.id);
