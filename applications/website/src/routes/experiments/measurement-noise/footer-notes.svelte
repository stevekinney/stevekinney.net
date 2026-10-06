<script lang="ts">
  import { bodyClasses, headingClasses } from './field-styles';
</script>

<section
  aria-labelledby="footer-heading"
  class="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-700"
>
  <h2 id="footer-heading" class={headingClasses}>What to measure, and what not to</h2>
  <div class="grid gap-6 md:grid-cols-2">
    <div class="space-y-2">
      <h3 class="font-bold text-slate-900 dark:text-white">Measure</h3>
      <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
        <li><strong>Time to an accepted result</strong>, not time to a first draft.</li>
        <li><strong>Rework rate</strong>: how often a person has to touch it again afterward.</li>
        <li><strong>Review minutes</strong>.</li>
        <li><strong>Cost per accepted result</strong>, not cost per run.</li>
        <li><strong>Escaped defects</strong>: the bugs that got past review.</li>
      </ul>
    </div>
    <div class="space-y-2">
      <h3 class="font-bold text-slate-900 dark:text-white">Don’t measure</h3>
      <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
        <li>Lines of code.</li>
        <li>Suggestion acceptance rate. It goes up when you stop reading.</li>
        <li>Raw token counts.</li>
        <li>The number of agents you have running.</li>
      </ul>
    </div>
  </div>
  <p class="max-w-3xl {bodyClasses}">
    Pick one endpoint before you start, and measure a baseline before you change anything. “15%
    faster on five tasks” is noise. “I feel faster” isn’t a measurement. “We didn’t measure it” is a
    perfectly legitimate answer.
  </p>
  <p class="max-w-3xl font-semibold text-slate-900 dark:text-white">
    If it matters, make it executable. Then look at the data to see whether it actually changed.
  </p>
  <p class="max-w-3xl {bodyClasses}">
    Everything here runs in your browser. Nothing you upload, paste, or type leaves this page, and a
    copied link holds only the settings and the preset, never your data.
  </p>
</section>
