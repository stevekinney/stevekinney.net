<script lang="ts">
  import { tick } from 'svelte';

  import Button from '$lib/components/button';
  import { focusAfterUpdate } from '$lib/experiments/focus-after-update';

  import BarChart from './bar-chart.svelte';
  import {
    bodyClasses,
    codeClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
  } from './field-styles';
  import { CARD_COUNT, dealCards, formatSeconds, parseSeed, summarizeRound } from './game';
  import type { ApprovalCard, CardResult, Decision } from './game';

  const randomSeed = (): number => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);

    return values[0];
  };

  // The component loads only in the browser, so the seed can be drawn here.
  let seedText = $state(String(randomSeed()));
  let phase = $state<'ready' | 'playing' | 'done'>('ready');
  let cards = $state.raw<ApprovalCard[]>([]);
  let results = $state.raw<CardResult[]>([]);
  let seed = $state(0);
  let shownAt = 0;
  let cardElement = $state<HTMLElement | undefined>();

  const parsedSeed = $derived(parseSeed(seedText));
  const current = $derived(phase === 'playing' ? cards[results.length] : undefined);
  const summary = $derived(phase === 'done' ? summarizeRound(cards, results) : null);

  const start = async (): Promise<void> => {
    if (parsedSeed === null) return;

    seed = parsedSeed;
    cards = dealCards(seed);
    results = [];
    phase = 'playing';
    await tick();
    cardElement?.focus();
    shownAt = performance.now();
  };

  /** Set while a decision waits for the next card to render, so input meanwhile is ignored. */
  let deciding = false;

  const decide = async (decision: Decision): Promise<void> => {
    if (phase !== 'playing' || deciding) return;
    deciding = true;

    try {
      const milliseconds = Math.max(0, performance.now() - shownAt);
      results = [...results, { position: results.length + 1, decision, milliseconds }];

      if (results.length >= CARD_COUNT) {
        phase = 'done';
        // The card that had focus goes away, so focus moves to the verdict.
        await focusAfterUpdate('game-results');
        return;
      }

      await tick();
      shownAt = performance.now();
    } finally {
      deciding = false;
    }
  };

  /**
   * The second click of a double-click arrives after the next card has
   * rendered, so the in-flight flag no longer holds it back, yet nobody could
   * have read that card. Clicks after the first in a quick series are ignored.
   */
  const handleClick = (event: MouseEvent, decision: Decision): void => {
    if (event.detail > 1) return;
    void decide(decision);
  };

  /**
   * The single-key shortcuts listen on the card, not the window, so they only
   * fire while focus is on the card or its buttons (WCAG 2.1.4).
   */
  const handleKeydown = (event: KeyboardEvent): void => {
    if (phase !== 'playing' || event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'y') {
      event.preventDefault();
      void decide('allow');
    } else if (key === 'd' || key === 'n') {
      event.preventDefault();
      void decide('deny');
    }
  };

  const playAgain = (fresh: boolean): void => {
    if (fresh) seedText = String(randomSeed());
    phase = 'ready';
    void focusAfterUpdate('game-start');
  };

  /** What the live region says for each prompt: everything on the card but the seed. */
  const announcement = $derived(
    current
      ? `Prompt ${results.length + 1} of ${CARD_COUNT}: ${current.tool}, ${current.request}`
      : '',
  );
</script>

