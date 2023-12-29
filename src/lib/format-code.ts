import { readFile } from 'fs/promises';
import { resolve } from 'path';
import prettier, { type Options } from 'prettier';

const prettierConfig = JSON.parse(await readFile(resolve(process.cwd(), '.prettierrc'), 'utf-8'));

const format = (code: string, options: Options = {}) =>
	prettier.format(code, { parser: 'typescript', ...prettierConfig, ...options });

export default format;
