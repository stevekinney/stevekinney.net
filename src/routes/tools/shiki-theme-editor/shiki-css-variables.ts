import { derived, writable } from 'svelte/store';

const shikiCssVariables = {
	'--shiki-color-text': '#aac569',
	'--shiki-color-background': '#011628',
	'--shiki-token-constant': '#7fdbca',
	'--shiki-token-string': '#edc38d',
	'--shiki-token-comment': '#94a4ad',
	'--shiki-token-keyword': '#c792e9',
	'--shiki-token-parameter': '#d6deeb',
	'--shiki-token-function': '#edc38d',
	'--shiki-token-string-expression': '#7fdbca',
	'--shiki-token-punctuation': '#c792e9',
	'--shiki-token-link': '#79b8ff',
} as const;

export type ShikiCssVariable = keyof typeof shikiCssVariables;

const store = writable(shikiCssVariables);

export const set = (key: ShikiCssVariable, value: string) => {
	store.update((state) => ({ ...state, [key]: value }));
};

export const asInlineStyle = derived(store, (state) => {
	return Object.entries(state)
		.map(([key, value]) => `${key}: ${value};`)
		.join(' ');
});

export const toHTML = derived(store, (state) => {
	let html = '<code>';

	html +=
		'<span style="color: var(--shiki-token-function)">:root</span><span style="color: var(--shiki-color-text)"> {</span><br />';

	for (const [key, value] of Object.entries(state)) {
		html += `<span style="color: var(--shiki-color-text)">  ${key}</span>`;
		html += '<span style="color: var(--shiki-token-keyword)">:</span> ';
		html += `<span style="color: var(--shiki-token-constant)">${value}</span>`;
		html += '<span style="color: var(--shiki-color-text)">;</span><br />';
	}

	html += '<span style="color: var(--shiki-color-text)">}</span>';

	return html + '</code>';
});

export default {
	subscribe: store.subscribe,
};
