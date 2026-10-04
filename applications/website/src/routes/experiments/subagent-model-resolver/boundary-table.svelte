<script lang="ts">
  import InlineCode from './inline-code.svelte';
  import { versionBoundaries } from './version-boundaries';
  import { formatVersion } from './versions';
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
  tabindex="0"
  role="region"
  aria-label="Releases that change the answer"
>
  <table class="w-full min-w-[44rem] border-collapse text-sm">
    <caption class="sr-only">
      Each release where Claude Code changed how a subagent’s model is chosen, and whether the
      changelog, the documentation, or both confirm it.
    </caption>
    <thead>
      <tr
        class="border-b border-slate-300 text-left text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        <th scope="col" class="px-3 py-2 font-semibold">Version</th>
        <th scope="col" class="px-3 py-2 font-semibold">Change</th>
        <th scope="col" class="px-3 py-2 font-semibold">Source</th>
      </tr>
    </thead>
    <tbody>
      {#each versionBoundaries as boundary (boundary.version.patch)}
        <tr
          class="border-b border-slate-200 align-top dark:border-slate-800 {boundary.isReversal
            ? 'bg-amber-50 dark:bg-amber-950/30'
            : ''}"
        >
          <th
            scope="row"
            class="px-3 py-3 text-left font-mono font-semibold whitespace-nowrap text-slate-900 tabular-nums dark:text-white"
          >
            {formatVersion(boundary.version)}
          </th>
          <td class="px-3 py-3 text-slate-700 dark:text-slate-200">
            <InlineCode text={boundary.change} />
          </td>
          <td class="px-3 py-3 whitespace-nowrap">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold {boundary.source === 'docs only'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                : 'bg-primary-100 text-primary-900 dark:bg-primary-900/50 dark:text-primary-100'}"
            >
              {boundary.source}
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
