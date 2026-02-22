import { writeFile } from 'node:fs/promises';
import prettier from 'prettier';

export const writeFormattedJson = async (filePath: string, value: unknown): Promise<void> => {
  const raw = `${JSON.stringify(value, null, 2)}\n`;
  const prettierConfig = (await prettier.resolveConfig(filePath)) ?? {};
  const formatted = await prettier.format(raw, {
    ...prettierConfig,
    parser: 'json',
    filepath: filePath,
  });

  await writeFile(filePath, formatted, 'utf8');
};
