import type {
  NormalizationContext,
  ObsidianDiagnostic,
  PublicationAttachment,
  PublicationDocument,
} from './obsidian-types.ts';

export type ResolvedDocument = { kind: 'document'; document: PublicationDocument };
export type ResolvedAttachment = { kind: 'attachment'; attachment: PublicationAttachment };
export type ResolvedReference = ResolvedDocument | ResolvedAttachment;

const normalizePath = (value: string): string | undefined => {
  const parts: string[] = [];
  for (const part of value.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return undefined;
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
};

const decodeTarget = (target: string): string | undefined => {
  try {
    const decoded = decodeURIComponent(target);
    return decoded.includes('\0') || decoded.includes('\r') || decoded.includes('\n')
      ? undefined
      : decoded;
  } catch {
    return undefined;
  }
};

const withoutMarkdownSuffix = (value: string): string =>
  value.endsWith('.md') ? value.slice(0, -3) : value;

const candidatesFor = (target: string, sourcePath: string): [string[], string[]] | undefined => {
  const normalized = normalizePath(target.replace(/^\/+/, ''));
  const sourceDirectory = sourcePath.includes('/')
    ? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
    : '';
  const relative = target.startsWith('/')
    ? undefined
    : normalizePath(sourceDirectory ? `${sourceDirectory}/${target}` : target);
  const variants = (value: string | undefined): string[] => (value ? [value, `${value}.md`] : []);
  if (normalized === undefined && relative === undefined) return undefined;
  return [variants(relative), variants(normalized)];
};

const diagnostic = (context: NormalizationContext, message: string): ObsidianDiagnostic => ({
  file: context.sourcePath,
  line: 1,
  message,
});

const matchDocument = (target: string, context: NormalizationContext): PublicationDocument[] => {
  const candidateGroups = candidatesFor(target, context.sourcePath);
  if (!candidateGroups) return [];
  for (const group of candidateGroups) {
    const exact = context.publicationIndex.documents.filter((document) =>
      group.includes(document.sourcePath),
    );
    if (exact.length) return exact;
  }
  const targetWithoutSuffix = withoutMarkdownSuffix(normalizePath(target) ?? target);
  const basename = targetWithoutSuffix.split('/').at(-1) ?? targetWithoutSuffix;
  const basenameMatches = context.publicationIndex.documents.filter((document) => {
    const source = withoutMarkdownSuffix(normalizePath(document.sourcePath) ?? document.sourcePath);
    return source.split('/').at(-1) === basename;
  });
  if (targetWithoutSuffix.includes('/')) return [];
  if (basenameMatches.length) return basenameMatches;
  return context.publicationIndex.documents.filter((document) =>
    document.aliases?.some((alias) => alias === target || alias === withoutMarkdownSuffix(target)),
  );
};

/** Resolve a published document or attachment without consulting the filesystem. */
export const resolveObsidianReference = (
  target: string,
  context: NormalizationContext,
  kind: 'document' | 'attachment' = 'document',
): { reference?: ResolvedReference; diagnostics: ObsidianDiagnostic[] } => {
  const decoded = decodeTarget(target.trim());
  if (!decoded) {
    return {
      diagnostics: [
        { ...diagnostic(context, `Malformed or unsafe reference: ${target}`), line: 1 },
      ],
    };
  }
  if (kind === 'attachment') {
    const candidateGroups = candidatesFor(decoded, context.sourcePath) ?? [];
    let matches: PublicationAttachment[] = [];
    for (const candidates of candidateGroups) {
      matches = context.publicationIndex.attachments.filter((attachment) => {
        const source = attachment.sourcePath.replaceAll('\\', '/');
        return (
          candidates.includes(source) ||
          candidates.some((candidate) => source.endsWith(`/static/${candidate}`))
        );
      });
      if (matches.length) break;
    }
    if (!matches.length && !decoded.includes('/'))
      matches = context.publicationIndex.attachments.filter(
        (attachment) => attachment.sourcePath.split('/').at(-1) === decoded,
      );
    if (matches.length === 1)
      return { reference: { kind, attachment: matches[0] }, diagnostics: [] };
    return {
      diagnostics: [
        {
          ...diagnostic(
            context,
            matches.length
              ? `Ambiguous attachment: ${target}`
              : `Missing published attachment: ${target}`,
          ),
          line: 1,
        },
      ],
    };
  }
  const matches = matchDocument(decoded, context);
  if (matches.length === 1) return { reference: { kind, document: matches[0] }, diagnostics: [] };
  return {
    diagnostics: [
      {
        ...diagnostic(
          context,
          matches.length
            ? `Ambiguous published document: ${target}`
            : `Missing published document: ${target}`,
        ),
        line: 1,
      },
    ],
  };
};
