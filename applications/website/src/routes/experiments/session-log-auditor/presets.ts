/**
 * Synthetic session sets to try the auditor without your own transcripts.
 * Each one is generated here, in the shape Claude Code writes, and read
 * through the same path as dropped files. None of it is real data.
 */
import { presetSummaries } from './preset-list';
import type { PresetSummary } from './preset-list';
import { createSessionWriter, syntheticSessionId } from './synthetic-sessions';
import type { SessionInfo, SessionWriter } from './synthetic-sessions';

export type PresetFile = { path: string; text: string };

export type Preset = PresetSummary & { files: () => PresetFile[] };

const DAY = 86_400_000;

const timeOn = (day: number, minute: number, start = Date.UTC(2026, 7, 17, 9)): string =>
  new Date(start + day * DAY + minute * 60_000).toISOString();

const projectFolder = (cwd: string): string => `projects/${cwd.replace(/\//g, '-')}`;

type Failure = { tool: string; command?: string; content: string };

const failures = {
  timeout: {
    tool: 'Bash',
    command: 'timeout 60 bun run test',
    content: 'Exit code 127\nzsh: command not found: timeout',
  },
  nomatch: {
    tool: 'Bash',
    command: 'git add src/routes/blog/[slug]/+page.svelte',
    content: 'Exit code 1\nzsh: no matches found: src/routes/blog/[slug]/+page.svelte',
  },
  ghFlag: {
    tool: 'Bash',
    command: 'gh pr list --json number,title --merged-by me',
    content: 'Exit code 1\nunknown flag: --merged-by\n\nUsage:  gh pr list [flags]',
  },
  bunTypes: {
    tool: 'Bash',
    command: 'bunx tsc --noEmit',
    content:
      "Exit code 2\nerror TS2688: Cannot find type definition file for 'bun-types'.\n  The file is in the program because:\n    Entry point of type library 'bun-types' specified in compilerOptions",
  },
  python: {
    tool: 'Bash',
    command: 'python3 scripts/seed.py',
    content:
      'Exit code 1\nTraceback (most recent call last):\n  File "/work/api/scripts/seed.py", line 3, in <module>\n    import yaml\nModuleNotFoundError: No module named \'yaml\'',
  },
  testFailure: {
    tool: 'Bash',
    command: 'bun run test',
    content:
      'Exit code 1\n FAIL  src/cart.test.ts > applies the discount\nAssertionError: expected 90 to be 81',
  },
  notRead: {
    tool: 'Edit',
    content:
      '<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>',
  },
  missingConfig: {
    tool: 'Bash',
    command: 'cat config/local.json',
    content: 'Exit code 1\ncat: config/local.json: No such file or directory',
  },
  permission: {
    tool: 'Bash',
    command: './scripts/deploy.sh',
    content: 'Exit code 126\nzsh: permission denied: ./scripts/deploy.sh',
  },
  database: {
    tool: 'Bash',
    command: 'bun run db:migrate',
    content: 'Exit code 1\nError: connect ECONNREFUSED 127.0.0.1:5432',
  },
  pnpm: {
    tool: 'Bash',
    command: 'pnpm install',
    content: 'Exit code 127\nzsh: command not found: pnpm',
  },
} satisfies Record<string, Failure>;

/** Writes a session's ordinary turns, with one successful tool call each, then its failures. */
const writeSession = (
  writer: SessionWriter,
  {
    day,
    turns,
    failed,
    sessionNumber,
  }: { day: number; turns: number; failed: Failure[]; sessionNumber: number },
): void => {
  let minute = 0;
  let context = 18_000 + (sessionNumber % 5) * 3_000;

  for (let turn = 0; turn < turns; turn += 1) {
    const id = `msg_s${sessionNumber}_t${turn}`;
    const toolId = `toolu_s${sessionNumber}_t${turn}`;
    writer.at(timeOn(day, minute)).respond(
      id,
      {
        input: 6 + (turn % 4),
        cacheRead: turn === 0 ? 0 : context,
        write5m: turn === 0 ? context : 1_200 + (turn % 3) * 400,
        write1h: 0,
        output: 350 + ((turn * 137) % 900),
      },
      [{ id: toolId, name: turn % 3 === 0 ? 'Read' : 'Bash', command: 'git status' }],
    );
    writer.at(timeOn(day, minute + 1)).result(toolId, 'ok', false);
    context += 1_600;
    minute += 2;
  }

  failed.forEach((failure, index) => {
    const id = `msg_s${sessionNumber}_f${index}`;
    const toolId = `toolu_s${sessionNumber}_f${index}`;
    writer
      .at(timeOn(day, minute))
      .respond(id, { input: 4, cacheRead: context, write5m: 900, output: 220 }, [
        { id: toolId, name: failure.tool, command: failure.command },
      ]);
    writer.at(timeOn(day, minute + 1)).result(toolId, failure.content, true);
    minute += 2;
  });
};

