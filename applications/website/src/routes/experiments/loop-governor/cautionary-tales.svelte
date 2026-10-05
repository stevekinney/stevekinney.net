<script lang="ts">
  import { bodyClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';

  // Cited figures, not simulated ones. Each is from the outline's "Governors Are Your Problem".
  const tales = [
    {
      figure: '$1,818',
      story:
        'A cron loop quietly billed the API instead of a subscription, because `ANTHROPIC_API_KEY` was set: about $858 the first night and $960 the second.',
      governor: 'A budget in dollars, checked every iteration.',
      source:
        'https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb',
      sourceName: 'dev.to',
    },
    {
      figure: 'About $6,000',
      story: 'An overnight loop re-sent a very large conversation every 30 minutes.',
      governor: 'Fresh context, and a budget. A schedule is not a budget.',
      source:
        'https://www.makeuseof.com/someone-left-claude-code-running-overnight-and-it-cost-6000/',
      sourceName: 'MakeUseOf',
    },
    {
      figure: '$437',
      story:
        'A summarizer listed the same directory 14,000 times overnight. It stopped only when it ran out of token quota.',
      governor: 'A repeated-failure check, or a stall detector.',
      source:
        'https://dev.to/runvouch/my-claude-code-cron-ran-up-1800-in-two-nights-the-watchdog-that-stops-it-at-2-3npb',
      sourceName: 'dev.to',
    },
    {
      figure: '1,966 attempts',
      story:
        '`max_iterations: 0` meant “unlimited”, so the loop asked itself the same question 1,966 times.',
      governor: 'A maximum iteration count with a real number in it.',
      source:
        'https://dev.to/sean8/i-accidentally-made-claude-ask-itself-the-same-question-1966-times-1c5h',
      sourceName: 'dev.to',
    },
  ];
</script>

<div class="space-y-3">
  <p class={bodyClasses}>These are cited figures from real loops, not simulated ones.</p>
  <ul class="grid gap-3 sm:grid-cols-2">
    {#each tales as tale (tale.figure)}
      <li class="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <p class="text-2xl font-bold text-rose-700 tabular-nums dark:text-rose-300">
          {tale.figure}
        </p>
        <p class="text-slate-700 dark:text-slate-200"><InlineCode text={tale.story} /></p>
        <p class="text-sm text-slate-900 dark:text-white">
          <span class="font-semibold">Would have stopped it:</span>
          {tale.governor}
        </p>
        <p class="text-sm">
          <a
            href={tale.source}
            rel="noopener noreferrer"
            class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
            >Source: {tale.sourceName}</a
          >
        </p>
      </li>
    {/each}
  </ul>
</div>
