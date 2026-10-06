<script lang="ts">
  import { endpointLabels } from './analysis';
  import type { Endpoint, Pairing } from './analysis';
  import { bodyClasses } from './field-styles';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    endpoints: Endpoint[];
    endpoint: Endpoint;
    /** Whether the verdict's comparison could be paired, and why not. */
    pairing: Pairing | null;
    paired: boolean;
    ready: boolean;
    onEndpoint: (endpoint: Endpoint) => void;
    onPaired: (paired: boolean) => void;
  };

  const { endpoints, endpoint, pairing, paired, ready, onEndpoint, onPaired }: Props = $props();
</script>

<div class="space-y-4">
  {#if endpoints.length > 0}
    <div class="max-w-xl">
      <ToggleGroup
        id="endpoint"
        label="Endpoint: what the verdict is about"
        value={endpoint}
        options={endpoints.map((value) => ({ value, label: endpointLabels[value] }))}
        onChange={(value) => onEndpoint(value as Endpoint)}
        disabled={!ready}
      />
    </div>
    <p class="max-w-3xl {bodyClasses}">
      Pick the endpoint before you look at the results. Trying each one until something comes out
      “distinguishable” is how a 1-in-20 fluke becomes a finding.
    </p>
  {/if}

  {#if pairing && endpoint !== 'rework'}
    {#if pairing.possible}
      <div class="space-y-2" data-testid="pairing">
        <label class="flex items-start gap-2 font-medium text-slate-800 dark:text-slate-100">
          <input
            type="checkbox"
            disabled={!ready}
            checked={paired}
            onchange={(event) => onPaired(event.currentTarget.checked)}
            class="accent-primary-600 mt-1"
          />
          <span>Pair each task with itself ({pairing.tasks} tasks ran both ways)</span>
        </label>
        <p class="max-w-3xl {bodyClasses}">
          Pairing compares each task to itself, so each task is its own control. A 30-minute task
          and a 70-minute task differ by far more than any workflow does; unpaired, that spread
          counts as noise. Paired, it cancels out, and only the gap the workflow made is left.
          Switch it off to see the same data analyzed as if the tasks were different.
        </p>
      </div>
    {:else}
      <p class="max-w-3xl {bodyClasses}" data-testid="pairing">
        <strong class="font-semibold text-slate-800 dark:text-slate-100">Unpaired.</strong>
        {pairing.reason} Each condition is compared as a separate group.
      </p>
    {/if}
  {:else if endpoint === 'rework'}
    <p class="max-w-3xl {bodyClasses}" data-testid="pairing">
      Rework is compared as two rates, with Newcombe’s interval for the gap between them, whether or
      not the tasks match.
    </p>
  {/if}
</div>
