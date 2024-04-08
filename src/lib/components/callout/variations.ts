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

export type CalloutVariation = (typeof variations)[number];

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

type Alias = keyof typeof aliases;
type ResolvedVariation = Exclude<CalloutVariation, Alias>;

export const getVariation = (variant: CalloutVariation): ResolvedVariation => {
	if (isAlias(variant) && variant in aliases) {
		return aliases[variant];
	}
	return variant as ResolvedVariation;
};

const variationColors: Record<ResolvedVariation, string> = {
	abstract: 'bg-green-50 text-green-700',
	bug: 'bg-red-50 text-red-700',
	danger: 'bg-red-50 text-red-700',
	example: 'bg-purple-50 text-purple-700',
	failure: 'bg-red-50 text-red-700',
	info: 'bg-blue-50 text-blue-700',
	note: 'bg-blue-50 text-blue-700',
	question: 'bg-orange-50 text-orange-700',
	quote: 'bg-slate-50 text-slate-700',
	success: 'bg-green-50 text-green-700',
	tip: 'bg-green-50 text-green-700',
	todo: 'bg-blue-50 text-blue-700',
	warning: 'bg-orange-50 text-orange-700',
};

export const getVariationColor = (variation: CalloutVariation): string => {
	const v = getVariation(variation);
	return variationColors[v];
};

const variationIcons: Record<ResolvedVariation, ComponentType<Icon>> = {
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
