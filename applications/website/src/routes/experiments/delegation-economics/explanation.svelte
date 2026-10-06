<script lang="ts">
  import { bodyClasses, codeClasses } from './field-styles';
</script>

<div class="max-w-3xl space-y-3 {bodyClasses}">
  <p>
    <strong>Time.</strong> The best speedup <em>n</em> workers can get is Amdahl’s law:
    <code class={codeClasses}>1 / (s + (1 − s)/n)</code>, where <em>s</em> is the serial share. With 40%
    serial work and 4 workers that’s about 1.82×, and no number of workers passes 1 ÷ 0.4 = 2.5×. That’s
    the dotted line. The coordinator then reads and reconciles every report one after another, so the
    solid line adds the integration minutes per worker times the number of workers. That term grows while
    the parallel saving shrinks, which is why the curve turns down.
  </p>
  <p>
    <strong>Tokens.</strong> One session reads the shared context and the unique work once. Fanned out,
    every worker pays its spawn overhead and reads the shared context for itself, the unique work is split
    between them, and the coordinator reads every report. Both write the same output.
  </p>
  <p>
    <strong>Cost.</strong> Input tokens times the input price plus output tokens times the output price,
    from the site’s shared price table, added up before dividing by a million. Prompt caching would lower
    both sides and isn’t modelled.
  </p>
  <p>
    <strong>Assumed.</strong> Work splits evenly, and workers never wait on each other or on a concurrency
    limit. The default minutes and token counts are illustrations; use your own.
  </p>
</div>
