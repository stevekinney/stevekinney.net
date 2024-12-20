const pageTitle = 'Steve Kinney';

export const formatPageTitle = (title: string | undefined): string => {
	if (title) {
		if (title === pageTitle) return pageTitle;
		return `${title} | ${pageTitle}`;
	}

	return pageTitle;
};
