import type { Evaluation } from './evaluate';
import { legLabels } from './model';
import type { Leg } from './model';

export type VerdictText = {
  tone: 'exploitable' | 'safe' | 'unusual';
  /** The bold word or two, such as "Exploitable". */
  headline: string;
  detail: string;
  /** "Leg cut: a way out." when a leg is cut. */
  legLine: string | null;
};

export const describeVerdict = (evaluation: Evaluation): VerdictText => {
  if (evaluation.exploitable) {
    return {
      tone: 'exploitable',
      headline: 'Exploitable',
      detail: 'all three legs are intact.',
      legLine: null,
    };
  }

  if (evaluation.noSources) {
    return {
      tone: 'unusual',
      headline: 'Not exploitable',
      detail: 'no untrusted content is turned on. That’s unusual for a coding agent—are you sure?',
      legLine: null,
    };
  }

  const empty = (Object.keys(evaluation.legs) as Leg[]).filter(
    (leg) => evaluation.legs[leg] === 'empty',
  );

  if (evaluation.cutLegNames.length === 0) {
    return {
      tone: 'unusual',
      headline: 'Not exploitable',
      detail: `nothing is turned on under ${empty.map((leg) => legLabels[leg].toLowerCase()).join(' or ')}.`,
      legLine: null,
    };
  }

  return {
    tone: 'safe',
    headline: 'Leg cut',
    detail: 'no path from untrusted content to an exit carries private data.',
    legLine: `Leg cut: ${evaluation.cutLegNames.join('; ')}.`,
  };
};

/** The verdict as one plain sentence, for the summary and the text equivalent. */
export const verdictSentence = (evaluation: Evaluation): string => {
  const text = describeVerdict(evaluation);

  return [`${text.headline}: ${text.detail}`, text.legLine, evaluation.path?.sentence]
    .filter((part): part is string => Boolean(part))
    .join(' ');
};
