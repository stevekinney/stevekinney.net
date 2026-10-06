<script lang="ts">
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import { codexCheckedVersion } from './document';

  type Props = {
    /** Where the setting does take effect, such as `config.toml`. */
    appliesInstead?: string | undefined;
  };

  const { appliesInstead }: Props = $props();
</script>

<!-- Marks a setting Codex reads in an agent file and then drops. -->
<span
  data-testid="no-effect"
  class="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
>
  No effect in an agent file (Codex {codexCheckedVersion})
</span>
{#if appliesInstead}
  <span class="text-xs text-slate-600 dark:text-slate-300"><CodeText text={appliesInstead} /></span>
{/if}
