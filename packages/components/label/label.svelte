<script lang="ts">
  import { merge } from '$merge';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLElement> & {
    label: string;
    required?: boolean | null;
    disabled?: boolean | null;
  };

  const { required = false, disabled = false, hidden = false, label, children }: Props = $props();
</script>

<label class="flex flex-col gap-1.5">
  <span
    class={merge(
      'inline-flex items-center gap-1.5 text-sm font-semibold',
      disabled && 'text-slate-500 dark:text-slate-400',
      required && 'after:h-1.5 after:w-1.5 after:rounded-full after:bg-red-500',
      hidden && 'sr-only',
    )}
  >
    {label}
  </span>
  {@render children?.()}
</label>
