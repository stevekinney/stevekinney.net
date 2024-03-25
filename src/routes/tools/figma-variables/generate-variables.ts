import { generateId } from './generate-id';

type FigmaVariableCollection = {
	id: string;
	name: string;
	modes: Record<string, string>;
	variableIds: string[];
	variables: FigmaVariable[];
};

type FigmaVariable = {
	id: string;
	name: string;
	description: string;
	type: 'FLOAT';
	valuesByMode: Record<string, number>;
	resolvedValuesByMode: Record<string, { resolvedValue: number; alias: string | null }>;
	scopes: string[];
	hiddenFromPublishing: boolean;
	codeSyntax: Record<'WEB', string>;
};

type GenerateVariableOptions = {
	baseRem?: number;
};

export const generateFigmaSpacingVariables = (
	name: string = 'Spacing',
	spacings: Record<string, string>,
) => {
	const id = generateId();

	const collection: FigmaVariableCollection = {
		id: `VariableCollectionId:1:${id()}`,
		name,
		modes: {
			'1:0': 'Mode 1',
		},
		variableIds: [],
		variables: [],
	};

	for (const [key, value] of Object.entries(spacings)) {
		generateVariable(key, value, collection, id);
	}

	return collection;
};

const toValue = (value: string | number, baseRem: number) => {
	if (typeof value === 'number') return value;

	if (value.endsWith('px')) {
		return parseFloat(value);
	}

	if (value.endsWith('rem')) {
		return parseFloat(value) * baseRem;
	}

	if (value.endsWith('em')) {
		return parseFloat(value) * 16;
	}

	return parseFloat(value);
};

const generateVariable = (
	key: string,
	value: string,
	collection: FigmaVariableCollection,
	id: () => number,
	{ baseRem = 16 }: GenerateVariableOptions = {},
) => {
	const pixels = toValue(value, baseRem);

	if (isNaN(pixels)) return;

	const result: FigmaVariable = {
		id: `VariableID:1:${id()}`,
		name: `${collection.name}/${key.replace('.', '_')}`,
		description: '',
		type: 'FLOAT',
		valuesByMode: {
			'1:0': pixels,
		},
		resolvedValuesByMode: {
			'1:0': {
				resolvedValue: pixels,
				alias: null,
			},
		},
		scopes: ['WIDTH_HEIGHT', 'GAP'],
		hiddenFromPublishing: false,
		codeSyntax: {
			WEB: value,
		},
	};

	collection.variableIds.push(result.id);
	collection.variables.push(result);
};
