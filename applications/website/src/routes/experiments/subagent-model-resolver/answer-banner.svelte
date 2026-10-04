<script lang="ts">
  import { Info, TriangleAlert } from '@lucide/svelte';

  import type { AnswerFlag } from './flags';
  import InlineCode from './inline-code.svelte';
  import { modelLabel, tierOfModel } from './models';
  import type { Resolution, ResolverConfiguration } from './resolve';
  import { swatchClasses } from './tier-style';
  import { formatVersion } from './versions';
  import type { Version } from './versions';

  type Props = {
    configuration: ResolverConfiguration;
    /** The version the answer is for, which may be the range's edge when the typed one is outside it. */
    version: Version;
    resolution: Resolution;
    flags: AnswerFlag[];
  };

  const { version, resolution, flags }: Props = $props();

  const tier = $derived(tierOfModel(resolution.model));
</script>

<section aria-labelledby="answer-heading" class="space-y-4">
  <h2 id="answer-heading" class="sr-only">The answer</h2>
  <div
    data-testid="answer-banner"
    class="flex flex-wrap items-start gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50"
  >
    <span
      class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold {swatchClasses(
        resolution.model,
      )}"
    >
      {tier === null ? 'No tier' : `Tier ${tier} of 4`}
    </span>
    <div class="min-w-0 flex-1 space-y-1">
      <p class="text-sm text-slate-600 dark:text-slate-300">
        On {formatVersion(version)}, this subagent runs on
      </p>
      <p
        data-testid="answer-model"
        class="font-mono text-3xl font-bold break-words text-slate-900 sm:text-4xl dark:text-white"
      >
        {modelLabel(resolution.model)}
      </p>
      <p data-testid="answer-why" class="text-slate-700 dark:text-slate-200">
        <InlineCode text={resolution.why} />
      </p>
    </div>
  </div>

  {#if flags.length > 0}
    <ul class="space-y-2" aria-label="Things to know about this answer">
      {#each flags as flag (flag.id)}
        <li
          data-flag={flag.id}
          class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm {flag.severity ===
          'warning'
            ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
            : 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100'}"
        >
          {#if flag.severity === 'warning'}
            <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          {:else}
            <Info aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          {/if}
          <p>
            <span class="font-semibold"
              ><span class="sr-only">{flag.severity === 'warning' ? 'Warning: ' : 'Note: '}</span
              >{flag.title}.</span
            >
            <InlineCode text={flag.body} />
          </p>
        </li>
      {/each}
    </ul>
  {/if}
</section>
