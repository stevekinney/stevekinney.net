<script lang="ts">
  import { tick } from 'svelte';

  import { variants } from '$lib/components/button/variants';

  import CustomDeckPanel from './custom-deck-panel.svelte';
  import type { CustomCard } from './custom-scenarios';
  import { currentId, isFinished, results, score } from './deal';
  import type { GameState } from './deal';
  import { bodyClasses, fieldClasses, labelClasses, subheadingClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { findMechanism, mechanisms } from './mechanisms';
  import type { MechanismId } from './mechanisms';
  import OutlineBadge from './outline-badge.svelte';
  import { grade, missReason } from './scenarios';
  import type { Scenario } from './scenarios';

  type Props = {
    deck: Scenario[];
    game: GameState;
    ready: boolean;
    customCards: CustomCard[];
    storageAvailable: boolean;
    onPick: (id: MechanismId) => void;
    onNext: () => void;
    onRetry: () => void;
    onShuffle: () => void;
    onRestart: () => void;
    onCustomChange: (cards: CustomCard[]) => void;
  };

  const {
    deck,
    game,
    ready,
    customCards,
    storageAvailable,
    onPick,
    onNext,
    onRetry,
    onShuffle,
    onRestart,
    onCustomChange,
  }: Props = $props();

  const scenarios = $derived(new Map(deck.map((scenario) => [scenario.id, scenario])));
  const current = $derived.by(() => {
    const id = currentId(game);
    return id ? (scenarios.get(id) ?? null) : null;
  });
  const chosen = $derived(current ? (game.picks[current.id] ?? null) : null);
  const result = $derived(current && chosen ? grade(current, chosen) : null);
  const tally = $derived(score(game, deck));
  const finished = $derived(isFinished(game));
  const misses = $derived(results(game, deck).filter((entry) => entry.grade === 'miss'));

  let selectValue = $state<MechanismId | ''>('');
  let dragging = $state(false);
  let dropTarget = $state<MechanismId | null>(null);
  let nextButton = $state<HTMLButtonElement | undefined>();
  let cardHeading = $state<HTMLElement | undefined>();

  const choose = async (id: MechanismId): Promise<void> => {
    if (!ready || game.revealed) return;
    onPick(id);
    selectValue = '';
    await tick();
    nextButton?.focus();
  };

  const next = async (): Promise<void> => {
    onNext();
    await tick();
    cardHeading?.focus();
  };

  const gradeText = {
    match: 'Matches the outline',
    alternative: 'A defensible alternative',
    miss: 'Not the outline’s answer',
  };
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-slate-600 dark:text-slate-300" data-testid="game-progress">
      {#if game.retry}Retrying misses ·{/if}
      Card {Math.min(game.position + 1, game.order.length)} of {game.order.length} · Score
      <span data-testid="game-score">{tally.matched + tally.alternatives} of {tally.answered}</span>
      · Seed <span class="font-mono" data-testid="game-seed">{game.seed}</span>
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class={variants({ variant: 'secondary', size: 'small' })}
        disabled={!ready}
        onclick={onRestart}>Start over</button
      >
      <button
        type="button"
        class={variants({ variant: 'secondary', size: 'small' })}
        disabled={!ready}
        onclick={onShuffle}>New shuffle</button
      >
    </div>
  </div>

  {#if current}
    <div class="space-y-4">
      <div
        role="group"
        aria-labelledby="scenario-card-text"
        draggable={ready && !game.revealed ? 'true' : 'false'}
        data-testid="scenario-card"
        data-scenario={current.id}
        ondragstart={(event) => {
          event.dataTransfer?.setData('text/plain', current.id);
          dragging = true;
        }}
        ondragend={() => {
          dragging = false;
          dropTarget = null;
        }}
        class="rounded-lg border-2 border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800 {!game.revealed
          ? 'md:cursor-grab'
          : ''}"
      >
        <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Scenario{#if current.custom}&nbsp;· your card{/if}
        </p>
        <p
          id="scenario-card-text"
          bind:this={cardHeading}
          tabindex="-1"
          class="text-lg font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
        >
          <InlineCode text={current.text} />
        </p>
        {#if !game.revealed}
          <p class="mt-1 hidden text-xs text-slate-500 md:block dark:text-slate-400">
            Drag it onto a mechanism, or choose one.
          </p>
        {/if}
      </div>

      {#if !game.revealed}
        <div class="hidden md:block">
          <p id="drop-targets-label" class={labelClasses}>Place this card on</p>
          <div
            role="group"
            aria-labelledby="drop-targets-label"
            class="mt-2 grid grid-cols-3 gap-1.5 lg:grid-cols-4"
          >
            {#each mechanisms as mechanism (mechanism.id)}
              <button
                type="button"
                data-target={mechanism.id}
                disabled={!ready}
                ondragover={(event) => {
                  event.preventDefault();
                  dropTarget = mechanism.id;
                }}
                ondragleave={() => {
                  if (dropTarget === mechanism.id) dropTarget = null;
                }}
                ondrop={(event) => {
                  event.preventDefault();
                  dragging = false;
                  dropTarget = null;
                  choose(mechanism.id);
                }}
                onclick={() => choose(mechanism.id)}
                class="focus-visible:outline-primary-600 rounded-md border px-2 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 {dropTarget ===
                mechanism.id
                  ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/40'
                  : dragging
                    ? 'border-dashed border-slate-400 dark:border-slate-500'
                    : 'border-slate-300 hover:border-slate-500 dark:border-slate-600'}"
              >
                {mechanism.name}
              </button>
            {/each}
          </div>
        </div>

        <form
          class="flex flex-wrap items-end gap-2 md:hidden"
          onsubmit={(event) => {
            event.preventDefault();
            if (selectValue) choose(selectValue);
          }}
        >
          <div class="min-w-0 flex-1 space-y-1.5">
            <label for="game-answer" class={labelClasses}>Your answer</label>
            <select
              id="game-answer"
              class={fieldClasses}
              bind:value={selectValue}
              disabled={!ready}
            >
              <option value="" disabled>Choose a mechanism</option>
              {#each mechanisms as mechanism (mechanism.id)}
                <option value={mechanism.id}>{mechanism.name}</option>
              {/each}
            </select>
          </div>
          <button
            type="submit"
            class={variants({ variant: 'primary', size: 'large' })}
            disabled={!ready || selectValue === ''}>Place card</button
          >
        </form>
      {/if}

      <div aria-live="polite">
        {#if game.revealed && chosen && result}
          {@const answer = findMechanism(current.answer)}
          {@const reason = missReason(current, chosen)}
          <div
            data-testid="game-feedback"
            data-grade={result}
            class="space-y-2 rounded-lg border p-4 {result === 'miss'
              ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30'
              : 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30'}"
          >
            <p class="font-bold text-slate-900 dark:text-white">
              {gradeText[result]}. You picked {findMechanism(chosen).name}.
            </p>
            <p class="text-slate-800 dark:text-slate-100">
              {current.custom ? 'Your answer' : 'The outline’s answer'}:
              <strong>{answer.name}</strong>{#if current.answerDetail}&nbsp;(<InlineCode
                  text={current.answerDetail}
                />){/if}.
              {#if !current.custom}<OutlineBadge />{/if}
            </p>
            <p class="text-slate-700 dark:text-slate-200">
              <InlineCode text={current.reasoning} />
            </p>
            {#if result === 'miss' && current.tempting}
              <p class="text-slate-700 dark:text-slate-200" data-testid="tempting">
                {#if reason}
                  Why not {current.tempting.label}: {reason}
                {:else}
                  The tempting wrong answer is {current.tempting.label}: <InlineCode
                    text={current.tempting.why}
                  />
                {/if}
              </p>
            {/if}
            {#if current.alternatives.length > 0}
              <p class="text-sm text-slate-600 dark:text-slate-300" data-testid="alternatives">
                Also defensible:
                {#each current.alternatives as alternative, index (alternative.id)}
                  {index > 0 ? '; ' : ''}{findMechanism(alternative.id).name}, {alternative.note}
                {/each}
              </p>
            {/if}
            <button
              type="button"
              bind:this={nextButton}
              class={variants({ variant: 'primary', size: 'medium' })}
              onclick={next}
            >
              {game.position + 1 >= game.order.length ? 'See the review' : 'Next card'}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else if finished}
    <section aria-labelledby="review-heading" class="space-y-3" data-testid="game-review">
      <h3 id="review-heading" class={subheadingClasses} tabindex="-1">
        {game.order.length === 0 ? 'Nothing to retry' : 'Review'}
      </h3>
      <p class="text-slate-700 dark:text-slate-200" data-testid="review-summary">
        {tally.matched} of {tally.answered} matched the outline{#if tally.alternatives > 0}, {tally.alternatives}
          more picked a defensible alternative{/if}, and {tally.missed}
        {tally.missed === 1 ? 'was a miss' : 'were misses'}.
      </p>
      {#if misses.length > 0}
        <ul class="space-y-2" data-testid="review-misses">
          {#each misses as miss (miss.scenario.id)}
            <li
              class="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/60"
              data-scenario={miss.scenario.id}
            >
              <p class="font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white">
                <InlineCode text={miss.scenario.text} />
              </p>
              <p class="text-slate-700 dark:text-slate-200">
                You said {findMechanism(miss.pick).name}. The answer is
                {findMechanism(miss.scenario.answer).name}: <InlineCode
                  text={miss.scenario.reasoning}
                />
              </p>
            </li>
          {/each}
        </ul>
        <button
          type="button"
          class={variants({ variant: 'primary', size: 'medium' })}
          disabled={!ready}
          onclick={onRetry}
        >
          Retry the {misses.length} missed {misses.length === 1 ? 'card' : 'cards'}
        </button>
      {:else}
        <p class={bodyClasses}>No misses. Start over or shuffle for a new order.</p>
      {/if}
    </section>
  {/if}

  <CustomDeckPanel cards={customCards} {ready} {storageAvailable} onChange={onCustomChange} />
</div>
