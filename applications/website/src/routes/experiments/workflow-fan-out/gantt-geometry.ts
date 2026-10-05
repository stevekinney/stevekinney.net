import type { Schedule, ScheduledAgent } from './schedule';

/**
 * One drawn piece of an item's row. `idle` is time an item spends waiting at
 * a `parallel()` barrier for other items. `queued` is time an agent was ready
 * but waiting for a free concurrency slot. `run` is the agent working.
 */
export type SegmentKind = 'idle' | 'queued' | 'run';

export type GanttSegment = {
  kind: SegmentKind;
  agent: ScheduledAgent;
  from: number;
  to: number;
};

/**
 * The segments for every agent, clipped to `until` minutes so the chart can
 * be animated. `null` draws the finished schedule.
 */
export const ganttSegments = (schedule: Schedule, until: number | null = null): GanttSegment[] => {
  const limit = until ?? Number.POSITIVE_INFINITY;
  const byPosition = new Map(
    schedule.agents.map((agent) => [`${agent.item}:${agent.stage}`, agent]),
  );
  const segments: GanttSegment[] = [];

  const add = (kind: SegmentKind, agent: ScheduledAgent, from: number, to: number): void => {
    const clipped = Math.min(to, limit);
    if (clipped > from) segments.push({ kind, agent, from, to: clipped });
  };

  for (const agent of schedule.agents) {
    if (agent.ready === null) continue;

    if (schedule.strategy === 'parallel' && agent.stage > 0) {
      const previous = byPosition.get(`${agent.item}:${agent.stage - 1}`);
      if (previous?.end != null && previous.end < agent.ready)
        add('idle', agent, previous.end, agent.ready);
    }

    const queuedUntil = agent.start ?? (schedule.failure ? schedule.makespan : agent.ready);
    if (queuedUntil > agent.ready) add('queued', agent, agent.ready, queuedUntil);
    if (agent.start !== null && agent.end !== null) add('run', agent, agent.start, agent.end);
  }

  return segments;
};

/** Evenly spaced tick values from 0 to at least `maximum`, at a round step. */
export const timeTicks = (maximum: number, targetCount = 6): number[] => {
  if (maximum <= 0) return [0];

  const rough = maximum / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough)!;
  const ticks: number[] = [];
  for (let value = 0; value <= maximum + step / 1000; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }

  return ticks;
};

/** Total minutes of each kind across a schedule, for the chart's summary line. */
export const totalsByKind = (segments: readonly GanttSegment[]): Record<SegmentKind, number> => {
  const totals: Record<SegmentKind, number> = { idle: 0, queued: 0, run: 0 };
  for (const segment of segments) totals[segment.kind] += segment.to - segment.from;
  for (const kind of Object.keys(totals) as SegmentKind[]) {
    totals[kind] = Math.round(totals[kind] * 10) / 10;
  }

  return totals;
};
