import { author, description as siteDescription, url } from '$lib/metadata';

const PERSON = {
  '@type': 'Person',
  name: author,
  url,
  description: siteDescription,
  jobTitle: 'Software Engineer, Educator, and Engineering Leader',
  image: `${url}/open-graph.jpg`,
  knowsAbout: [
    'AI systems',
    'Agentic workflows',
    'Developer tools',
    'Distributed systems',
    'Frontend architecture',
    'TypeScript',
  ],
  sameAs: [
    'https://github.com/stevekinney',
    'https://twitter.com/stevekinney',
    'https://linkedin.com/in/stevekinney',
    'https://instagram.com/stevekinney',
    'https://www.youtube.com/channel/UChXe-1_Jh91Z_CM3ppH39Xg',
  ],
};

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: author,
    url,
    description: siteDescription,
    author: PERSON,
  };
}

export function buildPersonSchema() {
  return {
    '@context': 'https://schema.org',
    ...PERSON,
  };
}

export function buildArticleSchema({
  title,
  description,
  datePublished,
  dateModified,
  articleUrl,
  imageUrl,
}: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  articleUrl: string;
  imageUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    url: articleUrl,
    image: imageUrl,
    author: PERSON,
    publisher: PERSON,
  };
}

export function buildCourseSchema({
  name,
  description,
  courseUrl,
}: {
  name: string;
  description: string;
  courseUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url: courseUrl,
    provider: PERSON,
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