const floorFixed = (): PresetFile[] => {
  const files: PresetFile[] = [];
  const repositories = [
    { cwd: '/work/storefront', branches: ['main', 'feature/cart'] },
    { cwd: '/work/api', branches: ['main'] },
  ];

  for (let index = 0; index < 24; index += 1) {
    const day = Math.round(index * 1.75);
    const date = timeOn(day, 0).slice(0, 10);
    const repository = repositories[index % 2];
    const sessionId = syntheticSessionId(index + 1);
    const info: SessionInfo = {
      sessionId,
      cwd: repository.cwd,
      gitBranch: repository.branches[Math.floor(index / 2) % repository.branches.length],
      version: date < '2026-09-01' ? '3.0.4' : '3.1.2',
      model:
        index === 5 ? 'claude-opus-5' : index % 7 === 3 ? 'claude-sonnet-5-5' : 'claude-opus-5-5',
    };

    const failed: Failure[] = [];
    if (date < '2026-09-01' && index % 3 !== 2) failed.push(failures.timeout);
    if (repository.cwd === '/work/storefront' && index % 3 === 0) failed.push(failures.nomatch);
    if (index % 4 === 1) failed.push(failures.ghFlag);
    if (repository.cwd === '/work/api' && date < '2026-09-08') failed.push(failures.bunTypes);
    if (index % 6 === 4) failed.push(failures.python);
    if (index % 3 === 1) failed.push(failures.testFailure, failures.testFailure);
    if (index % 5 === 2) failed.push(failures.notRead);
    if (index % 8 === 6) failed.push(failures.missingConfig);
    if (index === 13) failed.push(failures.permission);

    const writer = createSessionWriter(info);
    writeSession(writer, { day, turns: 6 + (index % 5), failed, sessionNumber: index + 1 });
    if (index % 4 === 3) writer.at(timeOn(day, 40)).compact('auto', 162_000 + index * 1_000, 9_400);
    if (index === 10) writer.at(timeOn(day, 42)).compact('manual', 312_693, 12_969);
    if (index === 20) writer.raw('{"type":"assistant","sessionId":"cut-off');

    const folder = projectFolder(repository.cwd);
    files.push({ path: `${folder}/${sessionId}.jsonl`, text: writer.text() });

    if (index % 5 === 0) {
      const agent = createSessionWriter(
        { ...info, model: 'claude-haiku-4-5' },
        { isSidechain: true },
      );
      writeSession(agent, {
        day,
        turns: 3,
        failed: index < 10 ? [failures.timeout] : [],
        sessionNumber: 1_000 + index,
      });
      files.push({
        path: `${folder}/${sessionId}/subagents/agent-a${index}.jsonl`,
        text: agent.text(),
      });
    }
  }

  return files;
};

const retryStorm = (): PresetFile[] => {
  const files: PresetFile[] = [];
  const write = (number: number, day: number, failed: Failure[]): void => {
    const sessionId = syntheticSessionId(100 + number);
    const writer = createSessionWriter({
      sessionId,
      cwd: '/work/api',
      gitBranch: 'main',
      version: '3.1.2',
      model: 'claude-opus-5-5',
    });
    writeSession(writer, { day, turns: 4, failed, sessionNumber: 100 + number });
    files.push({ path: `${projectFolder('/work/api')}/${sessionId}.jsonl`, text: writer.text() });
  };

  write(
    1,
    0,
    Array.from({ length: 200 }, () => failures.database),
  );
  write(2, 1, [failures.database, failures.pnpm]);
  write(3, 2, [failures.database, failures.pnpm]);
  write(4, 3, [failures.pnpm]);
  write(5, 4, [failures.pnpm]);

  return files;
};

const regression = (): PresetFile[] => {
  const files: PresetFile[] = [];

  for (let index = 0; index < 26; index += 1) {
    const day = index;
    const date = timeOn(day, 0).slice(0, 10);
    const sessionId = syntheticSessionId(200 + index);
    const writer = createSessionWriter({
      sessionId,
      cwd: '/work/storefront',
      gitBranch: 'main',
      version: date < '2026-09-01' ? '3.0.4' : '3.1.2',
      model: 'claude-opus-5-5',
    });
    const backAgain = date >= '2026-09-10';
    const failed = date < '2026-09-01' || backAgain ? [failures.timeout] : [failures.testFailure];
    writeSession(writer, { day, turns: 5, failed, sessionNumber: 200 + index });
    files.push({
      path: `${projectFolder('/work/storefront')}/${sessionId}.jsonl`,
      text: writer.text(),
    });
  }

  return files;
};

const generators: Record<string, () => PresetFile[]> = {
  'floor-fixed': floorFixed,
  'retry-storm': retryStorm,
  regression,
};

export const presets: readonly Preset[] = presetSummaries.map((summary) => ({
  ...summary,
  files: generators[summary.id],
}));

export const findPreset = (id: string | null): Preset | undefined =>
  presets.find((preset) => preset.id === id);
