import { lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { classifyContentSource } from '@stevekinney/utilities/frontmatter';

import { repositoryRoot } from './content-paths.ts';
import { collectContentHistory } from './content-repository/git-history.ts';
import {
  normalizeContentMetadata,
  validateDuplicateDescriptions,
  type MetadataIssue,
} from './content-repository/metadata.ts';

type History = Awaited<ReturnType<typeof collectContentHistory>>;
type NormalizedDocument = ReturnType<typeof normalizeContentMetadata>;

export type ContentMetadataAudit = {
  documents: Map<string, NormalizedDocument>;
  sources: Map<string, string>;
  issues: MetadataIssue[];
  changedFiles: string[];
  history: History;
};

function selectedPath(root: string, value: string): string {
  const relative = path.relative(root, path.resolve(root, value)).split(path.sep).join('/');
  if (!classifyContentSource(relative)) {
    throw new Error(`Unsupported content path '${value}'. Select writing/*.md or courses/*/*.md.`);
  }
  return relative;
}

function collectNavigationTitles(
  value: unknown,
  course: string,
  titles: Map<string, string[]>,
): void {
  if (typeof value !== 'object' || value === null) return;
  if (Array.isArray(value)) {
    for (const entry of value) collectNavigationTitles(entry, course, titles);
    return;
  }
  if (
    'title' in value &&
    'href' in value &&
    typeof value.title === 'string' &&
    typeof value.href === 'string'
  ) {
    try {
      const target = new URL(value.href, `https://content.local/courses/${course}/`);
      if (target.origin === 'https://content.local') {
        const pathname = decodeURIComponent(target.pathname)
          .replace(/^\//, '')
          .replace(/\.md$/, '');
        const file = `${pathname}.md`;
        if (classifyContentSource(file) === 'lesson') {
          titles.set(file, [...(titles.get(file) ?? []), value.title]);
        }
      }
    } catch {
      // The existing content graph validator reports malformed navigation links.
    }
  }
  for (const child of Object.values(value)) collectNavigationTitles(child, course, titles);
}

/** Check or repair the authored metadata, keeping projects and Markdown bodies outside the edit boundary. */
export async function auditContentMetadata(
  options: {
    root?: string;
    paths?: string[];
    fix?: boolean;
    history?: History;
  } = {},
): Promise<ContentMetadataAudit> {
  const root = options.root ?? repositoryRoot;
  const selected = options.paths?.length
    ? new Set(options.paths.map((file) => selectedPath(root, file)))
    : null;
  const files = (
    await fg(['writing/**/*.md', 'courses/**/*.md'], {
      cwd: root,
      onlyFiles: true,
      followSymbolicLinks: false,
    })
  ).sort();
  if (selected) {
    for (const file of selected) {
      if (!files.includes(file) || (await lstat(path.join(root, file))).isSymbolicLink()) {
        throw new Error(`Content file '${file}' does not exist or is a symbolic link.`);
      }
    }
  }
  const history = options.history ?? (await collectContentHistory(root));
  const titles = new Map<string, string[]>();
  const issues: MetadataIssue[] = [];
  const documents = new Map<string, NormalizedDocument>();
  const sources = new Map<string, string>();
  const changedFiles: string[] = [];
  for (const file of (
    await fg('courses/*/index.toml', { cwd: root, followSymbolicLinks: false })
  ).sort()) {
    try {
      const navigation = Bun.TOML.parse(await readFile(path.join(root, file), 'utf8'));
      collectNavigationTitles(navigation, file.split('/')[1], titles);
    } catch (error) {
      if (
        !selected ||
        [...selected].some((source) => path.dirname(source) === path.dirname(file))
      ) {
        issues.push({
          file,
          message: `Cannot read course navigation: ${(error as Error).message}`,
          fixable: false,
        });
      }
    }
  }
  const auditedFiles = await Promise.all(
    files.map(async (file) => {
      const kind = classifyContentSource(file);
      if (!kind) {
        return {
          file,
          original: undefined,
          normalized: null,
          issues:
            !selected || selected.has(file)
              ? [
                  {
                    file,
                    message:
                      'Markdown content is outside the supported writing/*.md and courses/*/*.md structure.',
                    fixable: false,
                  } satisfies MetadataIssue,
                ]
              : [],
        };
      }
      const absolutePath = path.join(root, file);
      const original = await readFile(absolutePath, 'utf8');
      const normalized = normalizeContentMetadata(original, {
        file,
        kind,
        publicationDate: history.published.get(file),
        titleCandidates: titles.get(file),
      });
      if (selected && !selected.has(file)) return { file, original, normalized, issues: [] };
      if (options.fix && normalized.normalizedSource !== original) {
        // Fail rather than overwrite an editor's changes made while the audit was running.
        if ((await readFile(absolutePath, 'utf8')) !== original)
          throw new Error(`'${file}' changed during metadata repair; rerun content:fix.`);
        await writeFile(absolutePath, normalized.normalizedSource, 'utf8');
        return {
          file,
          original,
          normalized,
          changed: true,
          issues: normalized.issues.filter((issue) => !issue.fixable),
        };
      }
      return { file, original, normalized, issues: normalized.issues };
    }),
  );
  for (const result of auditedFiles) {
    if (result.normalized) documents.set(result.file, result.normalized);
    if (result.original !== undefined) sources.set(result.file, result.original);
    if (result.changed) changedFiles.push(result.file);
    issues.push(...result.issues);
  }
  issues.push(
    ...validateDuplicateDescriptions(
      [...documents.entries()].flatMap(([file, document]) =>
        document.metadata.description ? [{ file, description: document.metadata.description }] : [],
      ),
    ).filter((issue) => !selected || selected.has(issue.file)),
  );
  return { documents, sources, issues, changedFiles, history };
}

export function reportMetadataIssues(issues: MetadataIssue[]): void {
  for (const issue of issues) {
    const location = `${issue.file}${issue.line === undefined ? '' : `:${issue.line}`}`;
    const repair = issue.fixable ? ' Run bun run content:fix to repair.' : '';
    const output = `${location}: ${issue.message}${repair}`;
    if (issue.severity === 'warning') console.warn(output);
    else console.error(output);
  }
}
