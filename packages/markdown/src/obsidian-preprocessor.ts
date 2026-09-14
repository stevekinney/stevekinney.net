import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PreprocessorGroup } from 'svelte/compiler';
import type { NormalizedMarkdown, PublicationIndex } from './obsidian-types.ts';
import { normalizeObsidianMarkdown } from './obsidian-normalization.ts';

export type GeneratedObsidianContent = {
  publicationIndex: PublicationIndex;
  documents: Record<string, NormalizedMarkdown>;
};

/** Load the private build artifact; it is never a browser asset. */
export const readGeneratedObsidianContent = (filename: string): GeneratedObsidianContent => {
  const artifact: unknown = JSON.parse(readFileSync(filename, 'utf8'));
  if (
    !artifact ||
    typeof artifact !== 'object' ||
    !('publicationIndex' in artifact) ||
    !('documents' in artifact) ||
    !artifact.publicationIndex ||
    typeof artifact.publicationIndex !== 'object' ||
    !('documents' in artifact.publicationIndex) ||
    !Array.isArray(artifact.publicationIndex.documents) ||
    !('attachments' in artifact.publicationIndex) ||
    !Array.isArray(artifact.publicationIndex.attachments) ||
    !artifact.documents ||
    typeof artifact.documents !== 'object'
  ) {
    throw new Error(`Invalid Obsidian content artifact: ${filename}`);
  }
  return artifact as GeneratedObsidianContent;
};

/** Normalize published Markdown before mdsvex while registering embed dependencies with Vite. */
export const obsidianPreprocessor = (options: {
  artifactPath: string;
  repositoryRoot: string;
}): PreprocessorGroup => {
  let cached: GeneratedObsidianContent | undefined;
  let revision = '';
  return {
    name: 'obsidian-published-content',
    markup({ content, filename }) {
      if (!filename?.endsWith('.md')) return;
      const sourcePath = path.relative(options.repositoryRoot, filename).split(path.sep).join('/');
      const status = statSync(options.artifactPath);
      const nextRevision = `${status.mtimeMs}:${status.ctimeMs}:${status.size}`;
      if (!cached || revision !== nextRevision) {
        cached = readGeneratedObsidianContent(options.artifactPath);
        revision = nextRevision;
      }
      const document = cached.publicationIndex.documents.find(
        (item) => item.sourcePath === sourcePath,
      );
      // App-local Markdown is outside the approved publication graph.
      if (!document) return;
      const normalized =
        document.source === content
          ? cached.documents[sourcePath]
          : normalizeObsidianMarkdown(content, {
              sourcePath,
              publicationIndex: {
                ...cached.publicationIndex,
                documents: cached.publicationIndex.documents.map((item) =>
                  item === document ? { ...item, source: content } : item,
                ),
              },
            });
      if (!normalized) throw new Error(`Missing normalized Markdown for ${sourcePath}`);
      if (normalized.diagnostics.length)
        throw new Error(
          normalized.diagnostics
            .map((issue) => `${issue.file}:${issue.line}: ${issue.message}`)
            .join('\n'),
        );
      return {
        code: normalized.markdown,
        dependencies: [
          options.artifactPath,
          ...normalized.dependencies.map((dependency) =>
            path.resolve(options.repositoryRoot, dependency),
          ),
        ],
      };
    },
  };
};
