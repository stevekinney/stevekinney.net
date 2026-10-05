<script lang="ts">
  import { bodyClasses, headingClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';

  const parts = [
    ['`measure()`', 'Runs the checks and returns facts: error counts, coverage, open issues.'],
    ['`pick()`', 'Chooses one task from those facts.'],
    ['`run()`', 'Calls the agent. This is the only part the agent controls.'],
    [
      '`accept()`',
      'Keeps the work, or rolls it back, only if nothing vetoed it, the tests and build still pass, and the score didn’t drop.',
    ],
    ['The governor', 'Enforces caps, detects stalls, and checks for the kill switch.'],
  ] as const;

  const firstSteps = [
    'The oracle, plus the known-bad changes that prove it can fail.',
    'A queue that can rebuild its state from disk.',
    'Spending limits, each with an actual number.',
    'A one-line-per-iteration log that includes the `session_id`.',
    'Then, and only then, the loop itself.',
  ];
</script>

<footer class="grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-2 dark:border-slate-700">
  <section aria-labelledby="five-parts-heading" class="space-y-3">
    <h2 id="five-parts-heading" class={headingClasses}>The five parts of a loop</h2>
    <dl class="space-y-2">
      {#each parts as [name, description] (name)}
        <div>
          <dt class="font-semibold text-slate-900 dark:text-white"><InlineCode text={name} /></dt>
          <dd class={bodyClasses}>{description}</dd>
        </div>
      {/each}
    </dl>
  </section>
  <section aria-labelledby="build-first-heading" class="space-y-3">
    <h2 id="build-first-heading" class={headingClasses}>What to build first</h2>
    <ol class="list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-200">
      {#each firstSteps as step (step)}
        <li><InlineCode text={step} /></li>
      {/each}
    </ol>
    <p class={bodyClasses}>
      The simulation’s rates are illustrative and its cited figures come from the sources linked
      above. Everything runs in your browser.
    </p>
  </section>
</footer>
