export const meta = {
  name: 'rename-in-isolation',
  description: 'Rename a function in two packages, each in its own worktree, then open a pull request',
};

const RENAME = {
  type: 'object',
  properties: {
    renamed: { type: 'integer', minimum: 0 },
    note: { type: 'string', minLength: 3 },
  },
  required: ['renamed'],
};

const results = await parallel(
  ['packages/api', 'packages/web'].map(
    (folder) => () =>
      agent(`Rename getUser to fetchUser everywhere in ${folder}.`, {
        label: `Rename in ${folder}`,
        isolation: 'worktree',
        agentType: 'refactorer',
        model: 'claude-sonnet-with-an-unusually-long-model-identifier-that-has-no-spaces-to-wrap-at-all',
        schema: RENAME,
      }),
  ),
);

log(`Renamed in ${results.filter(Boolean).length} packages`);
return workflow('open-pull-request', { results });
