<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Card, { type CardProps } from './card.svelte';

	const { Story } = defineMeta({
		title: 'Card',
		component: Card,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'success', 'warning', 'danger', 'information', 'error'],
			},
		},
	});
</script>

{#snippet content(args: CardProps)}
	<Card {...args}>
		<div class="prose dark:prose-invert">
			<h2>Card Title</h2>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut maximus arcu purus, quis
				faucibus magna pulvinar efficitur. Curabitur tempor lacus sed luctus venenatis. Sed
				tincidunt volutpat enim, sed euismod ligula ornare a. Nam at diam non tellus eleifend
				efficitur. In a sapien ut enim tristique hendrerit. Fusce quis turpis urna. Pellentesque
				habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In non
				sapien efficitur, tincidunt mauris quis, aliquam magna.
			</p>
		</div>
	</Card>
{/snippet}

<Story name="Default" args={{ variant: 'default' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>

<Story name="Success" args={{ variant: 'success' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>

<Story name="Warning" args={{ variant: 'warning' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>

<Story name="Danger" args={{ variant: 'danger' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>

<Story name="Information" args={{ variant: 'information' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>

<Story name="Error" args={{ variant: 'error' }}>
	{#snippet children(args: CardProps)}
		{@render content(args)}
	{/snippet}
</Story>
