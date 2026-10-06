<script lang="ts">
  import { Plus } from '@lucide/svelte';

  import SEO from '$lib/components/seo.svelte';
  import Button from '$lib/components/button';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { compare, EXAMPLE, parseMinutes, readGrid } from './compare';
  import DotPlot from './dot-plot.svelte';
  import { experiment } from './experiment';
  import { bodyClasses, fieldClasses, headingClasses } from './field-styles';
  import PerceptionGap from './perception-gap.svelte';
  import Verdict from './verdict.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/measurement-noise` },
  ]);

  const MAX_ROWS = 30;

  let paired = $state(false);
  const example = $derived(compare(EXAMPLE.a, EXAMPLE.b, paired)!);

  let rows = $state(Array.from({ length: 5 }, () => ({ a: '', b: '' })));
  let gridPaired = $state(true);
  const typed = $derived.by(() => {
    const { a, b } = readGrid(rows, gridPaired);

    return compare(a, b, gridPaired);
  });

  const sides = ['a', 'b'] as const;

  const designs = [
    { paired: false, label: 'Ten different tasks' },
    { paired: true, label: 'Five tasks, each done both ways' },
  ];
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Is the difference real, or just noise?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      You tried a new way of working and it felt faster. Whether five timings can prove it depends
      less on the timings than on how you collected them. Here are the same ten numbers, read two
      ways.
    </p>
  </header>

  <section aria-labelledby="example-heading" class="space-y-5">
    <div class="max-w-3xl space-y-1">
      <h2 id="example-heading" class={headingClasses}>The same numbers, two designs</h2>
      <p class={bodyClasses}>
        A took 40, 55, 30, 70, and 45 minutes. B took 35, 46, 26, 60, and 38. If those are ten
        different tasks, the gap between a 26-minute task and a 70-minute one swamps the 7 minutes B
        saves. If they’re the same five tasks done both ways, each task is compared with itself, and
        that spread drops out.
      </p>
    </div>

    <div
      role="group"
      aria-label="How the tasks were run"
      class="flex max-w-xl gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
    >
      {#each designs as design (design.label)}
        <button
          type="button"
          aria-pressed={paired === design.paired}
          onclick={() => (paired = design.paired)}
          class="focus-visible:outline-primary-600 flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
        >
          {design.label}
        </button>
      {/each}
    </div>

    <Verdict comparison={example} />
    <DotPlot comparison={example} />
  </section>

  <section aria-labelledby="yours-heading" class="space-y-5">
    <div class="max-w-3xl space-y-1">
      <h2 id="yours-heading" class={headingClasses}>Try your own numbers</h2>
      <p class={bodyClasses}>
        Minutes per task, one row per task. Blank cells are skipped. Nothing you type leaves this
        page.
      </p>
    </div>

    <label class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input type="checkbox" bind:checked={gridPaired} class="accent-primary-600 mt-1" />
      <span>Each row is the same task, done both ways. Leave this off for different tasks.</span>
    </label>

    <div class="max-w-sm space-y-3">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">Minutes per task</caption>
        <thead>
          <tr
            class="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <th scope="col" class="py-2 pr-2 font-semibold">Task</th>
            <th scope="col" class="px-2 py-2 font-semibold">A minutes</th>
            <th scope="col" class="px-2 py-2 font-semibold">B minutes</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, index (index)}
            <tr class="border-b border-slate-100 dark:border-slate-800">
              <th
                scope="row"
                class="py-1.5 pr-2 font-normal text-slate-600 tabular-nums dark:text-slate-300"
              >
                {index + 1}
              </th>
              {#each sides as side (side)}
                <td class="px-2 py-1.5">
                  <input
                    type="text"
                    inputmode="decimal"
                    aria-label="{side.toUpperCase()} minutes, task {index + 1}"
                    aria-invalid={parseMinutes(row[side]) === undefined || undefined}
                    bind:value={row[side]}
                    class="{fieldClasses} w-full py-1"
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <Button
        variant="secondary"
        size="small"
        icon={Plus}
        disabled={rows.length >= MAX_ROWS}
        onclick={() => rows.push({ a: '', b: '' })}
      >
        Add a task
      </Button>
    </div>

    {#if typed}
      <Verdict comparison={typed} testId="your-verdict" />
    {:else}
      <p class={bodyClasses} data-testid="your-verdict-empty">
        {gridPaired
          ? 'Fill in both times for at least two tasks to get a verdict.'
          : 'Fill in at least two times on each side to get a verdict.'}
      </p>
    {/if}
  </section>

  <section aria-labelledby="perception-heading" class="space-y-3">
    <h2 id="perception-heading" class={headingClasses}>Feeling faster isn’t a measurement</h2>
    <PerceptionGap />
  </section>

  <section
    aria-labelledby="notes-heading"
    class="max-w-3xl space-y-3 border-t border-slate-200 pt-8 dark:border-slate-700"
  >
    <h2 id="notes-heading" class={headingClasses}>What to measure, and how this works</h2>
    <p class={bodyClasses}>
      Measure the time to an accepted result, not to a first draft. Count rework (how often someone
      has to touch it again), review minutes, cost per accepted result rather than per run, and the
      bugs that got past review. A way of working that’s 20% faster but doubles rework hasn’t saved
      you anything, so pick the one endpoint you care about before you start, and measure a baseline
      before you change anything.
    </p>
    <p class={bodyClasses}>
      Don’t measure lines of code, suggestion acceptance rates (they go up when you stop reading),
      raw token counts, or how many agents you have running. None of them is an outcome, so no
      amount of data about them can tell you whether the work got better. “We didn’t measure it” is
      a more honest answer than any of those.
    </p>
    <p class={bodyClasses}>
      The verdict is a 95% t interval for A − B. Unpaired, it’s Welch’s interval, which doesn’t
      assume the two groups vary the same amount. Paired, it’s a one-sample interval on each task’s
      own difference. If the interval leaves out zero, the data can tell A and B apart. The
      task-count sentence uses the normal approximation for a two-sided test at α = 0.05 with 80%
      power, taking the spread and the difference from your data.
    </p>
  </section>
</div>
