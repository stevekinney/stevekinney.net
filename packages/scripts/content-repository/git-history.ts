import { parseFrontmatter, toDateString } from '@stevekinney/utilities/frontmatter';

export type ContentHistory = {
  revision: string;
  modified: Map<string, string>;
  published: Map<string, string>;
  courses: Map<string, string>;
};

type Change = {
  commit: string;
  committer: number;
  author: number;
  oldHash: string;
  newHash: string;
  oldPath?: string;
  newPath: string;
};

type Alias = {
  canonical: string;
  kind: 'markdown' | 'toml';
};

type Commit = {
  hash: string;
  parents: string[];
  committer: number;
  author: number;
};

type FileState = { hash: string; semantic: string; published: string; modified?: string };
type RepositoryState = {
  files: Map<string, FileState>;
  courses: Map<string, string>;
  courseFingerprints: Map<string, string>;
};

const ZERO_HASH = /^0+$/;
const TARGET = /^(?:writing\/[^/]+\.md|courses\/[^/]+\/(?:README\.md|index\.toml|[^/]+\.md))$/;
const isMarkdown = (filePath: string): boolean => filePath.endsWith('.md');
const isCourseAnchor = (filePath: string): boolean =>
  filePath.endsWith('/README.md') || filePath.endsWith('/index.toml');
