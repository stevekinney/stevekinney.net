<script lang="ts">
	import { variants, type CountVariants } from './variants';

	interface Props {
		count: number;
		variant?: CountVariants['variant'];
	}

	const { count, variant = 'default' }: Props = $props();
</script>

<span class={variants({ variant })}>
	{count}
</span>
