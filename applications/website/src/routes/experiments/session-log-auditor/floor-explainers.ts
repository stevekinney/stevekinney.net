/**
 * “Why might this be the floor?” A short note for each floor category, with
 * the course outline’s examples and a fix pattern that makes the fix
 * executable instead of a note in an instructions file.
 */
export type Explainer = { title: string; examples: string[]; fix: string };

export const floorExplainers: Record<string, Explainer> = {
  'floor: missing tool': {
    title: 'A command the agent expected isn’t there',
    examples: [
      'macOS doesn’t ship a timeout command.',
      'A broken asdf Python shim broke 252 sessions until a version was pinned. Then it broke none.',
      'Non-interactive zsh didn’t have the usual PATH.',
    ],
    fix: 'Pin the tool’s version, install what’s missing, or set PATH for non-interactive shells. A SessionStart bootstrapper can check for the tools before the agent starts.',
  },
  'floor: shell option': {
    title: 'The shell aborted the command before it ran',
    examples: [
      'zsh’s nomatch option aborted any command containing a SvelteKit route like [slug].',
    ],
    fix: 'Set the shell option for agent shells, such as setopt no_nomatch, or have commands quote paths with brackets.',
  },
  'floor: environment': {
    title: 'A dependency or its types are missing',
    examples: [
      'A missing Bun types definition hit 131 sessions and vanished the moment the configuration was fixed.',
    ],
    fix: 'Fix the configuration once: install the dependency or add the types, and run a smoke test on entry so a red baseline is the first finding.',
  },
  'floor: CLI mismatch': {
    title: 'The agent guessed a flag the installed CLI rejects',
    examples: ['Agents kept guessing at gh --json fields that the installed CLI rejects.'],
    fix: 'Add the CLI’s accepted flags and fields to the instructions file, or pin the CLI to the version the agent expects.',
  },
  'floor: permissions': {
    title: 'The process can’t read, write, or run something it needs',
    examples: ['A script without its executable bit, or a folder owned by another user.'],
    fix: 'Fix the permission once in the repository or the environment, not in each session.',
  },
  'floor or task (ask)': {
    title: 'Could be the environment or the task',
    examples: [
      'A missing file can be a config the environment should provide, or a path the agent guessed wrong.',
    ],
    fix: 'Read the examples. If the same file is missing in session after session, it’s the floor: provide it or tell the agent where it lives.',
  },
};
