export const variants = [
	'default',
	'success',
	'primary',
	'danger',
	'warning',
	'information',
	'error',
] as const;

export type Variant = (typeof variants)[number];
