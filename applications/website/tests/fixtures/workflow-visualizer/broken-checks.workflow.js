export const meta = {
  name: 'broken-checks',
  description: 'A made-up workflow with one of each mistake the checks look for',
  phases: [{ title: 'Review' }, { title: 'Report' }],
};

const started = Date.now();

phase('Reveiw');
const results = await parallel(
  ['parser.ts', 'printer.ts'].map((file) => () =>
    agent(`Review ${file} for bugs.`, {
      label: 'a-review-label-that-keeps-going-without-a-single-space-so-it-has-to-wrap-somewhere-inside-the-diagram-instead-of-pushing-the-page-sideways',
      model: 'claude-model-id-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      effort: 'extreme',
      modle: 'haiku',
    }),
  ),
);
const reviewed = results.filter(Boolean);

return { reviewed, started };
