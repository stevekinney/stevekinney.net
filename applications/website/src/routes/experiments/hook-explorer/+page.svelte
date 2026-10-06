<script lang="ts">
  import { CircleCheck, RotateCcw, ShieldCheck } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import TargetToggle from '$lib/experiments/editor-fields/target-toggle.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import type { CheckResult, PayloadKind } from './check';
  import { experiment } from './experiment';
  import { exitCodes, factsFor, groups, toolLabels } from './facts';
  import type { Tool } from './facts';
  import FieldTree from './field-tree.svelte';
  import SampleBlock from './sample-block.svelte';
  import type { EventShape } from './shapes';

  type Checker = typeof import('./check');

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/hook-explorer` },
  ]);

  const defaultEvent = 'PreToolUse';

  const notes: Record<string, string> = {
    tool_input: 'Its shape depends on the tool.',
    tool_response: 'Its shape depends on the tool.',
  };

  let tool = $state<Tool>('claude');
  let selected = $state(defaultEvent);
  let filter = $state('');
  let kind = $state<PayloadKind>('input');
  let interactive = $state(false);
  let checker = $state.raw<Checker | null>(null);
  let checkerFailed = $state(false);
  let checking = $state(false);
  let result = $state.raw<CheckResult | null>(null);

  const shapes = $derived(data.shapes[tool]);
  const otherTool = $derived<Tool>(tool === 'claude' ? 'codex' : 'claude');

  const eventIn = (which: Tool, name: string): EventShape | undefined =>
    data.shapes[which].events.find((event) => event.name === name);

  const sampleFor = (which: Tool, name: string, payload: PayloadKind): string => {
    const event = eventIn(which, name);
    if (!event) return '';

    return payload === 'input' ? event.sampleInput : event.sampleOutput;
  };

  let draft = $state(untrack(() => sampleFor('claude', defaultEvent, 'input')));

  const event = $derived(eventIn(tool, selected) ?? shapes.events[0]);
  const fact = $derived(event ? factsFor[tool][event.name] : undefined);
  const inOther = $derived(event ? eventIn(otherTool, event.name) !== undefined : false);
  const comparison = $derived(event ? data.shapes.comparisons[event.name] : undefined);

  const matches = (name: string): boolean => {
    const query = filter.trim().toLowerCase();
    if (query === '') return true;

    return (
      name.toLowerCase().includes(query) ||
      (factsFor[tool][name]?.fires.toLowerCase().includes(query) ?? false)
    );
  };

  const listedGroups = $derived(
    groups
      .map((group) => ({
        ...group,
        events: Object.entries(factsFor[tool])
          .filter(([name, entry]) => entry.group === group.id && matches(name))
          .map(([name]) => name),
      }))
      .filter((group) => group.events.length > 0),
  );

  const listedCount = $derived(
    listedGroups.reduce((total, group) => total + group.events.length, 0),
  );

  onMount(() => {
    interactive = true;
    import('./check')
      .then((module) => {
        checker = module;
      })
      .catch(() => {
        checkerFailed = true;
      });
  });

  const resetDraft = (): void => {
    draft = sampleFor(tool, selected, kind);
    result = null;
  };

  const selectEvent = (name: string): void => {
    selected = name;
    resetDraft();
  };

  const changeTool = (next: Tool): void => {
    tool = next;
    if (!eventIn(next, selected)) {
      selected = data.shapes[next].events.some((candidate) => candidate.name === defaultEvent)
        ? defaultEvent
        : (data.shapes[next].events[0]?.name ?? defaultEvent);
    }
    resetDraft();
  };

  const changeKind = (next: PayloadKind): void => {
    kind = next;
    resetDraft();
  };

  const check = async (): Promise<void> => {
    if (!event) return;
    checking = true;
    try {
      const module = checker ?? (await import('./check'));
      checker = module;
      result = module.checkPayload(tool, event.name, kind, draft);
    } catch {
      checkerFailed = true;
    } finally {
      checking = false;
    }
  };

  const payloadKinds: readonly PayloadKind[] = ['input', 'output'];
  const tools: readonly Tool[] = ['claude', 'codex'];

  const kindLabels: Record<PayloadKind, string> = {
    input: 'stdin (what it receives)',
    output: 'stdout (what it prints)',
  };

  const optionClasses = (chosen: boolean): string =>
    chosen
      ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-slate-950'
      : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

  const names = (list: string[]): string => list.map((name) => `\`${name}\``).join(', ');
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

