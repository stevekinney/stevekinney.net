import { title } from './metadata';

export const formatPageTitle = (pageTitle: string | undefined): string => {
	if (!pageTitle) return title;
	if (pageTitle === title) return title;

	return `${pageTitle} | ${title}`;
};
