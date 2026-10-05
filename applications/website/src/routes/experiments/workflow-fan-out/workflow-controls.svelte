<script lang="ts">
  import { Minus, Plus } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { MAXIMUM_MANUAL_ITEMS, MAXIMUM_STAGES, ranges } from './config';
  import type { DurationMode, ErrorHandling, StageConfig, WorkflowConfig } from './config';
  import { bodyClasses, codeClasses, fieldClasses, labelClasses } from './field-styles';
  import type { WorkflowModel } from './models';
  import NumberField from './number-field.svelte';
  import SelectField from './select-field.svelte';
  import { stageStyle } from './stage-styles';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    config: WorkflowConfig;
    models: WorkflowModel[];
    ready: boolean;
    onChange: (patch: Partial<WorkflowConfig>) => void;
    onStageChange: (index: number, patch: Partial<StageConfig>) => void;
    onAddStage: () => void;
    onRemoveStage: () => void;
    onCellChange: (item: number, stage: number, minutes: number) => void;
    onDurationMode: (mode: DurationMode) => void;
  };

  const {
    config,
    models,
    ready,
    onChange,
    onStageChange,
    onAddStage,
    onRemoveStage,
    onCellChange,
    onDurationMode,
  }: Props = $props();

  const modelOptions = $derived(
    models.map((model) => ({
      value: model.id,
      label: `${model.name} ($${model.input}/$${model.output})`,
    })),
  );
  const optionalModels = (unset: string) => [{ value: '', label: unset }, ...modelOptions];
</script>

