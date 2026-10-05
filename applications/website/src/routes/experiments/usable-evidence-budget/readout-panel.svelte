<script lang="ts">
  import Button from '$lib/components/button';

  import { findTerm, formatTokens, terms } from './budget';
  import type { TermKey } from './budget';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { getReady } from './ready-context';
  import { defaultMapping } from './readout-parser';
  import type { AppliedReadout, Destination, LabelMapping, ParsedReadout } from './readout-parser';

  type Props = {
    text: string;
    parsed: ParsedReadout;
    applied: AppliedReadout | null;
    currentCapacity: number;
    mapping: LabelMapping;
    overrides: LabelMapping;
    /** Whether any value is still marked "from your readout". */
    filled: boolean;
    onText: (text: string) => void;
    onAssign: (label: string, destination: Destination) => void;
    onResetMapping: () => void;
    onDiscard: () => void;
  };

  const {
    text,
    parsed,
    applied,
    currentCapacity,
    mapping,
    overrides,
    filled,
    onText,
    onAssign,
    onResetMapping,
    onDiscard,
  }: Props = $props();

  const isReady = getReady();

  const reportedTerms: TermKey[] = ['instructions', 'history', 'tools', 'margin'];

  const missing = $derived(
    applied ? reportedTerms.filter((key) => applied.values[key] === undefined) : [],
  );

  const filledTerms = $derived(
    applied ? terms.filter((term) => applied.values[term.key] !== undefined) : [],
  );

  const filledSummary = $derived(
    filledTerms
      .map((term) => `${term.name.toLowerCase()} ${formatTokens(applied?.values[term.key] ?? 0)}`)
      .join(', '),
  );

  const deferredSummary = $derived(
    (applied?.deferred ?? [])
      .map((row) => `${row.label} (deferred) ${formatTokens(row.tokens)}`)
      .join(', '),
  );

  const mappingRows = $derived(
    Object.entries(mapping)
      .filter(([, destination]) => destination !== 'free')
      .sort(([first], [second]) => first.localeCompare(second)),
  );

  const isCustomRow = (label: string): boolean =>
    Object.hasOwn(overrides, label) && !Object.hasOwn(defaultMapping, label);
</script>

