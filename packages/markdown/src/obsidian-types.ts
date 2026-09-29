import type { Root } from 'mdast';
/** A published Markdown document addressable from Obsidian syntax. */
export type PublicationDocument = {
  sourcePath: string;
  route: string;
  source: string;
  aliases?: readonly string[];
};

/** A published attachment addressable from an Obsidian embed. */
export type PublicationAttachment = {
  sourcePath: string;
  url: string;
  mimeType: string;
};

/** The complete set of publishable references available to a document. */
export type PublicationIndex = {
  documents: readonly PublicationDocument[];
  attachments: readonly PublicationAttachment[];
};

/** Inputs needed to resolve references while normalizing one source file. */
export type NormalizationContext = {
  sourcePath: string;
  publicationIndex: PublicationIndex;
  /** Existing standard Markdown body tree, used only to detect required transforms. */
  markdownTree?: Root;
};

export type ObsidianDiagnostic = {
  file: string;
  line: number;
  message: string;
};

export type SourceMapping = {
  generatedStart: number;
  generatedEnd: number;
  sourceStart: number;
  sourceEnd: number;
};

export type NormalizedMarkdown = {
  markdown: string;
  dependencies: string[];
  diagnostics: ObsidianDiagnostic[];
  sourceMap: SourceMapping[];
};

export type ObsidianNode = {
  type:
    | 'wikiLink'
    | 'embed'
    | 'comment'
    | 'blockReference'
    | 'blockDefinition'
    | 'inlineMath'
    | 'math'
    | 'highlight';
  value: string;
  alias?: string;
  display?: 'inline' | 'block';
  position: { start: number; end: number };
};

export type ObsidianSourceAst = {
  tree: Root;
  source: string;
  nodes: readonly ObsidianNode[];
};
