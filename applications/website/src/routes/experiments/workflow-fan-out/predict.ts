import { formatMinutes } from './results';

export type Winner = 'pipeline' | 'parallel' | 'tie';

export type Guess = { winner: Winner; minutes: number | null };

export type Reveal = {
  winner: Winner;
  /** How much sooner the winner finishes, in minutes. */
  gap: number;
  correctWinner: boolean;
  /** Whether the guessed gap is within half a minute of the real one. */
  correctGap: boolean;
  message: string;
};

const winnerOf = (pipeline: number, parallel: number): Winner =>
  pipeline === parallel ? 'tie' : pipeline < parallel ? 'pipeline' : 'parallel';

const names: Record<Exclude<Winner, 'tie'>, string> = {
  pipeline: 'pipeline()',
  parallel: 'parallel()',
};

/** Compares a guess with the two makespans. */
export const revealPrediction = (guess: Guess, pipeline: number, parallel: number): Reveal => {
  const winner = winnerOf(pipeline, parallel);
  const gap = Math.round(Math.abs(pipeline - parallel) * 10) / 10;
  const correctWinner = guess.winner === winner;
  const correctGap =
    correctWinner &&
    (winner === 'tie' || (guess.minutes !== null && Math.abs(guess.minutes - gap) <= 0.5));

  const actual =
    winner === 'tie'
      ? `They tie at ${formatMinutes(pipeline)}.`
      : `${names[winner]} finishes first, ${formatMinutes(gap)} sooner: ${formatMinutes(Math.min(pipeline, parallel))} against ${formatMinutes(Math.max(pipeline, parallel))}.`;

  let verdict: string;
  if (correctWinner && correctGap) verdict = 'You called it.';
  else if (correctWinner) {
    verdict =
      guess.minutes === null
        ? 'Right strategy.'
        : `Right strategy, but you guessed ${formatMinutes(guess.minutes)}.`;
  } else if (guess.winner === 'tie') {
    verdict = 'Most people guess a tie, because both strategies do the same total work.';
  } else {
    verdict = `You guessed ${names[guess.winner]}.`;
  }

  return { winner, gap, correctWinner, correctGap, message: `${verdict} ${actual}` };
};
