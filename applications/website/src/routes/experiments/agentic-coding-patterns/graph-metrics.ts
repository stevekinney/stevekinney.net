import type { PatternEntry } from './pattern-types';

/** The most edges the graph view lays out and draws. */
export const MAX_DRAWN_EDGES = 5_000;

export type PatternGraph = {
  entries: readonly PatternEntry[];
  byId: ReadonlyMap<string, PatternEntry>;
  /** The ids each entry's Related Patterns point at. Dangling links aren't here. */
  outgoing: ReadonlyMap<string, readonly string[]>;
  /** The ids of the entries that point at each entry. */
  incoming: ReadonlyMap<string, readonly string[]>;
  /** Incoming plus outgoing links. A mutual pair counts once each way. */
  degree: ReadonlyMap<string, number>;
  /** One edge per related pair, marked mutual when each side links to the other. */
  edges: readonly GraphEdge[];
  /** Finds an entry from a wikilink target, ignoring case. */
  resolve: (name: string) => PatternEntry | undefined;
};

export type GraphEdge = {
  source: string;
  target: string;
  mutual: boolean;
};

/** Reads the related links into a graph. Self-references and dangling links are left out. */
export const buildGraph = (entries: readonly PatternEntry[]): PatternGraph => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byName = new Map(entries.map((entry) => [entry.name.toLowerCase(), entry]));
  const resolve = (name: string): PatternEntry | undefined => byName.get(name.toLowerCase());

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>(entries.map((entry) => [entry.id, []]));

  for (const entry of entries) {
    const targets = [
      ...new Set(
        entry.related.flatMap((name) => {
          const target = resolve(name);

          return target && target.id !== entry.id ? [target.id] : [];
        }),
      ),
    ];

    outgoing.set(entry.id, targets);
    for (const target of targets) incoming.get(target)?.push(entry.id);
  }

  const degree = new Map(
    entries.map((entry) => [
      entry.id,
      (outgoing.get(entry.id)?.length ?? 0) + (incoming.get(entry.id)?.length ?? 0),
    ]),
  );

  const outgoingSets = new Map([...outgoing].map(([id, targets]) => [id, new Set(targets)]));
  const edges: GraphEdge[] = [];
  collect: for (const entry of entries) {
    for (const target of outgoing.get(entry.id) ?? []) {
      const mutual = outgoingSets.get(target)?.has(entry.id) ?? false;

      // A mutual pair is one edge, kept from the side that sorts first.
      if (!mutual || entry.id < target) edges.push({ source: entry.id, target, mutual });
      // The picture draws an element for each edge, so a very dense library draws only this many.
      if (edges.length >= MAX_DRAWN_EDGES) break collect;
    }
  }

  return { entries, byId, outgoing, incoming, degree, edges, resolve };
};

export const isMutual = (graph: PatternGraph, first: string, second: string): boolean =>
  (graph.outgoing.get(first)?.includes(second) ?? false) &&
  (graph.outgoing.get(second)?.includes(first) ?? false);

export type ConnectedEntry = {
  entry: PatternEntry;
  degree: number;
  incoming: number;
  outgoing: number;
};

/** The entries with the most links, most first, with ties in name order. */
export const mostConnected = (graph: PatternGraph, limit = 15): ConnectedEntry[] =>
  graph.entries
    .map((entry) => ({
      entry,
      degree: graph.degree.get(entry.id) ?? 0,
      incoming: graph.incoming.get(entry.id)?.length ?? 0,
      outgoing: graph.outgoing.get(entry.id)?.length ?? 0,
    }))
    .sort(
      (first, second) =>
        second.degree - first.degree || first.entry.name.localeCompare(second.entry.name),
    )
    .slice(0, limit);

export type Backlink = {
  entry: PatternEntry;
  /** Whether this entry also links to the one being viewed. */
  mutual: boolean;
};

/** The entries whose Related Patterns point at an entry, in name order. */
export const backlinksOf = (graph: PatternGraph, id: string): Backlink[] =>
  (graph.incoming.get(id) ?? [])
    .flatMap((sourceId) => {
      const entry = graph.byId.get(sourceId);

      return entry ? [{ entry, mutual: isMutual(graph, id, sourceId) }] : [];
    })
    .sort((first, second) => first.entry.name.localeCompare(second.entry.name));

/** Every entry linked to or from an entry, without repeats and without the entry itself. */
export const neighborsOf = (graph: PatternGraph, id: string): string[] => [
  ...new Set([...(graph.outgoing.get(id) ?? []), ...(graph.incoming.get(id) ?? [])]),
];

/** The related names that appear in at least two of the given entries, lowercase. */
export const sharedRelations = (entries: readonly PatternEntry[]): Set<string> => {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const name of new Set(entry.related.map((related) => related.toLowerCase()))) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return new Set([...counts].filter(([, count]) => count >= 2).map(([name]) => name));
};
