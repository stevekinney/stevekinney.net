import { effortDirection } from './calculate';
import type { ChangeEvaluation } from './calculate';
import { formatDollars, formatTokens } from './display';

/** A run of verdict text. Emphasized runs are the numbers and names a person scans for. */
export type Segment = { text: string; strong?: boolean };

const plain = (text: string): Segment => ({ text });
const strong = (text: string): Segment => ({ text, strong: true });

/** The change as a phrase that starts a sentence: "Switching to **Sonnet 5**". */
export const describeChange = (evaluation: ChangeEvaluation): Segment[] => {
  const { from, to, fromEffort, toEffort } = evaluation;
  const modelChanged = from.id !== to.id;
  const effortChanged = fromEffort.id !== toEffort.id;

  if (modelChanged && effortChanged) {
    return [
      plain('Moving to '),
      strong(to.name),
      plain(' at '),
      strong(toEffort.label),
      plain(' effort'),
    ];
  }

  if (modelChanged) return [plain('Switching to '), strong(to.name)];

  if (effortChanged) {
    const verb = effortDirection(fromEffort, toEffort) === 'raising' ? 'Raising' : 'Dropping';

    return [
      plain(`${verb} ${from.name} from `),
      strong(fromEffort.label),
      plain(' to '),
      strong(toEffort.label),
      plain(' effort'),
    ];
  }

  return [plain('Applying your output ratio of '), strong(evaluation.ratio.toFixed(2))];
};

/** The same phrase in the middle of a sentence. */
export const describeChangeMidSentence = (evaluation: ChangeEvaluation): Segment[] => {
  const [first, ...rest] = describeChange(evaluation);
  const lowered = { ...first, text: first.text.charAt(0).toLowerCase() + first.text.slice(1) };

  return [lowered, ...rest];
};

/** The verdict sentence, in the four variants the specification gives. */
export const describeVerdict = (evaluation: ChangeEvaluation): Segment[] => {
  switch (evaluation.verdict) {
    case 'unchanged':
      return [
        plain(
          'Nothing’s changing. Pick a different model or a different effort level to see whether the change pays for itself.',
        ),
      ];

    case 'never': {
      const raised = -evaluation.savingsPerMillion;
      const effect =
        raised > 0
          ? [plain('it raises it by '), strong(`${formatDollars(raised)} per MTok`)]
          : [plain('it leaves it unchanged')];

      return [
        ...describeChange(evaluation),
        plain(' doesn’t reduce your per-token output cost—'),
        ...effect,
        plain(
          ', so it never pays for itself no matter how much work is left. That can still be the right call for quality; it just isn’t a saving.',
        ),
      ];
    }

    case 'worth-it': {
      const limit = evaluation.breakEvenContext;
      const tail =
        limit === null || limit === Number.POSITIVE_INFINITY
          ? [plain(' That stays true no matter how much context you build up.')]
          : [
              plain(' That stays true as long as your context doesn’t grow past '),
              strong(formatTokens(limit)),
              plain(' tokens.'),
            ];

      return [
        ...describeChange(evaluation),
        plain(' already pays for itself, by '),
        strong(formatDollars(evaluation.net)),
        plain('.'),
        ...tail,
      ];
    }

    case 'not-yet': {
      const needed = evaluation.breakEvenOutput ?? 0;

      return [
        plain('Not yet—at '),
        strong(formatTokens(evaluation.contextTokens)),
        plain(' tokens of context, '),
        ...describeChangeMidSentence(evaluation),
        plain(' needs at least '),
        strong(formatTokens(needed)),
        plain(' tokens of remaining output work to pay for itself, about '),
        strong(formatTokens(Math.max(0, needed - evaluation.remainingOutput))),
        plain(' more than you have.'),
      ];
    }
  }
};

/** Segments as plain text, for the Markdown summary and for tests. */
export const segmentsToText = (segments: readonly Segment[]): string =>
  segments.map((segment) => segment.text).join('');

/** Segments as Markdown, with emphasized runs in bold. */
export const segmentsToMarkdown = (segments: readonly Segment[]): string =>
  segments.map((segment) => (segment.strong ? `**${segment.text}**` : segment.text)).join('');
