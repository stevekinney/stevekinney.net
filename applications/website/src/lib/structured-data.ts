import { author, language, description as siteDescription, url } from '$lib/metadata';

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

const normalizeSchemaDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return value.length === 10 ? `${value}T00:00:00.000Z` : date.toISOString();
};

/** Serializes JSON-LD safely for placement inside an HTML script element. */
export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export function buildWebSiteSchema() {
  return {
    '@type': 'WebSite',
    name: author,
    url,
    description: siteDescription,
    author: PERSON,
  };
}

export function buildPersonSchema() {
  return {
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
    '@type': 'Article',
    headline: title,
    description,
    datePublished: normalizeSchemaDate(datePublished),
    ...(dateModified ? { dateModified: normalizeSchemaDate(dateModified) } : {}),
    url: articleUrl,
    image: imageUrl,
    inLanguage: language,
    author: PERSON,
    publisher: PERSON,
  };
}

export function buildCourseSchema({
  name,
  description,
  courseUrl,
  datePublished,
  dateModified,
}: {
  name: string;
  description: string;
  courseUrl: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@type': 'Course',
    '@id': `${courseUrl}#course`,
    name,
    description,
    url: courseUrl,
    provider: PERSON,
    inLanguage: language,
    ...(datePublished ? { datePublished: normalizeSchemaDate(datePublished) } : {}),
    ...(dateModified ? { dateModified: normalizeSchemaDate(dateModified) } : {}),
    hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'online' }],
  };
}

export function buildLessonSchema({
  name,
  description,
  lessonUrl,
  courseName,
  courseUrl,
  dateModified,
}: {
  name: string;
  description: string;
  lessonUrl: string;
  courseName: string;
  courseUrl: string;
  dateModified?: string;
}) {
  return {
    '@type': 'LearningResource',
    '@id': `${lessonUrl}#lesson`,
    name,
    description,
    url: lessonUrl,
    learningResourceType: 'Lesson',
    author: PERSON,
    inLanguage: language,
    ...(dateModified ? { dateModified: normalizeSchemaDate(dateModified) } : {}),
    isPartOf: {
      '@type': 'Course',
      '@id': `${courseUrl}#course`,
      name: courseName,
      url: courseUrl,
    },
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
