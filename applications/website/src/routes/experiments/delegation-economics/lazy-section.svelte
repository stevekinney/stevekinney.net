<script lang="ts" generics="SectionProps extends Record<string, unknown>">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  import { bodyClasses } from './field-styles';

  type Props = {
    /** The heavy section's module, loaded once the page is interactive. */
    load: () => Promise<{ default: Component<SectionProps> }>;
    props: SectionProps;
    /** What to call the section while it loads, such as "the session reader". */
    name: string;
  };

  const { load, props, name }: Props = $props();

  let Section = $state.raw<Component<SectionProps> | null>(null);
  let failed = $state(false);

  onMount(() => {
    load()
      .then((module) => {
        Section = module.default;
      })
      .catch(() => {
        failed = true;
      });
  });
</script>

{#if Section}
  <Section {...props} />
{:else if failed}
  <p role="alert" class="text-sm text-red-700 dark:text-red-400">
    Couldn’t load {name}. Reload the page to try again.
  </p>
{:else}
  <p class={bodyClasses}>Loading {name}…</p>
{/if}
