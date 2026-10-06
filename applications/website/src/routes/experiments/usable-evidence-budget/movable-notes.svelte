<section aria-labelledby="movable-heading" class="max-w-3xl space-y-4">
  <h2 id="movable-heading" class="text-xl font-bold text-slate-900 dark:text-white">
    Which of these you can actually move
  </h2>
  <p class="text-slate-700 dark:text-slate-200">
    The segments look alike on a bar, but they are not equally movable. In rough order of how much
    they give back for how little effort:
  </p>
  <ul class="list-disc space-y-3 pl-5 text-slate-700 dark:text-slate-200">
    <li>
      <strong>Tools and MCP: turn tool search on.</strong>
      With tool search, Claude Code loads a tool’s schema when it needs one instead of loading every schema
      up front. In the MCP-heavy example that returns 172K tokens, 17% of the window, for a configuration
      change rather than a change in how you work. Loading fewer MCP servers helps too, but tool search
      is usually the largest single win available.
    </li>
    <li>
      <strong>History grows on its own.</strong>
      Compacting replaces it with a summary, and subagents keep large file reads and tool results out
      of it in the first place.
    </li>
    <li>
      <strong>Instructions move when you trim them.</strong>
      Instruction files, memory, and the skill listing are paid on every request, so a long one costs
      you twice: in room and in attention.
    </li>
    <li>
      <strong>Reserved output follows from what you ask for.</strong>
      A longer answer needs more room. It is not really a lever.
    </li>
    <li>
      <strong>The compaction margin is a choice.</strong>
      It is set by the autocompact threshold. Shrinking it buys room at the price of less slack before
      compaction fires.
    </li>
  </ul>
  <p class="text-sm text-slate-600 dark:text-slate-300">
    This is accounting, not a performance model. What’s left is not uniformly useful: research on
    position sensitivity and on degradation as input grows points the same way, even if neither sets
    a universal threshold. A large free segment is permission to add material, not a promise that
    adding it helps.
  </p>
</section>
