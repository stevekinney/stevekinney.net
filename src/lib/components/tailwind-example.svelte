<script lang="ts">
  import Button from './button/button.svelte';

  const { children, code } = $props();

  let iframe: HTMLIFrameElement;

  let height = $state(100);
  let width = $state<number | null>(null);

  const setDefaultWidth = () => {
    if (iframe) {
      const parent = iframe.parentElement?.parentElement;
      if (parent) width = parent.clientWidth - 32;
    }
  };

  $effect(() => setDefaultWidth());
</script>

<section class="flex flex-col gap-4 rounded-md bg-slate-200 p-4 shadow-md dark:bg-slate-900">
  <div class="flex w-full flex-col items-center gap-4">
    <div class="flex w-full items-center gap-4">
      <label class="flex w-full flex-1 items-center gap-2 text-xs">
        <span class="font-semibold">Height</span>
        <input
          type="range"
          bind:value={height}
          min="100"
          max="800"
          step="10"
          class="accent-primary-700 w-full"
        />
      </label>

      <label class="flex w-full flex-1 items-center gap-2 text-xs">
        <span class="font-semibold">Width</span>
        <input
          type="range"
          bind:value={width}
          min="100"
          max="1920"
          step="10"
          class="accent-primary-700 w-full"
          disabled={!width}
        />
      </label>

      <Button variant="secondary" size="small" onclick={setDefaultWidth}>Reset Width</Button>
    </div>

    <iframe
      class="z-10 rounded-md border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800"
      title="Tailwind Example"
      bind:this={iframe}
      src={code}
      {height}
      width={width || '100%'}
    ></iframe>
  </div>

  {@render children?.()}
</section>
