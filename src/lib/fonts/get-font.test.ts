import { describe, expect } from 'vitest';
import { getFontPath } from './get-font';
import { readFile } from 'fs/promises';

describe('getFontPath', (it) => {
	it('should return the correct path', async () => {
		const path = await getFontPath('roboto', 400, 'normal');
		expect(async () => {
			await readFile(path);
		}).not.toThrow();
	});
});
