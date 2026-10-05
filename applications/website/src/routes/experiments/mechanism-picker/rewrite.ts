/** The outline's template for an instruction that changes a decision. */
export type WhenDoVerify = { trigger: string; action: string; result: string };

const BLANK = '____';

/** Starts a rewrite from a line: the line becomes the action, and the other two are blank. */
export const startRewrite = (line: string): WhenDoVerify => ({
  trigger: '',
  action: line
    .trim()
    .replace(/[.!]+$/, '')
    .replace(/^\p{Lu}(?!\p{Lu})/u, (first) => first.toLowerCase()),
  result: '',
});

/** "When $trigger, do $action, then verify $result", with blanks for anything still empty. */
export const formatRewrite = ({ trigger, action, result }: WhenDoVerify): string => {
  const fill = (text: string): string => text.trim().replace(/[.!]+$/, '') || BLANK;

  return `When ${fill(trigger)}, ${fill(action)}, then verify ${fill(result)}.`;
};

export const isComplete = ({ trigger, action, result }: WhenDoVerify): boolean =>
  [trigger, action, result].every((part) => part.trim() !== '');
