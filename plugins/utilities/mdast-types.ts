import { z } from 'zod';
import type { Parent, RootContentMap, Node } from 'mdast';

export type { Node, Parent } from 'mdast';

export type NodeType = keyof RootContentMap;
export type NodeForType<T extends NodeType | undefined> = T extends NodeType
  ? RootContentMap[T]
  : Node;

export const PointSchema = z.object({
  line: z.number(),
  column: z.number(),
  offset: z.number().optional(),
});

export const PositionSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

export const DataSchema = z.record(z.string(), z.unknown());

export const NodeSchema = z.object({
  type: z.string(),
  data: DataSchema.optional(),
  position: PositionSchema.optional(),
});

export const ParentSchema = NodeSchema.extend({
  children: z.array(NodeSchema),
});

export function isNode(node: unknown): node is Node {
  return NodeSchema.safeParse(node).success;
}

export function hasChildren(node: unknown): node is Parent {
  return ParentSchema.safeParse(node).success;
}

export function isType<T extends NodeType>(node: Node, kind: T): node is NodeForType<T> {
  return node.type === kind;
}