<div class="space-y-4">
  <div class="space-y-1.5">
    <label for="readout-text" class={labelClasses}>Paste your /context output</label>
    <textarea
      id="readout-text"
      rows="8"
      value={text}
      disabled={!isReady()}
      aria-describedby="readout-privacy"
      oninput={(event) => onText(event.currentTarget.value)}
      spellcheck="false"
      placeholder="Run /context in Claude Code, copy what it prints, and paste it here."
      class="{fieldClasses} font-mono text-sm"></textarea>
    <p id="readout-privacy" class={hintClasses}>
      What you paste is read in your browser and never sent anywhere. Nothing you paste goes in a
      shared link.
    </p>
  </div>

  {#if text.trim() !== ''}
    <div
      class="space-y-3 text-sm text-slate-700 dark:text-slate-200"
      aria-live="polite"
      data-testid="readout-result"
    >
      {#if parsed.form === 'none' || !applied}
        <p>
          No category rows found. Paste what <code>/context</code> prints, either the interactive
          view’s <code>label: 3.2k tokens (1.6%)</code> lines or print mode’s table.
        </p>
      {:else}
        <p data-testid="readout-capacity">
          {#if applied.capacityFromHeader}
            Capacity is {formatTokens(applied.capacity)}, from the header line.
          {:else}
            There is no header line, so capacity stays at {formatTokens(currentCapacity)}.
          {/if}
        </p>
        {#if filledTerms.length > 0}
          <p data-testid="readout-filled">Filled from your readout: {filledSummary}.</p>
        {/if}
        <p>
          Reserved generation is left as it was, because the readout doesn’t report it.
          {#if missing.length > 0}
            No rows mapped to {missing.map((key) => findTerm(key).name.toLowerCase()).join(', ')},
            so
            {missing.length === 1 ? 'it is' : 'those are'} unchanged.
          {/if}
        </p>

        {#if applied.reconciliation}
          {#if applied.reconciliation.mismatch}
            <p
              role="status"
              class="rounded-md border border-amber-400 bg-amber-50 p-3 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100"
              data-testid="readout-mismatch"
            >
              These rows don’t add up. The capacity of {formatTokens(applied.capacity)} minus the rows
              counted leaves {formatTokens(applied.reconciliation.expectedFree)}, but the readout
              reports {formatTokens(applied.reconciliation.reportedFree)} free. Nothing was adjusted to
              hide the gap. A row you haven’t assigned yet may explain it.
            </p>
          {:else}
            <p data-testid="readout-reconciled">
              Reconciles: the rows leave {formatTokens(applied.reconciliation.expectedFree)}, and
              the readout reports {formatTokens(applied.reconciliation.reportedFree)} free.
            </p>
          {/if}
        {/if}

        {#if applied.deferred.length > 0}
          <p data-testid="readout-deferred">
            Deferred rows are shown but not counted, because they aren’t in the window: {deferredSummary}.
          </p>
        {/if}

        {#if applied.unrecognized.length > 0}
          <div class="space-y-2" data-testid="readout-unrecognized">
            <p class="font-semibold">
              These rows aren’t mapped to a term yet. Assign each one, or ignore it.
            </p>
            <ul class="space-y-2">
              {#each applied.unrecognized as row (row.key)}
                <li class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="min-w-40 flex-1">
                    {row.label}
                    <span class="tabular-nums">({formatTokens(row.tokens)})</span>
                  </span>
                  <select
                    aria-label="Assign {row.label} to a term"
                    value=""
                    disabled={!isReady()}
                    onchange={(event) => {
                      if (event.currentTarget.value) {
                        onAssign(row.key, event.currentTarget.value as Destination);
                      }
                    }}
                    class="{fieldClasses} w-auto"
                  >
                    <option value="">Choose a term…</option>
                    {#each terms as term (term.key)}
                      <option value={term.key}>{term.name}</option>
                    {/each}
                    <option value="ignore">Ignore this row</option>
                  </select>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-3">
    {#if filled}
      <Button variant="secondary" disabled={!isReady()} onclick={onDiscard}>
        Discard readout values
      </Button>
    {/if}
  </div>

  <details class="max-w-3xl">
    <summary
      class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
    >
      Edit how labels map to terms
    </summary>
    <div class="mt-3 space-y-3">
      <p class={hintClasses}>
        Each row’s label goes to one term. Your changes are remembered in this browser. The free
        space row is only used to check the others.
      </p>
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">How each readout label maps to a term</caption>
        <thead>
          <tr class="border-b border-slate-300 text-left dark:border-slate-600">
            <th scope="col" class="py-2 pr-3 font-semibold">Label</th>
            <th scope="col" class="py-2 font-semibold">Goes to</th>
          </tr>
        </thead>
        <tbody>
          {#each mappingRows as [label, destination] (label)}
            <tr class="border-b border-slate-200 dark:border-slate-800">
              <th scope="row" class="py-2 pr-3 text-left font-normal">
                {label}
                {#if isCustomRow(label)}<span class={hintClasses}>(yours)</span>{/if}
              </th>
              <td class="py-2">
                <select
                  aria-label="Where {label} goes"
                  value={destination}
                  disabled={!isReady()}
                  onchange={(event) => onAssign(label, event.currentTarget.value as Destination)}
                  class="{fieldClasses} w-auto"
                >
                  {#each terms as term (term.key)}
                    <option value={term.key}>{term.name}</option>
                  {/each}
                  <option value="ignore">Ignore this row</option>
                </select>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if Object.keys(overrides).length > 0}
        <Button variant="secondary" disabled={!isReady()} onclick={onResetMapping}>
          Reset to the defaults
        </Button>
      {/if}
    </div>
  </details>
</div>
