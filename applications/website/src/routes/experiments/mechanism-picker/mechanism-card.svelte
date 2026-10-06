<script lang="ts">
  import { bodyClasses, panelClasses, subheadingClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { findRung } from './ladder';
  import { concernLabels, deciderLabels, findMechanism } from './mechanisms';
  import type { Mechanism, MechanismId } from './mechanisms';
  import OutlineBadge from './outline-badge.svelte';

  type Props = {
    mechanism: Mechanism;
    ready: boolean;
    onSelect: (id: MechanismId) => void;
  };

  const { mechanism, ready, onSelect }: Props = $props();

  const rung = $derived(findRung(mechanism.rung));

  const linkClasses =
    'text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer font-semibold underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed';
</script>

<article
  aria-labelledby="card-heading"
  data-testid="mechanism-card"
  data-mechanism={mechanism.id}
  class={panelClasses}
>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <h3 id="card-heading" class="text-2xl font-bold text-slate-900 dark:text-white" tabindex="-1">
        {mechanism.name}
      </h3>
      {#if mechanism.aside}
        <span class="font-mono text-sm text-slate-500 dark:text-slate-400">{mechanism.aside}</span>
      {/if}
      <OutlineBadge />
    </div>
    <p class="text-slate-700 dark:text-slate-200">{mechanism.definition}</p>
  </div>

  <dl class="grid gap-3 text-sm sm:grid-cols-2">
    <div>
      <dt class="font-semibold text-slate-700 dark:text-slate-200">Holds</dt>
      <dd class="text-slate-600 dark:text-slate-300">{mechanism.holds}</dd>
    </div>
    <div>
      <dt class="font-semibold text-slate-700 dark:text-slate-200">Triggered by</dt>
      <dd class="text-slate-600 dark:text-slate-300">
        {mechanism.triggeredBy} (decided by {deciderLabels[mechanism.decidedBy].toLowerCase()})
      </dd>
    </div>
    <div>
      <dt class="font-semibold text-slate-700 dark:text-slate-200">Enforcement</dt>
      <dd class="text-slate-600 dark:text-slate-300" data-testid="card-enforcement">
        {#if rung}
          {rung.name} rung: {rung.power}
        {:else}
          Not on the ladder. {mechanism.enforcement}{mechanism.enforcement.endsWith('.') ? '' : '.'}
        {/if}
      </dd>
    </div>
    <div>
      <dt class="font-semibold text-slate-700 dark:text-slate-200">Typical cost</dt>
      <dd class="text-slate-600 dark:text-slate-300">{mechanism.cost}</dd>
    </div>
    <div class="sm:col-span-2">
      <dt class="font-semibold text-slate-700 dark:text-slate-200">Serves</dt>
      <dd class="text-slate-600 dark:text-slate-300">
        {mechanism.concerns.map((concern) => concernLabels[concern]).join(', ')}
      </dd>
    </div>
  </dl>

  <section aria-labelledby="fits-heading" class="space-y-2">
    <h4 id="fits-heading" class={subheadingClasses}>Good fits</h4>
    <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
      {#each mechanism.fits as fit (fit)}
        <li><InlineCode text={fit} /></li>
      {/each}
    </ul>
  </section>

  {#if mechanism.antiPatterns.length > 0}
    <section aria-labelledby="anti-heading" class="space-y-2">
      <h4 id="anti-heading" class={subheadingClasses}>Anti-patterns</h4>
      <ul class="space-y-3" data-testid="anti-patterns">
        {#each mechanism.antiPatterns as pattern (pattern.pattern)}
          <li class="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p class="font-semibold text-slate-900 dark:text-white">
              <InlineCode text={pattern.pattern} />
            </p>
            <p class="text-slate-600 dark:text-slate-300">{pattern.why}</p>
            <p class="text-slate-700 dark:text-slate-200">
              <span class="font-semibold">Better:</span>
              <InlineCode text={pattern.better} />
              {#each pattern.instead as id, index (id)}
                {index === 0 ? ' Go to ' : ', '}<button
                  type="button"
                  class={linkClasses}
                  disabled={!ready}
                  onclick={() => onSelect(id)}>{findMechanism(id).name}</button
                >{/each}{pattern.instead.length > 0 ? '.' : ''}
            </p>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section aria-labelledby="instead-heading" class="space-y-2">
    <h4 id="instead-heading" class={subheadingClasses}>Use this instead</h4>
    <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200" data-testid="use-instead">
      {#each mechanism.useInstead as target (target.id)}
        <li>
          <button
            type="button"
            class={linkClasses}
            disabled={!ready}
            onclick={() => onSelect(target.id)}>{findMechanism(target.id).name}</button
          >
          when <InlineCode text={target.when} />
        </li>
      {/each}
    </ul>
  </section>
</article>