<div class="space-y-8">
  <div class="grid gap-4 sm:grid-cols-3">
    <NumberField
      id="items"
      label="Items"
      kind="integer"
      value={config.items}
      minimum={ranges.items.minimum}
      maximum={ranges.items.maximum}
      disabled={!ready}
      hint="1 to 4,096 per call. Type more to see the rejection."
      onChange={(items) => onChange({ items })}
    />
    <NumberField
      id="concurrency"
      label="Concurrency"
      kind="integer"
      value={config.concurrency}
      minimum={ranges.concurrency.minimum}
      maximum={ranges.concurrency.maximum}
      disabled={!ready}
      hint="Agents at once: 16 by default, 1 to 256."
      onChange={(concurrency) => onChange({ concurrency })}
    />
    <NumberField
      id="seed"
      label="Seed"
      kind="integer"
      value={config.seed}
      minimum={ranges.seed.minimum}
      maximum={ranges.seed.maximum}
      disabled={!ready}
      hint="Every random duration and failure comes from this."
      onChange={(seed) => onChange({ seed })}
    />
  </div>

  <fieldset class="space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Stages</legend>
    <div class="grid gap-4 md:grid-cols-2">
      {#each config.stages as stage, index (index)}
        <div
          class="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
          data-testid="stage-{index + 1}"
        >
          <p class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <span
              aria-hidden="true"
              class="inline-block h-3 w-5 rounded-sm {stageStyle(index).swatch}"
            ></span>
            Stage {index + 1}
          </p>
          <div class="space-y-1.5">
            <label for="stage-{index}-name" class={labelClasses}>Stage {index + 1} name</label>
            <input
              id="stage-{index}-name"
              type="text"
              value={stage.name}
              maxlength="40"
              disabled={!ready}
              oninput={(event) => onStageChange(index, { name: event.currentTarget.value })}
              class={fieldClasses}
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <NumberField
              id="stage-{index}-mean"
              label="Mean minutes"
              kind="decimal"
              value={stage.meanMinutes}
              minimum={ranges.meanMinutes.minimum}
              maximum={ranges.meanMinutes.maximum}
              disabled={!ready}
              onChange={(meanMinutes) => onStageChange(index, { meanMinutes })}
            />
            <NumberField
              id="stage-{index}-variability"
              label="Variability"
              kind="decimal"
              value={stage.variability}
              minimum={ranges.variability.minimum}
              maximum={ranges.variability.maximum}
              disabled={!ready}
              onChange={(variability) => onStageChange(index, { variability })}
            />
          </div>
          <NumberField
            id="stage-{index}-tokens"
            label="Tokens per agent"
            kind="tokens"
            value={stage.tokens}
            minimum={ranges.tokens.minimum}
            maximum={ranges.tokens.maximum}
            disabled={!ready}
            onChange={(tokens) => onStageChange(index, { tokens })}
          />
          <SelectField
            id="stage-{index}-model"
            label="Stage {index + 1} model on the agent() call"
            value={stage.modelId ?? ''}
            options={optionalModels('Not set (inherit)')}
            disabled={!ready}
            onChange={(value) => onStageChange(index, { modelId: value || null })}
          />
          <SelectField
            id="stage-{index}-definition"
            label="Stage {index + 1} agent definition’s model"
            value={stage.definitionModelId ?? ''}
            options={optionalModels('No agent definition model')}
            disabled={!ready}
            onChange={(value) => onStageChange(index, { definitionModelId: value || null })}
          />
        </div>
      {/each}
    </div>
    <div class="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="small"
        icon={Plus}
        disabled={!ready || config.stages.length >= MAXIMUM_STAGES}
        onclick={onAddStage}
      >
        Add a stage
      </Button>
      <Button
        variant="secondary"
        size="small"
        icon={Minus}
        disabled={!ready || config.stages.length <= 1}
        onclick={onRemoveStage}
      >
        Remove the last stage
      </Button>
    </div>
    <p class={bodyClasses}>
      Variability is the standard deviation over the mean. Generated durations are log-normal, drawn
      from the seed, and kept to a tenth of a minute.
    </p>
  </fieldset>

  <div class="space-y-4">
    <ToggleGroup
      id="duration-mode"
      label="Durations"
      value={config.durationMode}
      disabled={!ready}
      options={[
        { value: 'generated', label: 'Generated from the seed' },
        { value: 'manual', label: 'Manual grid' },
      ]}
      onChange={(value) => onDurationMode(value as DurationMode)}
    />
    {#if config.durationMode === 'manual'}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="focus-visible:outline-primary-600 relative max-h-96 overflow-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
        role="region"
        aria-label="Manual durations"
        tabindex="0"
      >
        <table class="text-sm text-slate-700 dark:text-slate-200">
          <caption class="sr-only">Minutes for each item and stage</caption>
          <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
            <tr>
              <th scope="col" class="px-3 py-2 text-left">Item</th>
              {#each config.stages as stage, index (index)}
                <th scope="col" class="px-3 py-2 text-left">{stage.name} (min)</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each config.manual as row, item (item)}
              <tr>
                <th scope="row" class="px-3 py-1 text-left font-normal tabular-nums">{item + 1}</th>
                {#each row as minutes, stage (stage)}
                  <td class="px-2 py-1">
                    <NumberField
                      id="cell-{item}-{stage}"
                      label="Item {item + 1}, {config.stages[stage].name} minutes"
                      hideLabel
                      kind="decimal"
                      value={minutes}
                      minimum={ranges.durationMinutes.minimum}
                      maximum={ranges.durationMinutes.maximum}
                      disabled={!ready}
                      class="w-24"
                      onChange={(value) => onCellChange(item, stage, value)}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if config.items > MAXIMUM_MANUAL_ITEMS}
        <p class={bodyClasses}>
          The grid holds the first {MAXIMUM_MANUAL_ITEMS} items. Items after that use generated durations.
        </p>
      {/if}
    {/if}
  </div>

  <fieldset class="space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Failures</legend>
    <div class="grid gap-4 sm:grid-cols-3">
      <NumberField
        id="failure-probability"
        label="Failure probability per agent"
        kind="percent"
        value={config.failureProbability}
        minimum={0}
        maximum={1}
        disabled={!ready}
        hint="A stopped or failed agent returns null."
        onChange={(failureProbability) => onChange({ failureProbability })}
      />
      <NumberField
        id="validation-probability"
        label="Schema failure per attempt"
        kind="percent"
        value={config.validationFailureProbability}
        minimum={0}
        maximum={1}
        disabled={!ready}
        hint="Fail every attempt and the call throws."
        onChange={(validationFailureProbability) => onChange({ validationFailureProbability })}
      />
      <NumberField
        id="validation-attempts"
        label="Validation attempts"
        kind="integer"
        value={config.validationAttempts}
        minimum={ranges.validationAttempts.minimum}
        maximum={ranges.validationAttempts.maximum}
        disabled={!ready}
        onChange={(validationAttempts) => onChange({ validationAttempts })}
      />
    </div>
    <ToggleGroup
      id="error-handling"
      label="Where a thrown error lands"
      value={config.errorHandling}
      disabled={!ready}
      options={[
        { value: 'caught', label: 'Inside pipeline() or parallel()' },
        { value: 'uncaught', label: 'Uncaught' },
      ]}
      hint="The runtime catches errors inside its own calls. A bare agent() call or Promise.all doesn’t."
      onChange={(value) => onChange({ errorHandling: value as ErrorHandling })}
    />
  </fieldset>

  <fieldset class="space-y-4">
    <legend class="text-lg font-bold text-slate-900 dark:text-white">Models and tokens</legend>
    <div class="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="session-model"
        label="Session model"
        value={config.sessionModelId}
        options={modelOptions}
        disabled={!ready}
        onChange={(sessionModelId) => onChange({ sessionModelId })}
      />
      <SelectField
        id="environment-model"
        label="CLAUDE_CODE_SUBAGENT_MODEL"
        value={config.environmentModelId ?? ''}
        options={optionalModels('Not set')}
        disabled={!ready}
        onChange={(value) => onChange({ environmentModelId: value || null })}
      />
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <label
        class="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        <input
          type="checkbox"
          checked={config.scout}
          disabled={!ready}
          onchange={(event) => onChange({ scout: event.currentTarget.checked })}
          class="size-4"
        />
        Include a scout agent
      </label>
      <NumberField
        id="scout-tokens"
        label="Scout tokens"
        kind="tokens"
        value={config.scoutTokens}
        minimum={ranges.tokens.minimum}
        maximum={ranges.tokens.maximum}
        disabled={!ready || !config.scout}
        onChange={(scoutTokens) => onChange({ scoutTokens })}
      />
      <NumberField
        id="output-share"
        label="Output share"
        kind="integer"
        value={config.outputPercent}
        minimum={ranges.outputPercent.minimum}
        maximum={ranges.outputPercent.maximum}
        disabled={!ready}
        hint="Percent of tokens priced as output."
        onChange={(outputPercent) => onChange({ outputPercent })}
      />
    </div>
    <p class={bodyClasses}>
      The scout is the first <code class={codeClasses}>agent()</code> call, the one that lists the items.
      It counts toward agents and tokens and runs on whatever an unset call resolves to, but it isn’t
      drawn on the charts, which start when the fan-out does.
    </p>
  </fieldset>
</div>
