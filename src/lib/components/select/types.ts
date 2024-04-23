export type SelectProps = Omit<Partial<HTMLSelectElement>, 'options'> & {
	label: string;
	options: { label: string; value: string }[];
};
