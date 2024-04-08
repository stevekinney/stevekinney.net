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
	summary: 'abstract',
	tldr: 'abstract',
	error: 'danger',
	fail: 'failure',
	missing: 'failure',
	faq: 'question',
	help: 'question',
	cite: 'quote',
	check: 'success',
	done: 'success',
	hint: 'tip',
	important: 'tip',
	attention: 'warning',
	caution: 'warning',
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
	abstract: 'bg-green-50 text-green-700 border-green-100',
	bug: 'bg-red-50 text-red-700 border-red-100',
	danger: 'bg-red-50 text-red-700 border-red-100',
	example: 'bg-purple-50 text-purple-700 border-purple-100',
	failure: 'bg-red-50 text-red-700 border-red-100',
	info: 'bg-blue-50 text-blue-700 border-blue-100',
	note: 'bg-blue-50 text-blue-700 border-blue-100',
	question: 'bg-orange-50 text-orange-700 border-orange-100',
	quote: 'bg-slate-50 text-slate-700 border-slate-100',
	success: 'bg-green-50 text-green-700 border-green-100',
	tip: 'bg-green-50 text-green-700 border-green-100',
	todo: 'bg-blue-50 text-blue-700 border-blue-100',
	warning: 'bg-orange-50 text-orange-700 border-orange-100',
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
