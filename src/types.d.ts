type TemplateNode = import('svelte/types/compiler/interfaces').TemplateNode;
type Style = import('svelte/types/compiler/interfaces').Style;
type Script = import('svelte/types/compiler/interfaces').Script;
type Ast = import('svelte/types/compiler/interfaces').Ast;
type BaseNode = import('svelte/types/compiler/interfaces').BaseNode;
type ElementNode = import('svelte/types/compiler/interfaces').Element;

declare module '*.md' {
  export default import('svelte').Component;
  export const metadata: Record<string, unknown>;
}

declare module '*.woff' {
  export default InstanceType<ArrayBuffer>;
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

declare module 'virtual:opengraph-image*' {
  const opengraph: string;
  export const url: opengraph;
}
