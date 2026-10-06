<script lang="ts">
  const linkClasses =
    'text-primary-700 dark:text-primary-300 underline underline-offset-2 hover:no-underline';
</script>

<footer class="max-w-3xl space-y-6 border-t border-slate-200 pt-8 dark:border-slate-700">
  <h2 class="text-xl font-bold text-slate-900 dark:text-white">What to do about it</h2>
  <ul class="space-y-3 text-slate-700 dark:text-slate-200">
    <li>
      <strong>Run as many agents as you can review.</strong> Past that, the extra output either waits
      or gets a rubber stamp.
    </li>
    <li>
      <strong>Make the history reviewable.</strong> The unit of history should match the unit of change.
      A pull request that needs three sittings is three changes, and reviewing it in one is a tired review.
    </li>
    <li>
      <strong>An agent’s approval is not a human’s.</strong> A reviewing agent can catch a lot, but counting
      its approval as yours only hides the queue. It doesn’t clear it.
    </li>
  </ul>

  <h2 class="text-xl font-bold text-slate-900 dark:text-white">How this is calculated</h2>
  <div class="space-y-3 text-slate-700 dark:text-slate-200">
    <p>
      What you can review well is good sittings a day × lines per sitting. What the agents open is
      agents × pull requests per agent × lines per pull request. The number of agents you can keep
      reviewed is the first divided by what one agent opens, rounded down.
    </p>
    <p>
      <strong>Lines per sitting is sourced.</strong> A
      <a
        class={linkClasses}
        href="https://static1.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf"
        >case study of code review at Cisco</a
      > concluded that a review should cover under 200 lines, not to exceed 400, and take under 60 minutes,
      not to exceed 90. The default of 400 lines a sitting is the top of what that study calls good.
    </p>
    <p>
      <strong>Three to five agents is a recommendation, not a measurement.</strong>
      <a
        class={linkClasses}
        href="https://support.claude.com/en/articles/14554000-claude-code-power-user-tips"
        >Anthropic suggests three to five parallel sessions</a
      >. Git isn’t what limits that number. Your review is.
    </p>
    <p>
      <strong>Review doesn’t end at merge.</strong>
      <a
        class={linkClasses}
        href="https://devblogs.microsoft.com/dotnet/ten-months-with-cca-in-dotnet-runtime/"
        >A report on dotnet/runtime</a
      > found that 52.3% of merged pull requests from the Copilot coding agent got commits from someone
      other than the author, against 10.3% of merged human pull requests. This page leaves that follow-up
      out, so the real number of agents you can keep up with is lower.
    </p>
    <p>
      Pull requests per agent, lines per pull request, and good sittings a day are assumptions.
      Change them to match what you see. The page also leaves out more than one reviewer and
      anything live from your repository.
    </p>
  </div>
</footer>
