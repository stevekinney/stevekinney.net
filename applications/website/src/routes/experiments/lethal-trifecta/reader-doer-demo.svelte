<script lang="ts">
  import { Play } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import Button from '$lib/components/button';

  import { fieldClasses, labelClasses } from './field-styles';
  import {
    applyStrictSchema,
    doerActions,
    readerOutput,
    readerSchema,
    sampleIssue,
  } from './reader-doer';

  type Props = { ready: boolean };

  const { ready }: Props = $props();

  let untrusted = $state(sampleIssue);
  // Every stage shows until someone plays the animation, so nothing is hidden without JavaScript.
  let step = $state(3);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Stop the animation's timer chain when the demo goes away.
  onMount(() => () => clearTimeout(timer));

  const output = $derived(readerOutput(untrusted));
  const gate = $derived(applyStrictSchema(output));
  const actions = $derived(doerActions(gate.accepted));

  const play = (): void => {
    clearTimeout(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      step = 3;
      return;
    }

    step = 0;
    const advance = (): void => {
      step += 1;
      if (step < 3) timer = setTimeout(advance, 900);
    };
    timer = setTimeout(advance, 600);
  };

  const stage = (index: number): string =>
    `rounded-lg border p-3 transition-opacity duration-500 motion-reduce:transition-none ${
      step >= index
        ? 'opacity-100 border-slate-300 dark:border-slate-600'
        : 'opacity-25 border-dashed border-slate-300 dark:border-slate-600'
    }`;
</script>

<div class="space-y-4" data-testid="reader-doer">
  <div class="space-y-1.5">
    <label for="untrusted-text" class={labelClasses}>Untrusted text, such as an issue body</label>
    <textarea
      id="untrusted-text"
      bind:value={untrusted}
      disabled={!ready}
      rows="4"
      spellcheck="false"
      class="{fieldClasses} font-mono text-sm"></textarea>
  </div>
  <Button variant="secondary" size="small" icon={Play} disabled={!ready} onclick={play}>
    Play it through
  </Button>

  <ol class="grid gap-3 lg:grid-cols-3">
    <li class={stage(1)} data-stage="reader">
      <h4 class="text-sm font-bold text-slate-900 dark:text-white">
        1. The reader (Read and Glob only) returns JSON
      </h4>
      <pre
        class="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:bg-slate-800 dark:text-slate-100">{JSON.stringify(
          output,
          null,
          2,
        )}</pre>
    </li>
    <li class={stage(2)} data-stage="schema">
      <h4 class="text-sm font-bold text-slate-900 dark:text-white">
        2. A strict schema with no additional properties
      </h4>
      <ul class="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
        {#each readerSchema as field (field.name)}
          <li class="[overflow-wrap:anywhere]">
            <span class="font-semibold">✓ {field.name}</span>
            {#if gate.accepted[field.name] !== undefined}passes as a value{:else}missing{/if}
          </li>
        {/each}
        {#each gate.rejected as rejection (rejection.field)}
          <li class="font-semibold [overflow-wrap:anywhere] text-rose-700 dark:text-rose-300">
            ✗ {rejection.field} dropped: {rejection.reason}
          </li>
        {/each}
      </ul>
    </li>
    <li class={stage(3)} data-stage="doer">
      <h4 class="text-sm font-bold text-slate-900 dark:text-white">
        3. The doer runs its fixed plan
      </h4>
      <ul
        class="mt-2 list-disc space-y-1 pl-4 text-xs [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200"
      >
        {#each actions as action (action)}
          <li>{action}</li>
        {/each}
      </ul>
      <p class="mt-2 text-xs text-slate-600 dark:text-slate-300">
        The injected text can fill a value, such as the summary. It can’t add an action.
      </p>
    </li>
  </ol>
</div>