<div class="space-y-4">
  <p class="sr-only" aria-live="polite" data-testid="card-announcement">{announcement}</p>
  <p class={hintClasses}>
    Your decisions and timings stay in this tab. Nothing is recorded or sent anywhere.
  </p>

  {#if phase === 'ready'}
    <div class="space-y-3">
      <p class={bodyClasses}>
        You’ll see {CARD_COUNT} approval prompts from a coding agent working in
        <code class={codeClasses}>~/code/acme-web</code>, one at a time. Allow the routine ones and
        deny anything you wouldn’t want run. Go at the pace you’d really use. Press
        <kbd class={codeClasses}>A</kbd> to allow and <kbd class={codeClasses}>D</kbd> to deny, or use
        the buttons.
      </p>
      <form
        class="flex flex-wrap items-end gap-3"
        onsubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <div class="space-y-1">
          <label for="game-seed" class={labelClasses}>Seed</label>
          <input
            id="game-seed"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            bind:value={seedText}
            aria-invalid={parsedSeed === null || undefined}
            aria-describedby="game-seed-hint"
            class="{fieldClasses} w-40"
          />
        </div>
        <Button id="game-start" type="submit" variant="primary" disabled={parsedSeed === null}
          >Start the round</Button
        >
      </form>
      <p
        id="game-seed-hint"
        class={parsedSeed === null ? 'text-sm text-red-700 dark:text-red-400' : hintClasses}
      >
        {parsedSeed === null
          ? 'Enter a whole number from 0 to 4,294,967,295.'
          : 'The seed decides the cards and where the dangerous one falls. Share it and someone else gets the same round.'}
      </p>
    </div>
  {:else if phase === 'playing' && current}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={cardElement}
      tabindex="-1"
      role="group"
      aria-labelledby="card-heading"
      onkeydown={handleKeydown}
      data-testid="approval-card"
      class="max-w-xl space-y-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm outline-none dark:border-slate-600 dark:bg-slate-900"
    >
      <p id="card-heading" class="text-sm text-slate-600 dark:text-slate-300">
        Prompt {results.length + 1} of {CARD_COUNT} · seed {seed}
      </p>
      <p class="font-semibold text-slate-900 dark:text-white">
        The agent wants to use <span class="font-mono">{current.tool}</span>:
      </p>
      <pre
        class="rounded bg-slate-100 p-3 font-mono text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-900 dark:bg-slate-800 dark:text-slate-100"
        data-testid="card-request">{current.request}</pre>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Working directory: <span class="font-mono">{current.workingDirectory}</span>
      </p>
      <div class="flex flex-wrap gap-3">
        <Button variant="primary" onclick={(event: MouseEvent) => handleClick(event, 'allow')}
          >Allow (A)</Button
        >
        <Button variant="secondary" onclick={(event: MouseEvent) => handleClick(event, 'deny')}
          >Deny (D)</Button
        >
      </div>
    </div>
  {:else if phase === 'done' && summary}
    <div
      id="game-results"
      role="group"
      aria-labelledby="game-verdict"
      tabindex="-1"
      class="space-y-4 outline-none"
      data-testid="game-results"
    >
      <p
        class="text-lg font-semibold {summary.caught
          ? 'text-slate-900 dark:text-white'
          : 'text-rose-700 dark:text-rose-300'}"
        id="game-verdict"
        data-testid="game-verdict"
      >
        {summary.caught
          ? `You caught it. The dangerous prompt was number ${summary.dangerousPosition}.`
          : `You allowed it. The dangerous prompt was number ${summary.dangerousPosition}.`}
      </p>
      <p class="text-slate-800 dark:text-slate-100">
        <span class="font-mono [overflow-wrap:anywhere]"
          >{cards[summary.dangerousPosition - 1].request}</span
        >:
        {cards[summary.dangerousPosition - 1].why} You took {formatSeconds(
          summary.dangerousMilliseconds,
        )}
        on it. Your median was {formatSeconds(summary.medianFirstHalf)} over the first ten prompts and
        {formatSeconds(summary.medianSecondHalf)} over the last ten{summary.falseAlarms > 0
          ? `, and you denied ${summary.falseAlarms} routine ${summary.falseAlarms === 1 ? 'prompt' : 'prompts'}`
          : ''}.
      </p>
      <BarChart
        label="Seconds you took to decide each prompt, by position. The dangerous prompt is outlined. Arrow keys move between prompts. The table below has the same numbers."
        axisTitle="Prompt"
        categories={results.map((result) => String(result.position))}
        series={[
          {
            id: 'seconds',
            name: 'Seconds to decide',
            values: results.map((result) => result.milliseconds / 1000),
            tone: 'primary',
          },
        ]}
        formatValue={(value) => formatSeconds(value * 1000)}
        describe={(index) => [
          `${results[index].decision === 'allow' ? 'Allowed' : 'Denied'}${cards[index].dangerous ? ', the dangerous one' : ''}`,
        ]}
        highlight={summary.dangerousPosition - 1}
        testId="game-chart"
      />
      <blockquote
        class="border-l-4 border-slate-300 pl-4 text-slate-800 italic dark:border-slate-600 dark:text-slate-100"
      >
        “After the tenth approval you’re clicking through rather than reviewing.”
        <footer class="mt-1 text-sm text-slate-600 not-italic dark:text-slate-300">
          Claude Code’s best-practices documentation, quoted in the outline’s “You Are a
          Load-Sensitive Component”
        </footer>
      </blockquote>
      <details>
        <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
          Every prompt as a table
        </summary>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
          role="region"
          aria-label="Round table"
          tabindex="0"
        >
          <table class="mt-2 w-full min-w-[28rem] text-left text-sm tabular-nums">
            <thead class="text-slate-600 dark:text-slate-300">
              <tr>
                <th scope="col" class="py-1 pr-3">Prompt</th>
                <th scope="col" class="py-1 pr-3">Request</th>
                <th scope="col" class="py-1 pr-3">You</th>
                <th scope="col" class="py-1">Time</th>
              </tr>
            </thead>
            <tbody class="text-slate-800 dark:text-slate-100">
              {#each results as result, index (result.position)}
                <tr class="border-t border-slate-200 dark:border-slate-700">
                  <th scope="row" class="py-1 pr-3 font-normal">
                    {result.position}{cards[index].dangerous ? ' (dangerous)' : ''}
                  </th>
                  <td class="py-1 pr-3 font-mono text-xs [overflow-wrap:anywhere]"
                    >{cards[index].request}</td
                  >
                  <td class="py-1 pr-3">{result.decision === 'allow' ? 'Allowed' : 'Denied'}</td>
                  <td class="py-1">{formatSeconds(result.milliseconds)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
      <div class="flex flex-wrap gap-3">
        <Button variant="secondary" onclick={() => playAgain(false)}>Play seed {seed} again</Button>
        <Button variant="secondary" onclick={() => playAgain(true)}>Play a new seed</Button>
      </div>
    </div>
  {/if}
</div>
