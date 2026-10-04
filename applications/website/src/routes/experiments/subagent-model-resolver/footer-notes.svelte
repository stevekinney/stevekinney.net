<script lang="ts">
  import InlineCode from './inline-code.svelte';
  import { rulesVerifiedOn } from './version-boundaries';
</script>

<footer
  class="max-w-3xl space-y-5 border-t border-slate-200 pt-8 dark:border-slate-700"
  aria-labelledby="notes-heading"
>
  <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">
    Notes and what this doesn’t model
  </h2>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">The order from 2.1.251 on</h3>
    <p class="text-slate-700 dark:text-slate-200">
      For a custom agent, the per-invocation model wins, then the definition’s <InlineCode
        text="`model:`"
      />, then <InlineCode text="`CLAUDE_CODE_SUBAGENT_MODEL`" />, then the main conversation’s
      model. An <InlineCode text="`inherit`" /> in the definition means the main model. An env var of
      <InlineCode text="`inherit`" /> is the same as leaving it unset.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">What FORCE does</h3>
    <p class="text-slate-700 dark:text-slate-200">
      <InlineCode text="`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`" /> arrived in 2.1.257. It applies the env
      model, or the main model when there isn’t one, to every subagent, and ignores per-invocation and
      definition models. Two things are exempt: forks, and skills running with <InlineCode
        text="`model: inherit`"
      />. FORCE alone leaves Explore on its built-in model, and the env var without FORCE doesn’t
      move Explore or Plan at all.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Why the built-ins aren’t ordinary</h3>
    <p class="text-slate-700 dark:text-slate-200">
      Explore, Plan, and general-purpose don’t follow the same ladder. Explore inherits the main
      model but is capped at Opus on a subscription, a Console account, or an LLM gateway. Plan runs
      on the main model. A user or project agent with the same name replaces the built-in, and from
      then on it’s an ordinary custom agent that keeps its own <InlineCode text="`model:`" />.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Not modelled</h3>
    <ul class="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
      <li>
        Your organization’s model allowlist. A blocked alias steps down to the newest allowed
        version from 2.1.222, and a warning appears from 2.1.223. This page ignores both.
      </li>
      <li>
        Same-family aliases. A family alias in the per-invocation parameter or in the frontmatter
        that names the main conversation’s own family resolves to the main model’s exact version,
        including any <InlineCode text="`[1m]`" /> suffix, rather than the alias’s default. An alias in
        the env var always resolves to the alias’s version. This page works at family granularity.
      </li>
      <li>Extended-thinking inheritance, which began in 2.1.198.</li>
      <li>Live changelog fetching. The rules are a snapshot.</li>
    </ul>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Where the sources disagree</h3>
    <p class="text-slate-700 dark:text-slate-200">
      The docs say <InlineCode text="`/tasks`" /> shows each subagent’s model from 2.1.242, but the changelog
      has no 2.1.242 entry. Its 2.1.243 entry says it. This page uses 2.1.243. For 2.1.211, the changelog
      says a resumed subagent reverted to “the parent’s model,” and the docs say it reverted to the definition’s
      <InlineCode text="`model`" /> field or the main model. This page follows the docs, which are more
      specific.
    </p>
  </div>

  <p class="text-slate-700 dark:text-slate-200">
    Rules last verified {rulesVerifiedOn}, against the Claude Code changelog and the subagents
    documentation. To see the model a subagent really ran on, run <InlineCode text="`/tasks`" /> in Claude
    Code (2.1.243 or later).
  </p>
</footer>
