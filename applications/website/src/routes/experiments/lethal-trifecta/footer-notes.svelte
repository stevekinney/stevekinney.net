<script lang="ts">
  const linkClasses = 'underline underline-offset-2 hover:text-slate-900 dark:hover:text-white';
  const bodyClasses = 'text-slate-700 dark:text-slate-200';
</script>

<footer
  class="max-w-3xl space-y-5 border-t border-slate-200 pt-8 dark:border-slate-700"
  aria-labelledby="notes-heading"
>
  <h2 id="notes-heading" class="text-xl font-bold text-slate-900 dark:text-white">
    Notes and sources
  </h2>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">The trifecta</h3>
    <p class={bodyClasses}>
      The lethal trifecta is
      <a href="https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/" class={linkClasses}
        >Simon Willison’s</a
      >: an agent is exploitable when it reads untrusted content, reaches private data, and has a
      way to send data out, all at once. Every control that works here is a property of the OS, the
      network, or the architecture. Every one that fails is a property of the model’s judgment.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Auto mode</h3>
    <p class={bodyClasses}>
      Anthropic called auto mode “a convenience feature backed by a best-effort classifier, not a
      security guarantee,” in response to
      <a
        href="https://embracethered.com/blog/posts/2026/breaking-claude-code-opus-5-and-automode/"
        class={linkClasses}>Johann Rehberger’s published attack chain</a
      >, which succeeded 60–80% of the time. It cuts down on prompt fatigue. It doesn’t stop a
      determined payload.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">Secrets</h3>
    <p class={bodyClasses}>
      The only safe credential is one the agent can’t read. If something leaks, rotate first and
      investigate second.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">From the documentation</h3>
    <p class={bodyClasses}>
      These come from the Claude Code
      <a href="https://code.claude.com/docs/en/sandboxing" class={linkClasses}
        >sandboxing documentation</a
      >, checked on 2026-10-04:
    </p>
    <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
      <li>The sandbox constrains Bash commands and the processes they start.</li>
      <li>
        Read, Edit, Write, and WebFetch follow permission rules instead. allowedDomains doesn’t
        limit WebFetch, and denyRead doesn’t stop the Read tool.
      </li>
      <li>Commands in excludedCommands run outside the sandbox.</li>
      <li>
        An allow rule like Bash(curl *) also approves an unsandboxed retry, unless
        allowUnsandboxedCommands is false.
      </li>
      <li>
        strictAllowlist only counts in user, managed, or --settings settings. A repository’s files
        can’t set it.
      </li>
    </ul>
  </div>

  <div class="space-y-2">
    <h3 class="font-semibold text-slate-900 dark:text-white">What this doesn’t model</h3>
    <ul class="list-disc space-y-1 pl-5 {bodyClasses}">
      <li>
        Every path has the same length, so the highlighted one is the first in the order the columns
        list them, which puts the most common vectors first.
      </li>
      <li>
        It doesn’t scan repositories or test payloads against a live agent. Exercise 6 does that,
        safely.
      </li>
      <li>
        A settings file can’t say whether you run in a container, split reading from doing, plan
        first, or set core.fsmonitor, so those stay your toggles.
      </li>
    </ul>
  </div>
</footer>
