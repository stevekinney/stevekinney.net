<script lang="ts">
  import { headingClasses, hintClasses, panelClasses } from './field-styles';
  import NumberField from './number-field.svelte';
  import { customNotice, presetMatching, presets } from './presets';
  import type { NumericField, OverflowPolicy, Scenario } from './scenario';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    scenario: Scenario;
    ready: boolean;
    onChange: (patch: Partial<Scenario>) => void;
    onPreset: (scenario: Scenario) => void;
  };

  const { scenario, ready, onChange, onPreset }: Props = $props();

  const matching = $derived(presetMatching(scenario));

  type FieldSpec = { field: NumericField; label: string; source: string; unit?: string };

  const groups: { title: string; fields: FieldSpec[] }[] = [
    {
      title: 'What the agents open',
      fields: [
        {
          field: 'agents',
          label: 'Parallel agents',
          source: 'The outline cites three to five recommended parallel sessions.',
        },
        {
          field: 'prsPerAgent',
          label: 'Pull requests per agent per day',
          source: 'Assumption. A measured rate can be fractional.',
        },
        {
          field: 'linesPerPr',
          label: 'Lines changed per pull request',
          source: 'Assumption. Additions plus deletions.',
          unit: 'lines',
        },
      ],
    },
    {
      title: 'What you can review well',
      fields: [
        {
          field: 'linesPerSitting',
          label: 'Lines per effective sitting',
          source: 'Outline, from the Cisco case study: 200–400.',
          unit: 'lines',
        },
        {
          field: 'minutesPerSitting',
          label: 'Minutes per sitting',
          source: 'Outline, from the Cisco case study: 60–90.',
          unit: 'min',
        },
        { field: 'sittings', label: 'Fresh sittings per day', source: 'Assumption.' },
      ],
    },
    {
      title: 'Quality and follow-up',
      fields: [
        {
          field: 'fatiguedFactor',
          label: 'Fatigued detection, relative to fresh',
          source: 'Assumption: 0.5 means a tired review catches half as much.',
        },
        {
          field: 'defectDensity',
          label: 'Defects per 1,000 changed lines',
          source: 'Assumption.',
        },
        {
          field: 'freshDetection',
          label: 'Fresh detection rate',
          source: 'Assumption: the share of defects a fresh review catches.',
          unit: '%',
        },
        {
          field: 'followUpShare',
          label: 'Pull requests needing human follow-up',
          source:
            'Outline: 52.3% of merged agent pull requests in dotnet/runtime got commits from someone else, against 10.3% of human ones.',
          unit: '%',
        },
        {
          field: 'followUpMinutes',
          label: 'Minutes of follow-up per touched pull request',
          source: 'Assumption.',
          unit: 'min',
        },
        { field: 'days', label: 'Working days simulated', source: 'Two working weeks.' },
      ],
    },
  ];

  const policies: { value: OverflowPolicy; label: string }[] = [
    { value: 'queue', label: 'Queue it' },
    { value: 'tired', label: 'Review it tired' },
  ];
</script>

<section aria-labelledby="inputs-heading" class={panelClasses}>
  <h2 id="inputs-heading" class={headingClasses}>Your scenario</h2>

  <div class="space-y-2">
    <p id="presets-label" class="text-sm font-semibold text-slate-700 dark:text-slate-200">
      Start from a preset
    </p>
    <div role="group" aria-labelledby="presets-label" class="flex flex-wrap gap-2">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          disabled={!ready}
          aria-pressed={matching?.id === preset.id}
          onclick={() => onPreset(preset.scenario)}
          class="focus-visible:outline-primary-600 aria-pressed:bg-primary-700 dark:aria-pressed:bg-primary-300 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-transparent aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:text-slate-900"
        >
          {preset.name}
        </button>
      {/each}
    </div>
    <p class="text-slate-700 dark:text-slate-200" aria-live="polite" data-testid="preset-notice">
      {matching?.notice ?? customNotice}
    </p>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each groups as group (group.title)}
      <fieldset class="min-w-0 space-y-4">
        <legend class="mb-3 font-semibold text-slate-900 dark:text-white">{group.title}</legend>
        {#each group.fields as spec (spec.field)}
          <NumberField
            field={spec.field}
            label={spec.label}
            value={scenario[spec.field]}
            source={spec.source}
            unit={spec.unit}
            disabled={!ready}
            onChange={(value) => onChange({ [spec.field]: value })}
          />
        {/each}
      </fieldset>
    {/each}
  </div>

  <div class="max-w-md">
    <ToggleGroup
      id="policy"
      label="When the work is more than you can review fresh"
      value={scenario.policy}
      options={policies}
      disabled={!ready}
      onChange={(policy) => onChange({ policy })}
      hint="Queue it: the extra waits for tomorrow. Review it tired: you get through it today, past your good sittings."
    />
  </div>
  <p class={hintClasses}>
    Everything here is worked out in this tab. Nothing you type is sent anywhere.
  </p>
</section>
