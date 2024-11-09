<script lang="ts">
	import { variants, type CountVariants } from './variants';

	interface Props {
		count: number;
		variant?: CountVariants['variant'];
	}

	let { count, variant = 'default' }: Props = $props();
</script>

<span class={variants({ variant })}>
	{count}
</span>
