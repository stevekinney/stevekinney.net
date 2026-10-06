<script lang="ts">
  const cases = [
    {
      situation: 'You’re making just one edit.',
      instead: 'Make the edit in the session. There’s nothing to fan out.',
    },
    {
      situation: 'The shape is unknown, or the plan will change as you go.',
      instead: 'Work it out in the session, or with one subagent, until the shape settles.',
    },
    {
      situation: 'You need a person’s approval partway through.',
      instead: 'Split it: run the first half, review it yourself, then start the second.',
    },
    {
      situation: 'Agents would share files they all change.',
      instead: 'Give each agent its own worktree, or keep the edits in one agent.',
    },
    {
      situation: 'Checking the fan-out’s results costs more than the fan-out saves.',
      instead: 'Do the work serially, where each step is easy to verify.',
    },
  ];
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
  role="region"
  aria-label="When not to use a workflow"
  tabindex="0"
>
  <table class="w-full text-sm text-slate-700 dark:text-slate-200">
    <thead>
      <tr class="border-b border-slate-200 dark:border-slate-700">
        <th scope="col" class="px-3 py-2 text-left">Skip a workflow when…</th>
        <th scope="col" class="px-3 py-2 text-left">Use instead</th>
      </tr>
    </thead>
    <tbody>
      {#each cases as entry (entry.situation)}
        <tr class="border-b border-slate-100 align-top dark:border-slate-800">
          <th scope="row" class="px-3 py-2 text-left font-semibold">{entry.situation}</th>
          <td class="px-3 py-2">{entry.instead}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
