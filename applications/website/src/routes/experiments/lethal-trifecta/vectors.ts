import type { TrifectaState } from './evaluate';
import type { NodeId } from './model';

export type Vector = {
  id: string;
  title: string;
  body: string;
  /** A cited figure and where it comes from. */
  citation?: { text: string; source: string; href: string };
  /** The nodes "Show me" turns on. */
  nodes: NodeId[];
  /** Domains it adds to the allowlist. */
  allow?: string[];
};

export const vectors: Vector[] = [
  {
    id: 'deferred',
    title: 'Deferred execution',
    body: 'Can the agent write something that runs later, outside the sandbox? core.fsmonitor in a cloned repository’s .git/config is a command Git runs, with no prompt. The blunt fix is git config --global core.fsmonitor false.',
    nodes: ['cloned-repositories', 'deferred-execution'],
  },
  {
    id: 'allowlist',
    title: 'The allowlist is the exfiltration channel',
    body: 'gist.github.com, camo.githubusercontent.com, and huggingface.co are all good places to put stolen data. A domain you allowed for convenience reopens the exit you closed.',
    nodes: ['shell-network'],
    allow: ['gist.github.com'],
  },
  {
    id: 'http-clients',
    title: 'Bash(curl *) is not a network boundary',
    body: 'wget, python -c, node -e, nc, git, and a shell’s own /dev/tcp all make requests. Denying one client by name leaves the rest.',
    nodes: ['shell-network'],
  },
  {
    id: 'rug-pull',
    title: 'Tool output is input, and servers change',
    body: 'An MCP response can carry an injection as easily as a web page. A server can also show a clean tool description when you install it and a poisoned one later. That’s a rug pull.',
    nodes: ['mcp-results', 'mcp-write'],
  },
  {
    id: 'packages',
    title: 'Hallucinated package names',
    body: 'Models invent package names, and anyone can register one. The README and install scripts of that package are then written by whoever got there first.',
    citation: {
      text: 'At least 5.2% of commercial-model samples and 21.7% of open-source ones hallucinated packages, across 576,000 code samples.',
      source: 'Spracklen et al., “We Have a Package for You!”, USENIX Security 2025',
      href: 'https://arxiv.org/abs/2406.10279',
    },
    nodes: ['dependencies'],
  },
];

/** Turns a vector's nodes on, and adds its domains to the allowlist. */
export const showVector = (state: TrifectaState, vector: Vector): TrifectaState => ({
  ...state,
  nodes: { ...state.nodes, ...Object.fromEntries(vector.nodes.map((id) => [id, true])) },
  allowlist: [...new Set([...state.allowlist, ...(vector.allow ?? [])])],
});
