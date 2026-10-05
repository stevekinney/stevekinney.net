<script lang="ts">
  import OutlineBadge from './outline-badge.svelte';
</script>

<footer
  aria-labelledby="footer-heading"
  class="max-w-3xl space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700"
>
  <h2 id="footer-heading" class="text-xl font-bold text-slate-900 dark:text-white">
    Which rung does this one need?
  </h2>
  <p class="text-slate-700 dark:text-slate-200">
    Ask it of every rule. Formatting goes to the formatter. Forbidden imports go to the linter.
    “Don’t write to production” goes to the credentials: the agent shouldn’t have them. Prose is for
    judgment calls. <OutlineBadge />
  </p>
  <p class="text-slate-700 dark:text-slate-200">
    Almost every mistake here is the same one: treating writing something down as doing it. A rule
    in an instructions file can only ask. A permission rule, a hook, a required check, or the OS can
    refuse. <strong>If it matters, make it executable.</strong>
  </p>
  <p class="text-sm text-slate-500 dark:text-slate-400">
    Everything on this page is the course outline’s editorial guidance, not a description of how any
    tool behaves. The linter’s rules are simple, visible heuristics, and you can edit them.
  </p>
</footer>
