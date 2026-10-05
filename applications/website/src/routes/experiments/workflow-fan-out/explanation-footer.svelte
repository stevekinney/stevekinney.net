<script lang="ts">
  import { bodyClasses, codeClasses } from './field-styles';

  const heading = 'scroll-mt-24 text-lg font-bold text-slate-900 dark:text-white';
</script>

<div class="max-w-3xl space-y-6 {bodyClasses} text-base">
  <section id="concept-barriers" class="space-y-2">
    <h3 class={heading}>pipeline() and parallel()</h3>
    <p>
      <code class={codeClasses}>pipeline(items, ...stages)</code> sends each item through every
      stage on its own, with no barrier between stages, so a run takes about as long as the slowest
      single item’s path. Running <code class={codeClasses}>parallel()</code> once per stage makes every
      item wait for the slowest item of the stage before. Use it only when a stage needs every result
      from the one before. Up to 16 agents run at once by default, adjustable from 1 to 256, per the workflows
      documentation; past that, work queues.
    </p>
  </section>

  <section id="concept-nulls" class="space-y-2">
    <h3 class={heading}>Nulls and .filter(Boolean)</h3>
    <p>
      An agent that’s stopped or hits an unrecoverable API error resolves to
      <code class={codeClasses}>null</code>, and <code class={codeClasses}>pipeline()</code> keeps
      the null in its results, per the workflows documentation. In the runtime’s own code, a null
      also ends that item’s pipeline, so its later stages never run. A trailing
      <code class={codeClasses}>.filter(Boolean)</code>
      drops the nulls, and the run still reports success.
    </p>
    <p>
      A <code class={codeClasses}>schema</code> call that still fails validation after five attempts
      (configurable) throws an error; it doesn’t become <code class={codeClasses}>null</code>.
      Inside
      <code class={codeClasses}>pipeline()</code> or <code class={codeClasses}>parallel()</code>,
      the runtime catches that error, logs it, and leaves <code class={codeClasses}>null</code> in the
      slot. Anywhere else it’s uncaught, and the run fails.
    </p>
    <p>
      The course outline says a call that fails validation five times quietly becomes
      <code class={codeClasses}>null</code>. The workflows documentation says it fails with an
      error, and this page follows the documentation.
    </p>
  </section>

  <section id="concept-models" class="space-y-2">
    <h3 class={heading}>How a model is chosen</h3>
    <p>
      Each agent’s model is the <code class={codeClasses}>model</code> on its
      <code class={codeClasses}>agent()</code> call, then its agent definition’s
      <code class={codeClasses}>model:</code>, then
      <code class={codeClasses}>CLAUDE_CODE_SUBAGENT_MODEL</code>, then your session’s model, the
      same order as for subagents, per the workflows documentation. Leave the first and third unset
      in an Opus session, and every agent runs on Opus.
    </p>
  </section>

  <section id="concept-limits" class="space-y-2">
    <h3 class={heading}>Limits and warnings</h3>
    <p>
      Per the workflows documentation, a <code class={codeClasses}>pipeline()</code> or
      <code class={codeClasses}>parallel()</code> call takes at most 4,096 items, a run has at most 1,000
      agents, and a “Large workflow” warning shows above 25 agents or 1.5M projected tokens. The runtime
      checks both warnings with a strict “more than”, so exactly 25 agents doesn’t warn.
    </p>
    <p>
      Workflow agents get a five-minute cache by default. Fan-out agents that share a prefix with
      the first agent start up to five seconds after it and read its cached prefix. This page’s cost
      estimate leaves caching out on purpose.
    </p>
  </section>

  <section id="concept-script-rules" class="space-y-2">
    <h3 class={heading}>What a script can’t do</h3>
    <p>
      A workflow script is JavaScript, not TypeScript, so type annotations don’t parse.
      <code class={codeClasses}>Date.now()</code>, <code class={codeClasses}>Math.random()</code>,
      <code class={codeClasses}>new Date()</code> with no arguments, and
      <code class={codeClasses}>import()</code>
      throw, because they would break resume.
    </p>
  </section>

  <section id="concept-meta" class="space-y-2">
    <h3 class={heading}>meta and phases</h3>
    <p>
      <code class={codeClasses}>meta</code> is a plain literal: no variables, calls, spreads, or
      template interpolation, and it needs a <code class={codeClasses}>name</code> and a
      <code class={codeClasses}>description</code>. Every <code class={codeClasses}>phase()</code>
      title should match a <code class={codeClasses}>meta.phases</code> entry exactly, or it gets its
      own progress group.
    </p>
  </section>

  <p class="text-sm">
    Sources: the Claude Code workflows documentation, checked on October 4, 2026, and the runtime’s
    own code for what happens to nulls and thrown errors. The durations, failures, and prices here
    are a simulation, not a measurement of a real run.
  </p>
</div>
