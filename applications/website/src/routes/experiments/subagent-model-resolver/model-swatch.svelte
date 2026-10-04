<script lang="ts">
  import { modelLabel } from './models';
  import type { ModelValue } from './models';
  import { swatchClasses } from './tier-style';

  type Props = {
    model: ModelValue;
    /** Shows the name as text. Turn it off where the name is already beside it. */
    showName?: boolean;
  };

  const { model, showName = true }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5 align-middle">
  <span aria-hidden="true" class="inline-block size-3.5 flex-none rounded-sm {swatchClasses(model)}"
  ></span>
  {#if showName}
    <span class="font-mono text-sm font-semibold">{modelLabel(model)}</span>
  {/if}
</span>
