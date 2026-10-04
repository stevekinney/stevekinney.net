import { findVersion } from './versions';
import type { Version } from './versions';

/** An agent found on a line of `grep -H '^model:'` output. */
export type PastedAgent = {
  name: string;
  /** The path as printed, such as `.claude/agents/reviewer.md`. */
  path: string;
  /** The raw value after `model:`. */
  model: string;
};

/** Where a pasted environment value came from: `=` means the shell, `":"` means a settings file. */
export type PastedValue = { raw: string; origin: 'shell' | 'settings' };

export type PastedOutput = {
  version: Version | null;
  force: PastedValue | null;
  environmentModel: PastedValue | null;
  agents: PastedAgent[];
  /** How many lines were understood, and how many weren't. */
  understood: number;
  ignored: number;
};

// The base name is a prefix of the FORCE name, so FORCE is matched first and the base name must not be followed by `_FORCE`.
const forcePattern = /CLAUDE_CODE_SUBAGENT_MODEL_FORCE["']?\s*([=:])\s*["']?([^"',\s]*)/;
const environmentPattern = /CLAUDE_CODE_SUBAGENT_MODEL(?!_FORCE)["']?\s*([=:])\s*["']?([^"',\s]*)/;
const modelValuePattern = /^["']?([A-Za-z0-9._[\]-]+)["']?\s*$/;

const originOf = (separator: string): PastedValue['origin'] =>
  separator === '=' ? 'shell' : 'settings';

/**
 * Reads one grep-style agent line. It takes the last `model:` on the line, so
 * a Windows drive letter's colon in the path is left alone, and names the
 * agent after the file: the path before `:line:` without its folders and `.md`.
 */
export const parseAgentLine = (line: string): PastedAgent | null => {
  const marker = line.lastIndexOf('model:');
  if (marker === -1) return null;

  const valueMatch = modelValuePattern.exec(line.slice(marker + 'model:'.length).trim());
  if (!valueMatch) return null;

  const prefix = line.slice(0, marker).trim().replace(/:$/, '').replace(/:\d+$/, '');
  const base = prefix.split(/[\\/]/).at(-1) ?? '';
  const name = base.replace(/\.md$/i, '');

  return name === '' ? null : { name, path: prefix, model: valueMatch[1] };
};

/**
 * Reads the output of the commands the tool suggests. It works line by line,
 * in any order, and tolerates partial output.
 */
export const parsePastedOutput = (text: string): PastedOutput => {
  const result: PastedOutput = {
    version: null,
    force: null,
    environmentModel: null,
    agents: [],
    understood: 0,
    ignored: 0,
  };
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;

    const force = forcePattern.exec(line);
    if (force) {
      result.force = { raw: force[2], origin: originOf(force[1]) };
      result.understood += 1;
      continue;
    }

    const environment = environmentPattern.exec(line);
    if (environment) {
      result.environmentModel = { raw: environment[2], origin: originOf(environment[1]) };
      result.understood += 1;
      continue;
    }

    const agent = parseAgentLine(line);
    if (agent) {
      const key = `${agent.name}\u0000${agent.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.agents.push(agent);
      }
      result.understood += 1;
      continue;
    }

    if (/claude/i.test(line) || /^v?\d+\.\d+\.\d+/.test(line)) {
      const version = findVersion(line);
      if (version) {
        result.version ??= version;
        result.understood += 1;
        continue;
      }
    }

    result.ignored += 1;
  }

  return result;
};

/** What the parser expects to see, shown when nothing in a paste is understood. */
export const exampleLines = [
  '2.1.289 (Claude Code)',
  'CLAUDE_CODE_SUBAGENT_MODEL=haiku',
  '"CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1",',
  '/Users/you/.claude/agents/reviewer.md:3:model: sonnet',
  'C:\\Users\\you\\.claude\\agents\\reviewer.md:3:model: haiku',
];
