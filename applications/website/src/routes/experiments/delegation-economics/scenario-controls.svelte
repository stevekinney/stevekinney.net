<script lang="ts">
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

  import { formatMultiplier } from './display';
  import type { Mode } from './economics';
  import {
    formatFractionField,
    formatNumberField,
    parseFractionField,
    parseNumberField,
    parseTokenField,
    parseWholeField,
  } from './field-parsing';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { modelLabel } from './pricing';
  import type { WorkerModel } from './pricing';
  import { modes, ranges } from './scenario';
  import type { NumericField, Scenario } from './scenario';
  import SliderField from './slider-field.svelte';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    scenario: Scenario;
    models: WorkerModel[];
    /** Whether the spawn overhead is still the value measured from uploaded sessions. */
    spawnFromSessions: boolean;
    onChange: (patch: Partial<Scenario>) => void;
  };

  const { scenario, models, spawnFromSessions, onChange }: Props = $props();

  type FieldSpec = {
    field: NumericField;
    id: string;
    label: string;
    kind: 'tokens' | 'minutes' | 'fraction' | 'whole' | 'multiplier';
    example: string;
    hint?: string;
  };

  const timeFields: FieldSpec[] = [
    {
      field: 'soloMinutes',
      id: 'solo-minutes',
      label: 'Solo duration (minutes)',
      kind: 'minutes',
      example: '60',
      hint: 'How long the task takes in one session. An assumption: use your own.',
    },
    {
      field: 'serialFraction',
      id: 'serial-fraction',
      label: 'Serial fraction',
      kind: 'fraction',
      example: '40% or 0.4',
      hint: 'The share that can’t run in parallel. 40% is the course outline’s example.',
    },
    {
      field: 'workers',
      id: 'workers',
      label: 'Workers',
      kind: 'whole',
      example: '4',
      hint: 'From 1, the solo session, to 32.',
    },
    {
      field: 'integrationMinutes',
      id: 'integration-minutes',
      label: 'Integration per worker (minutes)',
      kind: 'minutes',
      example: '3',
      hint: 'Reading and reconciling one worker’s report. An assumption.',
    },
  ];

  const tokenFields: FieldSpec[] = [
    {
      field: 'spawnTokens',
      id: 'spawn-tokens',
      label: 'Spawn overhead per worker',
      kind: 'tokens',
      example: '20k',
      hint: 'Tokens before a subagent does anything. Course outline: “somewhere around 7.5k–44k.”',
    },
    {
      field: 'sharedTokens',
      id: 'shared-tokens',
      label: 'Shared context every worker reads',
      kind: 'tokens',
      example: '50k',
      hint: 'Files every worker has to read for itself. An assumption.',
    },
    {
      field: 'uniqueTokens',
      id: 'unique-tokens',
      label: 'Unique work input',
      kind: 'tokens',
      example: '300k',
      hint: 'Split evenly across workers. An assumption.',
    },
    {
      field: 'outputTokens',
      id: 'output-tokens',
      label: 'Output per worker',
      kind: 'tokens',
      example: '5k',
    },
    {
      field: 'reportTokens',
      id: 'report-tokens',
      label: 'Report each worker returns',
      kind: 'tokens',
      example: '2k',
      hint: 'The coordinator reads every one.',
    },
  ];

  const teamFields: FieldSpec[] = [
    {
      field: 'teamMultiplier',
      id: 'team-multiplier',
      label: 'Agent team multiplier',
      kind: 'multiplier',
      example: '3.5',
      hint: 'Course outline: a three-teammate team runs about 3–4× the tokens of one session.',
    },
    {
      field: 'planMultiplier',
      id: 'plan-multiplier',
      label: 'Plan-mode multiplier',
      kind: 'multiplier',
      example: '7',
      hint: 'Course outline: teammates in plan mode run about 7×.',
    },
  ];

  const formatFor = (kind: FieldSpec['kind']) => {
    if (kind === 'tokens') return formatTokens;
    if (kind === 'fraction') return formatFractionField;
    if (kind === 'multiplier') return (value: number) => formatMultiplier(value);

    return formatNumberField;
  };

  const parseFor = (spec: FieldSpec) => {
    const range = ranges[spec.field];
    if (spec.kind === 'tokens') return (text: string) => parseTokenField(text, range);
    if (spec.kind === 'fraction') return (text: string) => parseFractionField(text, range);
    if (spec.kind === 'whole') return (text: string) => parseWholeField(text, range);

    return (text: string) => parseNumberField(text, range);
  };
</script>

{#snippet fields(specs: FieldSpec[])}
  <div class="grid gap-x-6 gap-y-5 md:grid-cols-2">
    {#each specs as spec (spec.id)}
      <SliderField
        id={spec.id}
        label={spec.label}
        value={scenario[spec.field]}
        range={ranges[spec.field]}
        format={formatFor(spec.kind)}
        parse={parseFor(spec)}
        onChange={(value) => onChange({ [spec.field]: value })}
        hint={spec.hint}
        example={spec.example}
        fromSession={spec.field === 'spawnTokens' && spawnFromSessions}
      />
    {/each}
  </div>
{/snippet}

<div class="space-y-6">
  <ToggleGroup
    id="mode"
    label="Mode"
    value={scenario.mode}
    options={modes}
    onChange={(value) => onChange({ mode: value as Mode })}
    hint="Subagents are modelled token by token. Teams use the course outline’s multipliers."
  />

  <fieldset class="min-w-0 space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Time</legend>
    {@render fields(timeFields)}
  </fieldset>

  <fieldset class="min-w-0 space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Tokens</legend>
    <p class={hintClasses}>Token counts take shorthand such as 50k or 1.5M.</p>
    {@render fields(tokenFields)}
  </fieldset>

  <fieldset class="min-w-0 space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Price</legend>
    <div class="grid gap-x-6 gap-y-5 md:grid-cols-2">
      <div class="min-w-0 space-y-1.5">
        <label for="model" class={labelClasses}>Worker model</label>
        <select
          id="model"
          value={scenario.modelId}
          onchange={(event) => onChange({ modelId: event.currentTarget.value })}
          aria-describedby="model-hint"
          class="{fieldClasses} w-full"
        >
          {#each models as model (model.id)}
            <option value={model.id}>{modelLabel(model)}</option>
          {/each}
        </select>
        <p id="model-hint" class={hintClasses}>
          Dollars per million tokens: input, cached input, output. From the site’s shared price
          table, editable below.
        </p>
      </div>
      <div class="min-w-0 space-y-1.5">
        <span class={labelClasses}>Cache</span>
        <label class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={scenario.sharedPrefix}
            disabled={scenario.mode !== 'subagents'}
            onchange={(event) => onChange({ sharedPrefix: event.currentTarget.checked })}
            aria-describedby="shared-prefix-hint"
            class="accent-primary-600 mt-0.5 size-4 flex-none"
          />
          <span>Workers share a cached prefix</span>
        </label>
        <p id="shared-prefix-hint" class={hintClasses}>
          {#if scenario.mode === 'subagents'}
            Workers in a fan-out can read the prefix the first one cached, so the other workers pay
            the cached-input price for their spawn overhead.
          {:else}
            Not used for teams: the multiplier already covers everything a team reads.
          {/if}
        </p>
      </div>
    </div>
  </fieldset>

  {#if scenario.mode !== 'subagents'}
    <fieldset class="min-w-0 space-y-4">
      <legend class="text-lg font-bold text-slate-900 dark:text-white">Team multipliers</legend>
      {@render fields(teamFields)}
    </fieldset>
  {/if}
</div>
