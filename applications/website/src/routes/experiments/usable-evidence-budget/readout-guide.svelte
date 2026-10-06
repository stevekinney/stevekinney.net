<script lang="ts">
  import { terms } from './budget';
  import type { TermKey } from './budget';

  type Guide = {
    key: TermKey | 'capacity';
    name: string;
    readout: string;
    move: string;
  };

  const guides: Guide[] = [
    {
      key: 'capacity',
      name: 'Context capacity',
      readout: 'The total in the header, such as the 1M in 120k/1M tokens.',
      move: 'Choose a model with a different window.',
    },
    {
      key: 'instructions',
      name: terms[0].name,
      readout:
        'System prompt, Memory files, Skills, and Custom agents. That covers the system prompt, environment info, user- and project-level instruction files, auto memory, and skill descriptions.',
      move: 'Trim instruction files and memory. Skills flagged to stay out of model invocation also stay out of the listing.',
    },
    {
      key: 'history',
      name: terms[1].name,
      readout: 'Messages: prompts, replies, file reads, and tool results.',
      move: 'This is the term that grows on its own. Compacting replaces it with a summary, and subagents keep large reads out of it.',
    },
    {
      key: 'tools',
      name: terms[2].name,
      readout:
        'System tools and MCP tools. A row marked deferred means tool search is active, and the page shows it without counting it.',
      move: 'This is the most reducible term. Turn tool search on, or load fewer MCP servers.',
    },
    {
      key: 'generation',
      name: terms[3].name,
      readout: 'Not a readout row. It is the room the reply needs.',
      move: 'It is set by what you ask for: a longer answer needs more room.',
    },
    {
      key: 'margin',
      name: terms[4].name,
      readout:
        'Not a row in every version. Where the readout has an Autocompact buffer row, the paste box uses it. Otherwise it is the slack before automatic compaction.',
      move: 'Set it through the autocompact threshold, with the two boxes under the margin control.',
    },
  ];
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
  tabindex="0"
  role="region"
  aria-label="Where each term appears in the context readout"
>
  <table class="w-full min-w-[44rem] border-collapse text-sm">
    <caption class="sr-only">
      What each term is called in the coding tool’s context readout, and how to move it.
    </caption>
    <thead>
      <tr
        class="border-b border-slate-300 text-left text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        <th scope="col" class="px-3 py-2 font-semibold">Term</th>
        <th scope="col" class="px-3 py-2 font-semibold">What /context calls it</th>
        <th scope="col" class="px-3 py-2 font-semibold">How to move it</th>
      </tr>
    </thead>
    <tbody>
      {#each guides as guide (guide.key)}
        <tr class="border-b border-slate-200 align-top dark:border-slate-800">
          <th scope="row" class="px-3 py-3 text-left font-semibold text-slate-900 dark:text-white">
            {guide.name}
          </th>
          <td class="px-3 py-3 text-slate-700 dark:text-slate-200">{guide.readout}</td>
          <td class="px-3 py-3 text-slate-700 dark:text-slate-200">{guide.move}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
