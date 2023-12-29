import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import type { Fonts } from './fonts';

const require = createRequire(import.meta.url);

export const getFontPath = async <
	F extends keyof Fonts,
	W extends Fonts[F]['weights'][number],
	S extends Fonts[F]['styles'][number],
	L extends Fonts[F]['subsets'][number] = Fonts[F]['defaultSubset'],
>(
	family: F,
	weight: W,
	style: S,
	subset?: L,
) => {
	const { fonts } = await import('./fonts');
	const font = fonts[family];

	subset = subset ?? (font.defaultSubset as L);

	const directory = join(dirname(require.resolve(font.path)), 'files');
	return join(directory, `${family}-${subset}-${weight}-${style}.woff`).toLowerCase();
};

export const getFont = async <
	F extends keyof Fonts,
	W extends Fonts[F]['weights'][number],
	S extends Fonts[F]['styles'][number],
	L extends Fonts[F]['subsets'][number] | Fonts[F]['defaultSubset'] = Fonts[F]['defaultSubset'],
>(
	family: F,
	weight: W,
	style: S,
	subset?: L,
) => {
	const { fonts } = await import('./fonts');
	const font = fonts[family];
	const file = await getFontPath(family, weight, style, subset);
	const data = await readFile(file);

	return { name: font.family, data, weight, style };
};
