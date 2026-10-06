import { parse } from 'acorn';
import type {
  AnonymousFunctionDeclaration,
  AnyNode,
  ArrowFunctionExpression,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  Program,
  Super,
} from 'acorn';

import type { ParseError } from './workflow-model';

/**
 * Parsing shared by the analyzer and the checks. The options match the ones
 * Claude Code uses for a workflow script: a module with top-level `await` and
 * top-level `return`. Keep them in step with the checks' own parser, so a line
 * number in the diagram is the same line a check names.
 */
const parseOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  locations: true,
} as const;

export type ParsedScript = { ok: true; program: Program } | { ok: false; error: ParseError };

/** `export default function () {}` is a function declaration with no name. */
export type FunctionNode =
  ArrowFunctionExpression | FunctionExpression | FunctionDeclaration | AnonymousFunctionDeclaration;

const positionOf = (error: unknown): { line: number | null; column: number | null } => {
  const loc: unknown = error instanceof SyntaxError ? Reflect.get(error, 'loc') : undefined;
  if (typeof loc !== 'object' || loc === null) return { line: null, column: null };

  const line: unknown = Reflect.get(loc, 'line');
  const column: unknown = Reflect.get(loc, 'column');

  return {
    line: typeof line === 'number' ? line : null,
    column: typeof column === 'number' ? column : null,
  };
};

export const parseScript = (source: string): ParsedScript => {
  try {
    return { ok: true, program: parse(source, parseOptions) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // The parser appends `(line:column)`, which the page shows on its own.
    return {
      ok: false,
      error: { message: message.replace(/\s*\(\d+:\d+\)$/, ''), ...positionOf(error) },
    };
  }
};

export const isNode = (value: unknown): value is AnyNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';

/** A node's direct children, in source order. */
export const childrenOf = (node: AnyNode): AnyNode[] => {
  const children: AnyNode[] = [];

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) children.push(item);
    } else if (isNode(value)) {
      children.push(value);
    }
  }

  return children.sort((first, second) => first.start - second.start);
};

/** Visits a node and everything beneath it, parents first. */
export const walk = (node: AnyNode, visit: (node: AnyNode) => void): void => {
  visit(node);
  for (const child of childrenOf(node)) walk(child, visit);
};

export const lineOf = (node: Node): number => node.loc?.start.line ?? 1;

export const endLineOf = (node: Node): number => node.loc?.end.line ?? lineOf(node);

/** The key the checks and the analyzer use to match a call with skillset's record of it. */
export const positionKey = (node: Node): string =>
  `${node.loc?.start.line ?? 0}:${node.loc?.start.column ?? 0}`;

export const isFunctionNode = (node: AnyNode | null | undefined): node is FunctionNode =>
  node?.type === 'ArrowFunctionExpression' ||
  node?.type === 'FunctionExpression' ||
  node?.type === 'FunctionDeclaration';

/** Looks through parentheses, optional chains, and `await` to the expression that matters. */
export const unwrap = (node: Expression | Super): Expression | Super => {
  if (node.type === 'ChainExpression') return unwrap(node.expression);
  if (node.type === 'ParenthesizedExpression') return unwrap(node.expression);
  if (node.type === 'AwaitExpression') return unwrap(node.argument);

  return node;
};

/** The name a call's callee is, such as `agent`, or `null` for anything but a plain name. */
export const calleeName = (node: AnyNode): string | null => {
  if (node.type !== 'CallExpression') return null;
  const callee = unwrap(node.callee);

  return callee.type === 'Identifier' ? callee.name : null;
};

/** The method a call invokes, such as `filter` in `results.filter(Boolean)`. */
export const methodCall = (
  node: AnyNode,
): { object: Expression | Super; method: string } | null => {
  if (node.type !== 'CallExpression') return null;
  const callee = unwrap(node.callee);
  if (callee.type !== 'MemberExpression' || callee.computed) return null;
  if (callee.property.type !== 'Identifier') return null;

  return { object: callee.object, method: callee.property.name };
};
