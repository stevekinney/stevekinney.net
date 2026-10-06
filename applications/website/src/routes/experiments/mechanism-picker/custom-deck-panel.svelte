<script lang="ts">
  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import {
    MAXIMUM_CUSTOM_CARDS,
    MAXIMUM_REASONING_LENGTH,
    MAXIMUM_SCENARIO_LENGTH,
    mergeDecks,
    parseDeck,
    serializeDeck,
  } from './custom-scenarios';
  import type { CustomCard } from './custom-scenarios';
  import { downloadText } from './download';
  import {
    bodyClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
    panelClasses,
  } from './field-styles';
  import { findMechanism, mechanisms } from './mechanisms';
  import type { MechanismId } from './mechanisms';
  import { readTextFile } from './read-text-file';

  type Props = {
    cards: CustomCard[];
    ready: boolean;
    /** Whether the browser lets the page keep the cards between visits. */
    storageAvailable: boolean;
    onChange: (cards: CustomCard[]) => void;
  };

  const { cards, ready, storageAvailable, onChange }: Props = $props();

  let scenario = $state('');
  let answer = $state<MechanismId | ''>('');
  let reasoning = $state('');
  let busy = $state(false);
  let status = $state<string | null>(null);
  let problems = $state<string[]>([]);

  const canAdd = $derived(
    ready && scenario.trim() !== '' && answer !== '' && cards.length < MAXIMUM_CUSTOM_CARDS,
  );

  const add = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!canAdd || answer === '') return;

    const merged = mergeDecks(cards, [
      {
        scenario: scenario.replace(/\s+/g, ' ').trim(),
        answer,
        reasoning: reasoning.replace(/\s+/g, ' ').trim(),
      },
    ]);
    const before = cards.length;
    status = merged.length === before ? 'That card is already in your deck.' : 'Card added.';
    onChange(merged);
    scenario = '';
    answer = '';
    reasoning = '';
  };

  const remove = (index: number): void => {
    onChange(cards.filter((_, position) => position !== index));
    status = 'Card removed.';
  };

  const importFiles = async (files: Promise<SourceFile[]>): Promise<void> => {
    busy = true;
    problems = [];
    try {
      const [first] = await files;
      if (!first) return;

      const read = await readTextFile(first.file);
      if (!read.ok) {
        problems = [read.reason];
        return;
      }

      const result = parseDeck(read.text);
      // The parent updates `cards` as soon as onChange runs, so count against the deck from before.
      const before = cards.length;
      const merged = mergeDecks(cards, result.cards);
      onChange(merged);
      problems = result.skipped;
      status = `Imported ${merged.length - before} of ${result.total.toLocaleString('en-US')} cards from ${first.path}.`;
    } catch {
      problems = ['Couldn’t read that file.'];
    } finally {
      busy = false;
    }
  };
</script>

<section aria-labelledby="custom-heading" class={panelClasses}>
  <div class="space-y-1">
    <h3 id="custom-heading" class="text-lg font-bold text-slate-900 dark:text-white">
      Your own scenarios
    </h3>
    <p class={bodyClasses}>
      Add cards from your own work, with the answer you’d expect. They join the deck the next time
      it’s dealt.
      {storageAvailable
        ? 'They’re kept in this browser only.'
        : 'This browser won’t let the page keep them, so export them before you leave.'}
      Export them as JSON to share a deck with your team.
    </p>
  </div>

  <form class="grid gap-3 sm:grid-cols-2" onsubmit={add}>
    <label class="space-y-1.5 sm:col-span-2">
      <span class={labelClasses}>Scenario</span>
      <input
        class={fieldClasses}
        bind:value={scenario}
        maxlength={MAXIMUM_SCENARIO_LENGTH}
        disabled={!ready}
        placeholder="Block a merge when the changelog is missing"
      />
    </label>
    <div class="space-y-1.5">
      <label for="custom-answer" class={labelClasses}>Expected answer</label>
      <select id="custom-answer" class={fieldClasses} bind:value={answer} disabled={!ready}>
        <option value="" disabled>Choose a mechanism</option>
        {#each mechanisms as mechanism (mechanism.id)}
          <option value={mechanism.id}>{mechanism.name}</option>
        {/each}
      </select>
    </div>
    <label class="space-y-1.5">
      <span class={labelClasses}>Why (optional)</span>
      <input
        class={fieldClasses}
        bind:value={reasoning}
        maxlength={MAXIMUM_REASONING_LENGTH}
        disabled={!ready}
      />
    </label>
    <div class="sm:col-span-2">
      <Button type="submit" size="small" variant="primary" disabled={!canAdd}>Add card</Button>
    </div>
  </form>

  <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{status}</p>

  {#if cards.length > 0}
    <ul class="space-y-1.5" data-testid="custom-cards">
      {#each cards as card, index (`${card.scenario}-${card.answer}`)}
        <li
          class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
        >
          <span class="min-w-0 [overflow-wrap:anywhere] text-slate-800 dark:text-slate-100">
            {card.scenario}
            <span class="text-slate-500 dark:text-slate-400"
              >→ {findMechanism(card.answer).name}</span
            >
          </span>
          <Button
            variant="ghost"
            size="small"
            disabled={!ready}
            aria-label="Remove “{card.scenario}”"
            onclick={() => remove(index)}>Remove</Button
          >
        </li>
      {/each}
    </ul>
  {/if}

  <div class="flex flex-wrap gap-3">
    <Button
      variant="secondary"
      size="small"
      disabled={!ready || cards.length === 0}
      onclick={() =>
        downloadText('which-primitive-deck.json', serializeDeck(cards), 'application/json')}
    >
      Export deck as JSON
    </Button>
    {#if cards.length > 0}
      <Button variant="ghost" size="small" disabled={!ready} onclick={() => onChange([])}>
        Remove all
      </Button>
    {/if}
  </div>

  <FileDropZone
    title="Import a deck"
    draggingTitle="Drop to import this deck"
    accept=".json,application/json"
    fileButtonLabel="Choose a deck file"
    onFiles={importFiles}
    {busy}
  >
    A JSON file exported from this page: <code>{'{ "version": 1, "scenarios": [...] }'}</code>
  </FileDropZone>

  {#if problems.length > 0}
    <ul class="list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200" role="status">
      {#each problems as problem (problem)}
        <li>{problem}</li>
      {/each}
    </ul>
  {/if}
  <p class={hintClasses}>Up to {MAXIMUM_CUSTOM_CARDS} cards.</p>
</section>
