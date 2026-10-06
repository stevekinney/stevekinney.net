<script lang="ts">
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

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
  import { ranges } from './scenario';
  import type { NumericField, Scenario } from './scenario';
  import SliderField from './slider-field.svelte';

  type Props = {
    scenario: Scenario;
    models: WorkerModel[];
    onChange: (patch: Partial<Scenario>) => void;
  };

  const { scenario, models, onChange }: Props = $props();

  type FieldSpec = {
    field: NumericField;
    id: string;
    label: string;
    kind: 'tokens' | 'minutes' | 'fraction' | 'whole';
    example: string;
    hint?: string;
  };

  const mainFields: FieldSpec[] = [
    {
      field: 'soloMinutes',
      id: 'solo-minutes',
      label: 'Task minutes in one session',
      kind: 'minutes',
      example: '60',
    },
    {
      field: 'serialFraction',
      id: 'serial-fraction',
      label: 'Serial share',
      kind: 'fraction',
      example: '40% or 0.4',
      hint: 'The part that can’t run in parallel.',
    },
    { field: 'workers', id: 'workers', label: 'Workers', kind: 'whole', example: '4' },
    {
      field: 'integrationMinutes',
      id: 'integration-minutes',
      label: 'Integration minutes per worker',
      kind: 'minutes',
      example: '3',
      hint: 'Reading and reconciling one worker’s report.',
    },
    {
      field: 'sharedTokens',
      id: 'shared-tokens',
      label: 'Shared context every worker reads',
      kind: 'tokens',
      example: '50k',
      hint: 'Shorthand such as 50k or 1.5M works.',
    },
  ];

  const assumptionFields: FieldSpec[] = [
    {
      field: 'spawnTokens',
      id: 'spawn-tokens',
      label: 'Spawn overhead per worker',
      kind: 'tokens',
      example: '20k',
      hint: 'System prompt and tools, before a worker does anything.',
    },
    {
      field: 'uniqueTokens',
      id: 'unique-tokens',
      label: 'Unique work input',
      kind: 'tokens',
      example: '300k',
      hint: 'Split evenly across workers.',
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

  const formatFor = (kind: FieldSpec['kind']): ((value: number) => string) => {
    if (kind === 'tokens') return formatTokens;
    if (kind === 'fraction') return formatFractionField;

    return formatNumberField;
  };

  const parseFor = (spec: FieldSpec): ((text: string) => number | null) => {
    const range = ranges[spec.field];
    if (spec.kind === 'tokens') return (text) => parseTokenField(text, range);
    if (spec.kind === 'fraction') return (text) => parseFractionField(text, range);
    if (spec.kind === 'whole') return (text) => parseWholeField(text, range);

    return (text) => parseNumberField(text, range);
  };
</script>

{#snippet fields(specs: FieldSpec[])}
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
    />
  {/each}
{/snippet}

<div class="space-y-6">
  <div class="grid gap-x-6 gap-y-5 md:grid-cols-2">
    {@render fields(mainFields)}
  </div>

  <details class="space-y-4">
    <summary
      class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
    >
      Assumptions
    </summary>
    <div class="mt-4 grid gap-x-6 gap-y-5 md:grid-cols-2">
      {@render fields(assumptionFields)}
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
          Dollars per million tokens, from the site’s shared price table. Caching is ignored.
        </p>
      </div>
    </div>
  </details>
</div>