{#snippet onlyIn(label: string, input: string[], output: string[])}
  <li class="[overflow-wrap:anywhere]">
    <span class="font-semibold text-slate-800 dark:text-slate-100">Only in {label}:</span>
    {#if input.length === 0 && output.length === 0}
      nothing.
    {:else}
      {#if input.length > 0}stdin <CodeText
          text={names(input)}
        />{/if}{#if input.length > 0 && output.length > 0};
      {/if}{#if output.length > 0}stdout <CodeText text={names(output)} />{/if}.
    {/if}
  </li>
{/snippet}

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hook Explorer</h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      A hook is a command Claude Code or Codex runs at a set point in a session. It gets a JSON
      payload on stdin and can answer with JSON on stdout. Pick an event to see both shapes, then
      break a payload and watch the check catch it.
    </p>
  </header>

  <TargetToggle
    value={tool}
    onChange={changeTool}
    name="hook-tool"
    legend="Hooks in"
    disabled={!interactive}
  />

  <div class="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
    <nav aria-labelledby="events-heading" class="min-w-0 space-y-4">
      <div class="space-y-2">
        <h2 id="events-heading" class="text-xl font-bold text-slate-900 dark:text-white">
          {shapes.events.length} events
        </h2>
        <label
          for="event-filter"
          class="block text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          Filter events
        </label>
        <input
          id="event-filter"
          type="search"
          bind:value={filter}
          disabled={!interactive}
          placeholder="Tool, Stop, compaction…"
          class="focus-visible:outline-primary-600 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus-visible:outline-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {#if listedCount === 0}
        <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
          No events match <code>{filter.trim()}</code>.
        </p>
      {/if}

      <div data-testid="event-list" class="space-y-4">
        {#each listedGroups as group (group.id)}
          <div class="space-y-1.5">
            <p
              id="group-{group.id}"
              class="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
            >
              {group.title}
            </p>
            <ul aria-labelledby="group-{group.id}" class="flex flex-wrap gap-1.5 lg:flex-col">
              {#each group.events as name (name)}
                <li class="min-w-0">
                  <button
                    type="button"
                    aria-current={name === event?.name ? 'true' : undefined}
                    disabled={!interactive}
                    onclick={() => selectEvent(name)}
                    class="focus-visible:outline-primary-600 w-full cursor-pointer rounded-md px-2 py-1 text-left font-mono text-sm [overflow-wrap:anywhere] focus-visible:outline-2 disabled:cursor-default {name ===
                    event?.name
                      ? 'bg-primary-600 dark:bg-primary-500 text-white dark:text-slate-950'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'}"
                  >
                    {name}
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </nav>

    {#if event && fact}
      <section aria-labelledby="event-heading" data-testid="event-detail" class="min-w-0 space-y-8">
        <div class="space-y-3">
          <h2
            id="event-heading"
            class="font-mono text-2xl font-bold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
          >
            {event.name}
          </h2>
          <dl class="space-y-2 text-slate-700 dark:text-slate-200">
            <div>
              <dt class="text-sm font-semibold text-slate-900 dark:text-white">When it fires</dt>
              <dd><CodeText text={`Fires ${fact.fires}`} /></dd>
            </div>
            <div>
              <dt class="text-sm font-semibold text-slate-900 dark:text-white">
                What its matcher matches
              </dt>
              <dd><CodeText text={fact.matcher ?? 'This event has no matcher.'} /></dd>
            </div>
            <div>
              <dt class="text-sm font-semibold text-slate-900 dark:text-white">
                Whether it can block
              </dt>
              <dd><CodeText text={fact.control} /></dd>
            </div>
          </dl>

          {#if inOther && comparison}
            <div class="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <p>
                {toolLabels[otherTool]} has a <code>{event.name}</code> event too.
                <button
                  type="button"
                  disabled={!interactive}
                  onclick={() => changeTool(otherTool)}
                  class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer font-semibold underline underline-offset-2 focus-visible:outline-2 disabled:cursor-default"
                >
                  See the {toolLabels[otherTool]} version
                </button>
              </p>
              <ul data-testid="comparison" class="space-y-1">
                {@render onlyIn(
                  'Claude Code',
                  comparison.onlyClaude.input,
                  comparison.onlyClaude.output,
                )}
                {@render onlyIn('Codex', comparison.onlyCodex.input, comparison.onlyCodex.output)}
              </ul>
            </div>
          {:else}
            <p class="text-sm text-slate-600 dark:text-slate-300">
              Only {toolLabels[tool]} has this event.
            </p>
          {/if}
        </div>

        <section aria-labelledby="stdin-heading" class="space-y-4">
          <h3 id="stdin-heading" class="text-xl font-bold text-slate-900 dark:text-white">
            What it receives on stdin
          </h3>
          <FieldTree fields={event.input} {notes} testId="input-fields" />
          {#if shapes.commonInput.length > 0}
            <details
              class="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
              data-testid="common-input"
            >
              <summary
                class="focus-visible:outline-primary-600 cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-2 dark:text-slate-100"
              >
                Fields every event gets ({shapes.commonInput.length})
              </summary>
              <div class="mt-3">
                <FieldTree fields={shapes.commonInput} {notes} />
              </div>
            </details>
          {/if}
          <SampleBlock
            label="Sample stdin"
            text={event.sampleInput}
            disabled={!interactive}
            testId="sample-input"
          />
          {#if event.input.some((field) => field.name === 'tool_input')}
            <p class="text-sm text-slate-600 dark:text-slate-300">
              <CodeText
                text={'Strings in angle brackets are placeholders, and `tool_input` is `{}` here. A real one depends on the tool.'}
              />
            </p>
          {:else}
            <p class="text-sm text-slate-600 dark:text-slate-300">
              Strings in angle brackets are placeholders.
            </p>
          {/if}
        </section>

        <section aria-labelledby="stdout-heading" class="space-y-4">
          <h3 id="stdout-heading" class="text-xl font-bold text-slate-900 dark:text-white">
            What it can print on stdout
          </h3>
          {#if shapes.commonOutput.length > 0}
            <details
              class="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
              data-testid="common-output"
            >
              <summary
                class="focus-visible:outline-primary-600 cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-2 dark:text-slate-100"
              >
                Fields every event can print ({shapes.commonOutput.length})
              </summary>
              <div class="mt-3">
                <FieldTree fields={shapes.commonOutput} />
              </div>
            </details>
          {/if}
          {#if event.outputAny}
            <p class="text-slate-700 dark:text-slate-200">
              The schema accepts any output for this event.
            </p>
          {:else if event.output.length > 0}
            <FieldTree fields={event.output} testId="output-fields" />
          {:else}
            <p class="text-slate-700 dark:text-slate-200">
              <CodeText text="This event has no `hookSpecificOutput`, only the fields above." />
            </p>
          {/if}
          {#if tool === 'claude' && event.output.length > 0}
            <p class="text-sm text-slate-600 dark:text-slate-300">
              <CodeText
                text={`\`hookSpecificOutput\` must include \`hookEventName\`, set to \`${event.name}\`.`}
              />
            </p>
          {/if}
          {#if event.outputStrict}
            <p class="text-sm text-slate-600 dark:text-slate-300">
              An unknown key anywhere in this output makes the hook run fail, so Codex fails closed.
            </p>
          {/if}
          <SampleBlock
            label="Sample stdout"
            text={event.sampleOutput}
            disabled={!interactive}
            testId="sample-output"
          />
        </section>

        <section aria-labelledby="check-heading" class="space-y-4">
          <div class="space-y-1">
            <h3 id="check-heading" class="text-xl font-bold text-slate-900 dark:text-white">
              Check a payload
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              It starts as the sample. Delete a required field, change a value, or add a key, then
              check it against <code>{event.name}</code> in {toolLabels[tool]}.
            </p>
          </div>

          <fieldset class="min-w-0 space-y-1.5">
            <legend class="text-sm font-semibold text-slate-800 dark:text-slate-100">Check</legend>
            <div
              class="inline-flex max-w-full flex-wrap overflow-hidden rounded-md border border-slate-300 dark:border-slate-600"
            >
              {#each payloadKinds as option (option)}
                <label
                  class="has-focus-visible:outline-primary-600 relative cursor-pointer px-3 py-1.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-disabled:cursor-not-allowed {optionClasses(
                    kind === option,
                  )}"
                >
                  <input
                    type="radio"
                    name="payload-kind"
                    value={option}
                    checked={kind === option}
                    disabled={!interactive}
                    onchange={() => changeKind(option)}
                    class="sr-only"
                  />
                  {kindLabels[option]}
                </label>
              {/each}
            </div>
          </fieldset>

          <div class="space-y-1.5">
            <label
              for="payload"
              class="block text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              Payload
            </label>
            <textarea
              id="payload"
              bind:value={draft}
              oninput={() => (result = null)}
              rows={12}
              spellcheck="false"
              disabled={!interactive}
              class="focus-visible:outline-primary-600 block w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 focus-visible:outline-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            ></textarea>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button
              icon={ShieldCheck}
              disabled={!interactive || checking}
              loading={checking}
              onclick={check}
            >
              Check it
            </Button>
            <Button
              variant="secondary"
              icon={RotateCcw}
              disabled={!interactive}
              onclick={resetDraft}
            >
              Reset to the sample
            </Button>
          </div>

          <div aria-live="polite" data-testid="check-result">
            {#if result?.ok}
              <p class="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
                <CircleCheck aria-hidden="true" class="mt-0.5 size-4 flex-none" />
                <span class="[overflow-wrap:anywhere]">
                  Valid {kind === 'input' ? 'stdin' : 'stdout'} for <code>{event.name}</code> in
                  {toolLabels[tool]}.
                </span>
              </p>
            {:else if result && result.syntaxError}
              <p class="[overflow-wrap:anywhere] text-red-700 dark:text-red-400">
                That isn’t valid JSON: {result.syntaxError}
              </p>
            {:else if result}
              <div class="space-y-2">
                <p class="font-semibold text-red-700 dark:text-red-400">
                  {result.issues.length === 1 ? '1 problem' : `${result.issues.length} problems`}
                </p>
                <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  {#each result.issues as issue, index (index)}
                    <li class="[overflow-wrap:anywhere]">
                      <code class="font-mono font-semibold" data-testid="issue-path"
                        >{issue.path || '(the whole payload)'}</code
                      >: {issue.message}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
          {#if checkerFailed}
            <p role="alert" class="text-sm text-red-700 dark:text-red-400">
              The checker couldn’t load. Reload the page to try again.
            </p>
          {/if}
        </section>
      </section>
    {/if}
  </div>

  <section aria-labelledby="exit-codes-heading" class="max-w-4xl space-y-4">
    <h2 id="exit-codes-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      Exit codes
    </h2>
    <div class="grid gap-6 md:grid-cols-2">
      {#each tools as which (which)}
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-900 dark:text-white">{toolLabels[which]}</h3>
          <ul class="list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {#each exitCodes[which] as line (line)}
              <li><CodeText text={line} /></li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>
</div>
