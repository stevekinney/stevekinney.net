import {
  isType,
  isNode,
  hasChildren,
  type Node,
  type NodeType,
  type NodeForType,
} from './mdast-types';

export function* walk<T extends NodeType | undefined>(
  node: Node,
  nodeType?: T,
): Generator<NodeForType<T>> {
  if (!isNode(node)) {
    throw new Error('Node is not a valid mdast node');
  }

  if (!nodeType) {
    yield node as NodeForType<T>;
  } else if (isType(node, nodeType)) {
    yield node;
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      yield* walk(child, nodeType);
    }
  }
}
