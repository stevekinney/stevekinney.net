<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import { bodyClasses, headingClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { formatProbability } from './labels';
  import { anyAutomaticGovernor, findMarker } from './loop-config';
  import type { Config } from './loop-config';

  type Props = { config: Config };

  const { config }: Props = $props();

  const NOTHING = 'Nothing: this is on you.';

  const jobs = $derived.by(() => {
    const marker = findMarker(config.marker);
    const governors = [
      config.governors.maxIterations ? `at most ${config.maxIterations} iterations` : null,
      config.governors.budget ? `a ${formatCost(config.budget)} budget` : null,
      config.governors.stall ? `a stall detector of ${config.stallM}` : null,
      config.governors.repeatedFailure ? 'a repeated-failure check' : null,
      config.governors.stopFile ? 'a stop file' : null,
    ].filter((governor): governor is string => governor !== null);

    return [
      {
        id: 'trigger',
        name: 'Trigger',
        question: 'What starts the next turn',
        answer:
          config.context === 'fresh'
            ? 'A script that starts a fresh agent every iteration, with the state on disk.'
            : 'The next turn in the same session, the way `/loop` or a `Stop` hook does it.',
        missing: false,
      },
      {
        id: 'target',
        name: 'Target',
        question: 'What should become true',
        answer: config.impossible
          ? 'A target nothing can reach. The task is impossible.'
          : `${config.k} ${config.k === 1 ? 'iteration' : 'iterations'} of real progress, each with a ${formatProbability(config.p)} chance.`,
        missing: false,
      },
      {
        id: 'oracle',
        name: 'Oracle',
        question: 'What proves it’s true',
        answer: `${marker.name}${config.dual ? ', and a deterministic check that has to agree' : ', trusted alone'}. When the measurement throws, it fails ${config.failureMode}.`,
        missing: false,
      },
      {
        id: 'governor',
        name: 'Governor',
        question: 'What forces a stop',
        answer:
          governors.length === 0
            ? NOTHING
            : `${governors.join(', ')}.${!anyAutomaticGovernor(config) ? ' A stop file only works if someone is awake to touch it.' : ''}`,
        missing: governors.length === 0,
      },
    ];
  });
</script>

<section aria-labelledby="jobs-heading" class="space-y-4">
  <div class="max-w-3xl space-y-1">
    <h2 id="jobs-heading" class={headingClasses}>The four jobs</h2>
    <p class={bodyClasses}>
      Every automated loop needs these four jobs done. <InlineCode text="`/loop`" /> supplies only the
      trigger. <InlineCode text="`/goal`" /> supplies the target and a model as the oracle. The governor
      is always yours.
    </p>
  </div>
  <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {#each jobs as job (job.id)}
      <li
        data-testid="job-{job.id}"
        class="space-y-1 rounded-lg border p-4 {job.missing
          ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40'
          : 'border-slate-200 dark:border-slate-700'}"
      >
        <h3 class="font-bold text-slate-900 dark:text-white">{job.name}</h3>
        <p class="text-xs tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {job.question}
        </p>
        <p
          class="text-sm {job.missing
            ? 'font-semibold text-rose-800 dark:text-rose-200'
            : 'text-slate-700 dark:text-slate-200'}"
        >
          <InlineCode text={job.answer} />
        </p>
      </li>
    {/each}
  </ul>
</section>
