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

const store = writable({ ...shikiCssVariables });

export const set = (key: ShikiCssVariable, value: string) => {
	store.update((state) => ({ ...state, [key]: value }));
};

export const asInlineStyle = derived(store, (state) => {
	return Object.entries(state)
		.map(([key, value]) => `${key}: ${value};`)
		.join(' ');
});

// <span class="line"><span style="color: var(--shiki-token-function)">:root</span><span style="color: var(--shiki-color-text)"> {
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-color-text</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#d6deeb</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-color-background</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#011628</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-constant</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#7fdbca</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-string</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#edc38d</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-comment</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#94a4ad</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-keyword</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#c792e9</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-parameter</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#d6deeb</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-function</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#edc38d</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-string-expression</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#7fdbca</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-punctuation</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#c792e9</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">  --shiki-token-link</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">#79b8ff</span><span style="color: var(--shiki-color-text)">;
// <span class="line"><span style="color: var(--shiki-color-text)">}

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
