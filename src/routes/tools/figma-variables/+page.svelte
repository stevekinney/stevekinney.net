<script module lang="ts">
	const title = 'Figma Spacing Variable Generator';
	const description = 'Generate Figma variables for spacing in your design system.';

	export const metadata = {
		title,
		description,
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash, Download, ListRestart, PlusCircle } from 'lucide-svelte';

	import README from './README.md';
	import SEO from '$lib/components/seo.svelte';
	import Card from '$lib/components/card';
	import Button from '$lib/components/button';
	import Input from '$lib/components/input';

	import { generateFigmaSpacingVariables } from './generate-variables';

	const { data } = $props();

	let collection = $derived(generateFigmaSpacingVariables('Spacing', data.variables));
</script>

<SEO {title} {description} />

<main class="grid grid-cols-1 gap-8 md:grid-cols-2">
	<section class="space-y-8">
		<README class="prose dark:prose-invert" />
		<form
			method="POST"
			action="?/reset"
			class="flex items-start justify-center gap-2 md:justify-start"
			use:enhance
		>
			<Button type="submit" icon={ListRestart}>Reset to Defaults</Button>
			<Button
				href="data:text/json;charset=utf-8,{JSON.stringify(collection, null, 2)}"
				download="spacing.json"
				icon={Download}
			>
				Download
			</Button>
		</form>
	</section>

	<Card>
		<form class="space-y-4" method="POST" action="?/add" use:enhance>
			<h2 class="font-semibold">Create a New Variable</h2>
			<Input
				label="Variable Name"
				id="new-spacing-name"
				name="key"
				placeholder="Variable Name"
				required
			/>
			<div class="flex items-end gap-4">
				<Input
					label="Spacing Value"
					id="new-spacing-value"
					type="number"
					name="value"
					placeholder="Value"
					required
				/>
				<select
					class="rounded-md px-3 py-1 ring-primary-600 focus:outline-none focus:ring-2 dark:bg-slate-800"
					name="unit"
				>
					<option value="rem">rem</option>
					<option value="px">px</option>
				</select>
			</div>
			<div>
				<Button full icon={PlusCircle}>Add</Button>
			</div>
		</form>
	</Card>

	<table class="text-sm md:col-span-2">
		<thead>
			<tr>
				<th>Variable</th>
				<th>Value</th>
				<th>Code Syntax</th>
				<th><span class="sr-only">Remove</span></th>
			</tr>
		</thead>
		<tbody>
			{#each collection.variables as variable}
				{@const [value] = Object.values(variable.valuesByMode)}
				<tr>
					<th class="w-1/6">
						{variable.name}
					</th>
					<td class="overflow-x-clip md:min-w-fit">
						<div class="flex gap-2">
							<p class="text-center md:min-w-8 md:text-right">{value}</p>
							{#if variable.codeSyntax.WEB.includes('rem')}
								<div
									class="hidden h-4 bg-primary-300 md:block dark:bg-primary-800"
									style="width: {variable.codeSyntax.WEB};"
								></div>
							{/if}
						</div>
					</td>
					<td class="text-center"><code>{variable.codeSyntax.WEB}</code></td>
					<td class="text-center">
						<form method="post" action="?/remove" use:enhance>
							<label class="sr-only" for="remove-spacing-name">Remove {variable.name}</label>
							<input type="hidden" name="key" value={variable.name} />
							<Button size="small" variant="ghost" icon={Trash} />
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>
