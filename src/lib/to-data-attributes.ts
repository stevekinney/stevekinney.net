const keysToOmit = ['data'];
const keysToPreserve = ['class', 'style'];

export const toDataAttributes = <T extends Record<string, unknown>>(
	props: T,
): Record<string, string> => {
	const result: Record<string, string> = {};

	for (const key in props) {
		const value = props[key];

		if (keysToOmit.includes(key)) continue;

		if (keysToPreserve.includes(key)) {
			result[key] = value as string;
			continue;
		}

		if (value !== null && value !== undefined) {
			result[`data-${key}`] = value.toString();
		}
	}

	return result;
};
