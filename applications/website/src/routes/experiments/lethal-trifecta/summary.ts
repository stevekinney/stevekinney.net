import type { Evaluation, TrifectaState } from './evaluate';
import { controlGroups, controls, kindLabels } from './model';
import { verdictSentence } from './verdict';

/** A Markdown report: the verdict, the path, the controls in place by kind, and the residual risks. */
export const summaryToMarkdown = (state: TrifectaState, evaluation: Evaluation): string => {
  const lines = ['# Lethal Trifecta', '', '## Verdict', '', verdictSentence(evaluation), ''];

  if (evaluation.path) {
    lines.push('## Path', '', evaluation.path.sentence, '');
    if (evaluation.path.exit.note) lines.push(evaluation.path.exit.note, '');
  }

  lines.push('## Controls in place', '');
  let any = false;
  for (const group of controlGroups) {
    const inPlace = controls.filter(
      (control) => group.kind.includes(control.kind) && state.controls[control.id],
    );
    if (inPlace.length === 0) continue;

    any = true;
    lines.push(`### ${group.title}`, '');
    for (const control of inPlace) {
      lines.push(
        `- ${control.label} (${kindLabels[control.kind]}): removes ${control.removes.toLowerCase()}`,
      );
    }
    lines.push('');
  }
  if (!any) lines.push('None.', '');

  if (state.allowlist.length > 0) {
    lines.push('## Allowlist', '', ...state.allowlist.map((domain) => `- ${domain}`), '');
  }

  lines.push('## Residual risks', '');
  if (evaluation.residualRisks.length === 0) lines.push('None.', '');
  else {
    lines.push(
      ...evaluation.residualRisks.map(
        (risk) => `- ${risk.kind === 'human-gate' ? 'Human gate' : 'Partial'}: ${risk.text}`,
      ),
      '',
    );
  }

  lines.push(
    'Made with the Lethal Trifecta tool. The trifecta is Simon Willison’s. A model-judgment control cuts nothing.',
    '',
  );

  return lines.join('\n');
};
