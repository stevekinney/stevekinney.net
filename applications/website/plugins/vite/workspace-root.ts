import type { PluginOption } from 'vite';

/** Dev-only. Exposes the repository's absolute path to the client, for `vscode://` links. */
export const workspaceRootDefine = (workspaceRoot: string): PluginOption => ({
  name: 'workspace-root-define',
  apply: 'serve',
  config: () => ({ define: { __WORKSPACE_ROOT__: JSON.stringify(workspaceRoot) } }),
});
