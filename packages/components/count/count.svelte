<script lang="ts">
  import { merge } from '$merge';
  import type { ExtendElement } from '../component.types';
  import { variants, type CountVariants } from './variants';

  type CountProps = ExtendElement<
    'span',
    CountVariants & {
      count: number;
    }
  >;

  const { count, variant = 'default', class: className, ...props }: CountProps = $props();
</script>

<span class={merge(variants({ variant }), className)} {...props}>
  {count}
</span>
