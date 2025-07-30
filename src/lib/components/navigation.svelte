<script lang="ts">
  import type { ExtendElement } from './component.types';
  import { merge } from '$merge';

  import Link from './link.svelte';

  const { class: className = '' }: ExtendElement<'nav'> = $props();
</script>

<nav class={merge('flex items-center gap-4', className)} role="navigation" aria-label="Main navigation">
  <Link href="/writing">Writing</Link>
  <Link href="/courses">Courses</Link>
</nav>
