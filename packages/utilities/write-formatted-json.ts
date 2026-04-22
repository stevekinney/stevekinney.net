import { writeFile } from 'node:fs/promises';
import prettier from 'prettier';

export const formatJson = async (filePath: string, value: unknown): Promise<string> => {
  const raw = `${JSON.stringify(value, null, 2)}\n`;
  const prettierConfig = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(raw, {
    ...prettierConfig,
    parser: 'json',
    filepath: filePath,
  });
};

export const writeFormattedJson = async (filePath: string, value: unknown): Promise<void> => {
  const formatted = await formatJson(filePath, value);
  await writeFile(filePath, formatted, 'utf8');
};
