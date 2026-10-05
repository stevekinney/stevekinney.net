<script lang="ts">
  import { bodyClasses, codeClasses } from './field-styles';

  const headingClasses = 'text-lg font-bold text-slate-900 dark:text-white';
  const outline =
    'the course outline, the source for every number on this page that isn’t an assumption';
</script>

<div class="max-w-3xl space-y-6 {bodyClasses}">
  <section class="space-y-2" aria-labelledby="explain-time">
    <h3 id="explain-time" class={headingClasses}>Wall-clock</h3>
    <p>
      The best speedup <em>n</em> workers can get is one divided by the serial fraction plus the
      parallel fraction split <em>n</em> ways: <code class={codeClasses}>1 / (s + (1 − s)/n)</code>.
      That’s Amdahl’s law. With 40% serial work and 4 workers it’s about 1.82×, the course outline’s
      example, and it never passes 1 ÷ 0.4 = 2.5× however many workers you add.
    </p>
    <p>
      The coordinator then reads and reconciles every report, one after another, so the time is the
      solo duration times that serial-plus-split share, plus the integration time per worker times
      the number of workers. One worker is the solo session, with nothing to integrate. The fastest
      worker count is whichever of 1 to 32 gives the shortest time. Treating workers as continuous,
      it’s the square root of the solo duration times the parallel fraction, divided by the
      integration time per worker.
    </p>
  </section>

  <section class="space-y-2" aria-labelledby="explain-tokens">
    <h3 id="explain-tokens" class={headingClasses}>Tokens</h3>
    <p>
      One session reads the shared context and the unique work once. Fanned out, every worker pays
      its spawn overhead and reads the shared context for itself, the unique work is split between
      them, and the coordinator reads every report. Both write the same output. The spawn overhead
      defaults to 20K, inside the outline’s range of “somewhere around 7.5k–44k.”
    </p>
    <p>
      For agent teams the page doesn’t split anything out. A team is the solo session times a
      multiplier: 3.5 by default, since the outline puts a three-teammate team at about 3–4× the
      tokens of one session, and 7 for teammates in plan mode. Teams buy latency, not savings.
    </p>
  </section>

  <section class="space-y-2" aria-labelledby="explain-cost">
    <h3 id="explain-cost" class={headingClasses}>Cost</h3>
    <p>
      Cost is input tokens times the input price plus output tokens times the output price, added up
      before dividing by a million. With a shared cached prefix, the first worker pays the input
      price for its spawn overhead and every other worker pays the cached-input price for theirs.
      Prices come from the site’s shared price table, and you can edit them.
    </p>
  </section>

  <section class="space-y-2" aria-labelledby="explain-assumed">
    <h3 id="explain-assumed" class={headingClasses}>What this page assumes</h3>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        A team’s wall-clock is assumed to match the subagent model. It isn’t modelled, so the tile
        says “assumed similar.” The incident-triage preset quotes its field report rather than
        computing it.
      </li>
      <li>Work splits evenly, and workers don’t wait on each other or on the concurrency limit.</li>
      <li>
        The default solo duration, shared context, unique work, output, report size, and integration
        time are assumptions. Use your own.
      </li>
      <li>Nothing you type, upload, or paste leaves this page.</li>
    </ul>
    <p>Everything else is from {outline}.</p>
  </section>
</div>
