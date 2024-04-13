<script lang="ts">
	import Link from '../../components/link.svelte';
	export let href: string;
</script>

<Link
	{href}
	{...$$restProps}
	class="font-normal decoration-2 underline-offset-4 hover:bg-primary-100 hover:text-black"
	active="font-bold bg-primary-200 hover:bg-primary-200"
	exact
>
	<slot />
</Link>