const courseFor = (filePath: string): string | undefined => {
  const match = filePath.match(/^courses\/([^/]+)\//);
  return match?.[1];
};
const fileKind = (filePath: string): Alias['kind'] => (isMarkdown(filePath) ? 'markdown' : 'toml');

const runGit = async (
  repositoryRoot: string,
  arguments_: string[],
  input?: string,
): Promise<Buffer> => {
  const process = Bun.spawn(['git', ...arguments_], {
    cwd: repositoryRoot,
    stdin: input === undefined ? undefined : 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (input !== undefined) {
    process.stdin.write(input);
    process.stdin.end();
  }
  const [output, error, exitCode] = await Promise.all([
    new Response(process.stdout).arrayBuffer(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(`git ${arguments_.join(' ')} failed: ${error.trim()}`);
  return Buffer.from(output);
};

const resolveRevision = async (repositoryRoot: string, revision: string): Promise<string> => {
  const shallow = (await runGit(repositoryRoot, ['rev-parse', '--is-shallow-repository']))
    .toString()
    .trim();
  if (shallow === 'true')
    throw new Error(
      'Cannot collect content history from a shallow repository; fetch full history first.',
    );
  try {
    await runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD']);
  } catch {
    throw new Error('Cannot collect content history: repository has no HEAD commit.');
  }
  const resolved = (await runGit(repositoryRoot, ['rev-parse', '--verify', `${revision}^{commit}`]))
    .toString()
    .trim();
  if (!resolved) throw new Error(`Cannot resolve content history revision: ${revision}`);
  return resolved;
};

const parseChanges = (raw: Buffer): Change[] => {
  const fields = raw.toString('utf8').split('\0');
  const changes: Change[] = [];
  let commit = '';
  let committer = 0;
  let author = 0;
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (/^[0-9a-f]{40}$/.test(field)) {
      commit = field;
      committer = Number(fields[++index]);
      author = Number(fields[++index]);
      continue;
    }
    const header = field.replace(/^\n/, '');
    if (!header.startsWith(':')) continue;
    const parts = header.trim().split(/\s+/);
    const status = parts.at(-1) ?? '';
    const oldHash = parts[2] ?? '';
    const newHash = parts[3] ?? '';
    const oldPath = fields[++index];
    const renamed = status.startsWith('R') || status.startsWith('C');
    const newPath = renamed ? fields[++index] : oldPath;
    if (newPath)
      changes.push({
        commit,
        committer,
        author,
        oldHash,
        newHash,
        oldPath: renamed ? oldPath : undefined,
        newPath,
      });
  }
  return changes;
};

const parseCommits = (raw: Buffer): Commit[] =>
  raw
    .toString('utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = '', committerText = '', authorText = '', ...parents] = line.split(' ');
      return {
        hash,
        parents,
        committer: Number(committerText),
        author: Number(authorText),
      };
    });

const parseTreePaths = (raw: Buffer): string[] => raw.toString('utf8').split('\0').filter(Boolean);

const buildAliases = (changes: Change[], currentPaths: string[]): Map<string, Alias> => {
  const aliases = new Map<string, Alias>();
  const reusedPaths = new Set<string>();
  const futureAdditions = new Set<string>();
  for (const change of changes.toReversed()) {
    if (change.oldPath && futureAdditions.has(change.oldPath)) reusedPaths.add(change.oldPath);
    if (ZERO_HASH.test(change.oldHash)) futureAdditions.add(change.newPath);
  }
  for (const filePath of currentPaths)
    aliases.set(filePath, { canonical: filePath, kind: fileKind(filePath) });
  const followRenames = (): void => {
    for (const change of changes.toReversed()) {
      const newAlias = aliases.get(change.newPath);
      if (
        !change.oldPath ||
        reusedPaths.has(change.oldPath) ||
        !newAlias ||
        aliases.has(change.oldPath)
      )
        continue;
      const oldCourse = courseFor(change.oldPath);
      const newCourse = courseFor(change.newPath);
      if (
        oldCourse === newCourse ||
        oldCourse === undefined ||
        newCourse === undefined ||
        isCourseAnchor(change.oldPath) ||
        isCourseAnchor(change.newPath)
      )
        aliases.set(change.oldPath, newAlias);
    }
  };
  followRenames();
  const courseAliases = new Map<string, string>();
  for (const [filePath, alias] of aliases) {
    if (!isCourseAnchor(filePath)) continue;
    const sourceCourse = courseFor(filePath);
    const canonicalCourse = courseFor(alias.canonical);
    if (sourceCourse && canonicalCourse) courseAliases.set(sourceCourse, canonicalCourse);
  }
  for (const change of changes) {
    for (const filePath of [change.newPath, change.oldPath]) {
      if (!filePath || !TARGET.test(filePath) || aliases.has(filePath)) continue;
      const sourceCourse = courseFor(filePath);
      const canonicalCourse = sourceCourse ? courseAliases.get(sourceCourse) : undefined;
      aliases.set(filePath, {
        canonical:
          sourceCourse && canonicalCourse
            ? filePath.replace(`courses/${sourceCourse}/`, `courses/${canonicalCourse}/`)
            : filePath,
        kind: fileKind(filePath),
      });
    }
  }
  // Deleted course files can have earlier names outside the current content roots.
  followRenames();
  return aliases;
};

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
};

const canonicalFrontmatterValue = (key: string, value: unknown): unknown => {
  if (typeof value !== 'string') return stable(value);
  if (key === 'date') return toDateString(value) ?? value.trim();
  return value.replace(/\s+/gu, ' ').trim();
};

const markdownSemantic = (contents: string, canonicalPath: string): string => {
  const normalized = contents.replaceAll('\r\n', '\n');
  let parsed;
  try {
    parsed = parseFrontmatter(normalized);
  } catch {
    return JSON.stringify({ raw: normalized });
  }
  const data = parsed.data as Record<string, unknown>;
  const fields =
    canonicalPath.startsWith('writing/') || canonicalPath.endsWith('/README.md')
      ? ['title', 'description', 'date']
      : ['title', 'description'];
  const frontmatter = Object.fromEntries(
    fields
      .filter((key) => data[key] !== undefined)
      .map((key) => [key, canonicalFrontmatterValue(key, data[key])]),
  );
  return JSON.stringify({ frontmatter, body: parsed.content.replaceAll('\r\n', '\n') });
};

const tomlSemantic = (contents: string): string => {
  const normalized = contents.replaceAll('\r\n', '\n');
  try {
    return JSON.stringify(stable(Bun.TOML.parse(normalized)));
  } catch {
    return JSON.stringify({ raw: normalized });
  }
};

const readBlobs = async (
  repositoryRoot: string,
  hashes: Set<string>,
): Promise<Map<string, string>> => {
  const wanted = [...hashes].filter((hash) => hash && !ZERO_HASH.test(hash));
  if (wanted.length === 0) return new Map();
  const output = await runGit(repositoryRoot, ['cat-file', '--batch'], `${wanted.join('\n')}\n`);
  const bytes = output;
  const result = new Map<string, string>();
  let offset = 0;
  for (const hash of wanted) {
    const endHeader = bytes.indexOf(10, offset);
    if (endHeader < 0) break;
    const header = bytes.subarray(offset, endHeader).toString();
    const [returnedHash, type, sizeText] = header.split(' ');
    const size = Number(sizeText);
    if (!returnedHash || type !== 'blob' || !Number.isSafeInteger(size) || size < 0)
      throw new Error(`git cat-file returned an invalid blob response for ${hash}`);
    const bodyStart = endHeader + 1;
    result.set(hash, bytes.subarray(bodyStart, bodyStart + size).toString());
    offset = bodyStart + size + 1;
  }
  if (result.size !== wanted.length)
    throw new Error('git cat-file returned fewer blobs than requested for content history.');
  return result;
};

const dateIso = (seconds: number): string => new Date(seconds * 1000).toISOString();
const dateOnly = (seconds: number): string => dateIso(seconds).slice(0, 10);

const emptyState = (): RepositoryState => ({
  files: new Map(),
  courses: new Map(),
  courseFingerprints: new Map(),
});

const cloneState = (state: RepositoryState): RepositoryState => ({
  files: new Map(state.files),
  courses: new Map(state.courses),
  courseFingerprints: new Map(state.courseFingerprints),
});

const courseFingerprint = (files: Map<string, FileState>, slug: string): string => {
  const entries = [...files.entries()]
    .filter(([filePath]) => courseFor(filePath) === slug)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries.map(([filePath, state]) => [filePath, state.semantic]));
};

const matchingParentFileState = (
  parents: RepositoryState[],
  filePath: string,
  semantic: string,
): FileState | undefined =>
  parents.map((parent) => parent.files.get(filePath)).find((state) => state?.semantic === semantic);

const matchingParentCourseDate = (
  parents: RepositoryState[],
  slug: string,
  fingerprint: string,
): string | undefined =>
  parents.find((parent) => parent.courseFingerprints.get(slug) === fingerprint)?.courses.get(slug);

const canonicalChangePath = (
  aliases: Map<string, Alias>,
  change: Change,
): { oldPath?: string; newPath?: string; kind: Alias['kind'] } | null => {
  const newAlias = aliases.get(change.newPath);
  const oldAlias = change.oldPath ? aliases.get(change.oldPath) : undefined;
  const alias = newAlias ?? oldAlias;
  if (!alias) return null;
  return {
    oldPath: oldAlias?.canonical,
    newPath: newAlias?.canonical ?? alias.canonical,
    kind: alias.kind,
  };
};

export const collectContentHistory = async (
  repositoryRoot: string,
  requestedRevision?: string,
): Promise<ContentHistory> => {
  const revision = await resolveRevision(
    repositoryRoot,
    requestedRevision ?? process.env.CONTENT_GIT_REVISION ?? 'HEAD',
  );
  const commits = parseCommits(
    await runGit(repositoryRoot, [
      'log',
      '--reverse',
      '--topo-order',
      '--format=%H %ct %at %P',
      revision,
    ]),
  );
  const currentPaths = parseTreePaths(
    await runGit(repositoryRoot, [
      'ls-tree',
      '-rz',
      '--name-only',
      revision,
      '--',
      'writing',
      'courses',
    ]),
  ).filter((filePath) => TARGET.test(filePath));
  const raw = await runGit(repositoryRoot, [
    'log',
    '--reverse',
    '--topo-order',
    '--raw',
    '-z',
    '--format=%H%x00%ct%x00%at',
    '--full-history',
    '--sparse',
    '-M',
    '--diff-merges=first-parent',
    '--root',
    revision,
    '--',
    ':(glob)**/*.md',
    ':(glob)**/*.toml',
  ]);
  const allChanges = parseChanges(raw);
  const aliases = buildAliases(allChanges, currentPaths);
  const changes = allChanges.filter((change) =>
    Boolean(aliases.get(change.newPath) ?? (change.oldPath && aliases.get(change.oldPath))),
  );
  const hashes = new Set<string>();
  for (const change of changes) {
    hashes.add(change.oldHash);
    hashes.add(change.newHash);
  }
  const blobs = await readBlobs(repositoryRoot, hashes);
  const changesByCommit = new Map<string, Change[]>();
  for (const change of changes)
    changesByCommit.set(change.commit, [...(changesByCommit.get(change.commit) ?? []), change]);
  const semanticFor = (hash: string, filePath: string, kind: Alias['kind']): string => {
    const contents = blobs.get(hash);
    if (contents === undefined) return '';
    return kind === 'markdown' ? markdownSemantic(contents, filePath) : tomlSemantic(contents);
  };
  const statesByCommit = new Map<string, RepositoryState>();
  let current = emptyState();
  for (const commit of commits) {
    const parentStates = commit.parents.map((parent) => statesByCommit.get(parent) ?? emptyState());
    const state = parentStates[0] ? cloneState(parentStates[0]) : emptyState();
    const touchedCourses = new Set<string>();
    for (const change of changesByCommit.get(commit.hash) ?? []) {
      const canonical = canonicalChangePath(aliases, change);
      if (!canonical) continue;
      const oldPath = canonical.oldPath;
      const newPath = canonical.newPath ?? oldPath;
      if (!newPath) continue;
      const oldState = oldPath ? state.files.get(oldPath) : state.files.get(newPath);
      const oldSemantic =
        oldState?.semantic ?? semanticFor(change.oldHash, oldPath ?? newPath, canonical.kind);
      const deleted = ZERO_HASH.test(change.newHash);
      if (oldPath && oldPath !== newPath) state.files.delete(oldPath);
      if (deleted) {
        state.files.delete(newPath);
      } else {
        const semantic = semanticFor(change.newHash, newPath, canonical.kind);
        const matchingParent = matchingParentFileState(parentStates, newPath, semantic);
        const publication =
          matchingParent?.published ??
          (oldPath && oldState?.published) ??
          (oldPath && matchingParentFileState(parentStates, oldPath, semantic)?.published) ??
          (oldPath ? undefined : oldState?.published) ??
          dateOnly(change.author);
        const semanticModified =
          matchingParent?.modified ??
          (oldSemantic !== semantic ? dateIso(change.committer) : oldState?.modified);
        state.files.set(newPath, {
          hash: change.newHash,
          semantic,
          published: publication,
          modified: semanticModified,
        });
      }
      for (const slug of [courseFor(newPath), oldPath && courseFor(oldPath)])
        if (slug) touchedCourses.add(slug);
    }
    for (const slug of touchedCourses) {
      const fingerprint = courseFingerprint(state.files, slug);
      const parentDate = matchingParentCourseDate(parentStates, slug, fingerprint);
      if (parentDate) {
        state.courseFingerprints.set(slug, fingerprint);
        state.courses.set(slug, parentDate);
      } else if (state.courseFingerprints.get(slug) !== fingerprint) {
        state.courseFingerprints.set(slug, fingerprint);
        state.courses.set(slug, dateIso(commit.committer));
      }
    }
    statesByCommit.set(commit.hash, state);
    current = state;
  }
  const modified = new Map<string, string>();
  const published = new Map<string, string>();
  const currentPathSet = new Set(currentPaths);
  for (const [filePath, state] of current.files) {
    if (!currentPathSet.has(filePath)) continue;
    if (!isMarkdown(filePath)) continue;
    if (state.modified) modified.set(filePath, state.modified);
    published.set(filePath, state.published);
  }
  return { revision, modified, published, courses: current.courses };
};
