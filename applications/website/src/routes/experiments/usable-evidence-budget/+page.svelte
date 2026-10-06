<script lang="ts">
  import { onMount } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import BudgetBar from './budget-bar.svelte';
  import { formatTokens, segmentDefinitions, usable } from './budget';
  import { experiment } from './experiment';
  import MovableNotes from './movable-notes.svelte';
  import { presets, toolSearchComparison } from './presets';
  import {
    applyReadout,
    assumedReservedOutput,
    parseReadout,
    scenarioFromReadout,
  } from './readout-parser';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/usable-evidence-budget` },
  ]);

  let readoutText = $state('');
  let mounted = $state(false);

  const parsed = $derived(parseReadout(readoutText));
  const applied = $derived(parsed.form === 'none' ? null : applyReadout(parsed));
  const yours = $derived(applied ? scenarioFromReadout(applied) : null);

  const listRows = (rows: { label: string; tokens: number }[]): string =>
    rows.map((row) => `${row.label} (${formatTokens(row.tokens)})`).join(', ');

  onMount(() => {
    mounted = true;
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Where your context window goes before you’ve said anything
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Before a context window holds any of the work you care about, instructions, tool definitions,
      history, room for the reply, and a margin before compaction have already claimed their share.
      Here are five common Claude Code setups side by side, and what each leaves free.
    </p>
  </header>

  <section aria-labelledby="bars-heading" class="space-y-6">
    <div class="max-w-3xl space-y-2">
      <h2 id="bars-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Five setups, one window each
      </h2>
      <p class="text-slate-700 dark:text-slate-200" data-testid="headline">
        The biggest gap you can close with one setting: turning tool search on takes the MCP-heavy
        setup from {formatTokens(usable(toolSearchComparison.off))} free to
        {formatTokens(usable(toolSearchComparison.on))}.
      </p>
    </div>

    <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-200">
      {#each segmentDefinitions as definition (definition.key)}
        <li class="flex items-center gap-2" title={definition.description}>
          <span class="{definition.fill} size-3 rounded-sm" aria-hidden="true"></span>
          {definition.name}
        </li>
      {/each}
    </ul>

    <ol class="space-y-8">
      {#each presets as preset (preset.id)}
        <BudgetBar name={preset.name} scenario={preset.scenario}>{preset.notice}</BudgetBar>
      {/each}
      {#if yours && applied}
        <BudgetBar name="Yours" scenario={yours}>
          From your <code>/context</code> paste, plus an assumed {formatTokens(
            assumedReservedOutput,
          )} for the reply, which the readout doesn’t report.
          {#if parsed.freeSpace !== null}
            The readout itself says {formatTokens(parsed.freeSpace)} free.
          {/if}
        </BudgetBar>
      {/if}
    </ol>
  </section>

  <section aria-labelledby="yours-heading" class="max-w-3xl space-y-3">
    <h2 id="yours-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      Add your own
    </h2>
    <label for="readout-text" class="block text-slate-700 dark:text-slate-200">
      Run <code>/context</code> in Claude Code and paste what it prints to add a “Yours” bar.
    </label>
    <textarea
      id="readout-text"
      rows="6"
      bind:value={readoutText}
      disabled={!mounted}
      aria-describedby="readout-privacy"
      spellcheck="false"
      placeholder="Paste your /context output here."
      class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    ></textarea>
    <p id="readout-privacy" class="text-sm text-slate-500 dark:text-slate-400">
      What you paste is read in your browser and never sent anywhere.
    </p>

    {#if readoutText.trim() !== ''}
      <div
        class="space-y-2 text-sm text-slate-700 dark:text-slate-200"
        aria-live="polite"
        data-testid="readout-result"
      >
        {#if !applied}
          <p>
            No category rows found. Paste what <code>/context</code> prints, either the
            <code>label: 3.2k tokens (1.6%)</code> lines or print mode’s table.
          </p>
        {:else if !yours}
          <p>
            There’s no header line such as <code>190k/1000k tokens</code>, so the size of the window
            is unknown. Include the top of the output.
          </p>
        {:else}
          <p>Your bar is at the bottom of the list above.</p>
        {/if}
        {#if applied && applied.deferred.length > 0}
          <p class="[overflow-wrap:anywhere]" data-testid="readout-deferred">
            Deferred rows aren’t counted, because tool search keeps them out of the window: {listRows(
              applied.deferred,
            )}.
          </p>
        {/if}
        {#if applied && applied.unrecognized.length > 0}
          <p class="[overflow-wrap:anywhere]" data-testid="readout-unrecognized">
            Not counted, because the page doesn’t know which segment they belong to: {listRows(
              applied.unrecognized,
            )}.
          </p>
        {/if}
      </div>
    {/if}
  </section>

  <MovableNotes />
</div>
