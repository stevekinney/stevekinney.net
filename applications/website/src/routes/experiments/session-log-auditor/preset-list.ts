/** The presets' names and notices, light enough for the page to show before any preset loads. */
export type PresetSummary = { id: string; name: string; notice: string };

export const presetSummaries: readonly PresetSummary[] = [
  {
    id: 'floor-fixed',
    name: 'A floor that got fixed',
    notice:
      'Twenty-four made-up sessions across two repositories. The missing timeout command stops after September 1, when a shim goes in, and the missing Bun types stop after September 8. Mark either one fixed to see its control row hold at zero.',
  },
  {
    id: 'retry-storm',
    name: 'One session, 200 retries',
    notice:
      'One session retries a failed database connection 200 times. Ranked by sessions, the missing pnpm that hits four sessions still comes first.',
  },
  {
    id: 'regression',
    name: 'A fix that slipped',
    notice:
      'The missing timeout command goes away on September 1 and comes back on September 10. It’s flagged as back after going quiet, and marking it fixed on 2026-09-01 raises a regression on its control row.',
  },
];
