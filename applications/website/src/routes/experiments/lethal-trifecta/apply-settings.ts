import type { TrifectaState } from './evaluate';
import type { ControlId } from './model';
import type { SettingsReport } from './settings-import';

/**
 * Fills the toggles in from what the settings determine. A control the files
 * can't settle keeps the learner's toggle, and so does the allowlist when no
 * file names one.
 */
export const applySettings = (state: TrifectaState, report: SettingsReport): TrifectaState => {
  const controls = { ...state.controls };
  for (const [id, prefill] of Object.entries(report.prefill) as [
    ControlId,
    (typeof report.prefill)[ControlId],
  ][]) {
    if (prefill.status !== 'unknown') controls[id] = prefill.status === 'on';
  }

  return {
    ...state,
    controls,
    allowlist: report.allowlist.length > 0 ? [...report.allowlist] : state.allowlist,
    excludedNetworkCommand:
      report.merged.excludedCommands.length > 0
        ? report.excludedNetworkCommand
        : state.excludedNetworkCommand,
    nodes: report.hasMcpServers ? { ...state.nodes, 'mcp-results': true } : state.nodes,
  };
};
