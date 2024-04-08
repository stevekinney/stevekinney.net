<script lang="ts">
	import { variants, type CountVariants } from './variants';

	export let count: number;
	export let variant: CountVariants['variant'] = 'default';
</script>

<span class={variants({ variant })}>
	{count}
</span>
