import type { ComponentType } from 'svelte';
import {
	type Icon,
	AlertTriangle,
	Bug,
	Check,
	CheckCircle2,
	ClipboardList,
	Flame,
	HelpCircle,
	Info,
	List,
	Pencil,
	Quote,
	X,
	Zap,
} from 'lucide-svelte';

export type CalloutVariation = (typeof variations)[number];

type CalloutVariationAlias = keyof typeof aliases;
type CalloutVariationWithoutAlias = Exclude<CalloutVariation, CalloutVariationAlias>;

export const variations = [
	'abstract',
	'attention',
	'bug',
	'caution',
	'check',
	'cite',
	'danger',
	'done',
	'error',
	'example',
	'fail',
	'failure',
	'faq',
	'help',
	'hint',
	'important',
	'info',
	'information',
	'missing',
	'note',
	'question',
	'quote',
	'success',
	'summary',
	'tip',
	'tldr',
	'todo',
	'warning',
] as const;

const aliases = {
	attention: 'warning',
	caution: 'warning',
	check: 'success',
	cite: 'quote',
	done: 'success',
	error: 'danger',
	fail: 'failure',
	faq: 'question',
	help: 'question',
	hint: 'tip',
	important: 'tip',
	information: 'info',
	missing: 'failure',
	summary: 'abstract',
	tldr: 'abstract',
} as const;

const isAlias = (variant: CalloutVariation): variant is keyof typeof aliases => {
	return variant in aliases;
};

export const getVariation = (variant: CalloutVariation): CalloutVariationWithoutAlias => {
	if (isAlias(variant) && variant in aliases) {
		return aliases[variant];
	}
	return variant as CalloutVariationWithoutAlias;
};

const variationColors: Record<CalloutVariationWithoutAlias, string> = {
	abstract:
		'bg-green-50 text-green-700 border-green-100 dark:bg-green-900 dark:text-green-50 dark:border-green-800',
	bug: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900 dark:text-red-50 dark:border-red-800',
	danger:
		'bg-red-50 text-red-700 border-red-100 dark:bg-red-900 dark:text-red-50 dark:border-red-800',
	example:
		'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900 dark:text-purple-50 dark:border-purple-800',
	failure:
		'bg-red-50 text-red-700 border-red-100 dark:bg-red-900 dark:text-red-50 dark:border-red-800',
	info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900 dark:text-blue-50 dark:border-blue-800',
	note: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900 dark:text-blue-50 dark:border-blue-800',
	question:
		'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900 dark:text-orange-50 dark:border-orange-800',
	quote:
		'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-50 dark:border-slate-800',
	success:
		'bg-green-50 text-green-700 border-green-100 dark:bg-green-900 dark:text-green-50 dark:border-green-800',
	tip: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900 dark:text-green-50 dark:border-green-800',
	todo: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900 dark:text-blue-50 dark:border-blue-800',
	warning:
		'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900 dark:text-orange-50 dark:border-orange-800',
};

export const getVariationColor = (variation: CalloutVariation): string => {
	const v = getVariation(variation);
	return variationColors[v];
};

const variationIcons: Record<CalloutVariationWithoutAlias, ComponentType<Icon>> = {
	abstract: ClipboardList,
	bug: Bug,
	danger: Zap,
	example: List,
	failure: X,
	info: Info,
	note: Pencil,
	question: HelpCircle,
	quote: Quote,
	success: Check,
	tip: Flame,
	todo: CheckCircle2,
	warning: AlertTriangle,
};

export const getIcon = (variation: CalloutVariation) => {
	const v = getVariation(variation);
	return variationIcons[v];
};
