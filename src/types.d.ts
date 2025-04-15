type TemplateNode = import('svelte/types/compiler/interfaces').TemplateNode;
type Style = import('svelte/types/compiler/interfaces').Style;
type Script = import('svelte/types/compiler/interfaces').Script;
type Ast = import('svelte/types/compiler/interfaces').Ast;
type BaseNode = import('svelte/types/compiler/interfaces').BaseNode;
type ElementNode = import('svelte/types/compiler/interfaces').Element;

type Markdown = {
  default: import('svelte').Component;
  metadata: Record<string, unknown>;
};

declare module '*.md' {
  type SvelteComponent = import('svelte').Component;
  export default SvelteComponent;
  export const metadata: Record<string, unknown>;
}

declare module 'remark-slug' {
  export default import('unified').Plugin;
}

declare module 'svelte/compiler' {
  export function parse(source: string): Ast;
  export function walk<T extends TemplateNode | Style | Script, N extends BaseNode>(
    ast: T,
    visitor: { enter?: (node: N) => void; leave?: (node: N) => void },
  ): void;
}

declare module 'virtual:project-root' {
  const projectRoot: string;
  export default projectRoot;
  export const fromProjectRoot: (...path: string[]) => string;
}
