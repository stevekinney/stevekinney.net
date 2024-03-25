import type { PageServerLoad, Actions } from './$types';
import spacing from './spacing';

export const prerender = false;

const storageKey = 'figmaTailwindSpacingValues';

export const load: PageServerLoad = (event) => {
	const savedValues = event.cookies.get(storageKey);

	if (!savedValues) {
		const variables = spacing;
		event.cookies.set(storageKey, JSON.stringify(variables), {
			path: event.route.id,
		});

		return { variables };
	}

	return { variables: JSON.parse(savedValues) };
};

export const actions = {
	add: async ({ request, cookies, route }) => {
		const variables = JSON.parse(cookies.get(storageKey) || '{}');

		const data = await request.formData();
		const key = data.get('key') as string;
		const value = data.get('value') as string;
		const unit = data.get('unit') as string;

		variables[key] = `${value}${unit}`;

		cookies.set(storageKey, JSON.stringify(variables), {
			path: route.id,
		});

		return { variables };
	},
	reset: async ({ cookies, route }) => {
		cookies.set(storageKey, JSON.stringify(spacing), {
			path: route.id,
		});

		return { variables: spacing };
	},
	remove: async ({ request, cookies, route }) => {
		const variables = JSON.parse(cookies.get(storageKey) || '{}');

		const data = await request.formData();
		const key = (data.get('key') as string).split('/')[1];

		delete variables[key.replace('_', '.')];

		cookies.set(storageKey, JSON.stringify(variables), {
			path: route.id,
		});

		return { variables };
	},
} satisfies Actions;
