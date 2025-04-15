const formatDate = (date: Date | string, locale = 'en-US'): string => {
	if (typeof date === 'string') date = new Date(date);
	const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

	return date.toLocaleDateString(locale, options);
};

export const toISODate = (date: Date | string): string => {
	if (typeof date === 'string') date = new Date(date);
	return date.toISOString();
};

export default formatDate;
