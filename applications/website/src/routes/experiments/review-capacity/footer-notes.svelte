<script lang="ts">
  const linkClasses =
    'text-primary-700 dark:text-primary-300 underline underline-offset-2 hover:no-underline';
</script>

<footer class="max-w-3xl space-y-6 border-t border-slate-200 pt-8 dark:border-slate-700">
  <h2 class="text-xl font-bold text-slate-900 dark:text-white">Assumptions and sources</h2>
  <ul class="space-y-3 text-slate-700 dark:text-slate-200">
    <li>
      <strong>Lines per sitting and minutes per sitting are sourced.</strong> A
      <a
        class={linkClasses}
        href="https://static1.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf"
        >case study of code review at Cisco</a
      > concluded that a review should cover under 200 lines, not to exceed 400, and take under 60 minutes,
      not to exceed 90. It also found detection was best below about 300 lines an hour, so the default
      of 400 lines in 60 minutes is at the top of what that study calls good.
    </li>
    <li>
      <strong>The follow-up share is sourced.</strong>
      <a
        class={linkClasses}
        href="https://devblogs.microsoft.com/dotnet/ten-months-with-cca-in-dotnet-runtime/"
        >A report on dotnet/runtime</a
      > found that 52.3% of merged pull requests from the Copilot coding agent got commits from someone
      other than the author, against 10.3% of merged human pull requests.
    </li>
    <li>
      <strong>Three to five agents is a recommendation, not a measurement.</strong>
      <a
        class={linkClasses}
        href="https://support.claude.com/en/articles/14554000-claude-code-power-user-tips"
        >Anthropic suggests three to five parallel sessions</a
      >. Git isn’t what limits that number. Your review is.
    </li>
    <li>
      <strong>These are assumptions, labeled as such:</strong> pull requests per agent, lines per pull
      request, fresh sittings per day, the fatigued factor, defects per 1,000 lines, the fresh detection
      rate, and the minutes of follow-up. Change them to match what you see.
    </li>
    <li>
      <strong>What this leaves out:</strong> more than one reviewer, how review quality changes through
      the day beyond fresh and tired, and anything live from your repository.
    </li>
  </ul>

  <h2 class="text-xl font-bold text-slate-900 dark:text-white">What to do about it</h2>
  <ul class="space-y-3 text-slate-700 dark:text-slate-200">
    <li>
      <strong>Make the history reviewable.</strong> The outline’s advice is that the unit of history should
      match the unit of change. A pull request that needs three sittings is three changes, and reviewing
      it in one is the tired review this page models.
    </li>
    <li>
      <strong>An agent’s approval is not a human’s.</strong> A reviewing agent can catch a lot, but counting
      its approval as yours only hides the queue. It doesn’t clear it.
    </li>
    <li>
      <strong>Run as many agents as you can review.</strong> Past that, the extra output either waits
      or gets a rubber stamp.
    </li>
  </ul>
</footer>
