const pageTitle = 'Steve Kinney';

export const formatPageTitle = (title: string | undefined): string => {
	if (title) {
		return `${title} | ${pageTitle}`;
	}

	return pageTitle;
};
