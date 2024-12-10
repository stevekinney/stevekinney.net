export const encodeParameters = (values: Record<string, string>) => {
	const encoded = new URLSearchParams();

	for (const [key, value] of Object.entries(values)) {
		encoded.set(key, encodeURIComponent(value));
	}

	return encoded.toString();
};
