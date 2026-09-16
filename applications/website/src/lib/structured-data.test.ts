import { describe, expect, it } from 'vitest';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildCourseSchema,
  buildPersonSchema,
  buildLessonSchema,
  serializeJsonLd,
  buildWebSiteSchema,
} from './structured-data';

describe('buildWebSiteSchema', () => {
  it('returns a WebSite type without @context', () => {
    const schema = buildWebSiteSchema();
    expect(schema['@type']).toBe('WebSite');
    expect(schema).not.toHaveProperty('@context');
  });

  it('includes name and url fields', () => {
    const schema = buildWebSiteSchema();
    expect(schema.name).toBeTruthy();
    expect(schema.url).toBeTruthy();
  });
});

describe('buildPersonSchema', () => {
  it('returns a Person type without @context', () => {
    const schema = buildPersonSchema();
    expect(schema['@type']).toBe('Person');
    expect(schema).not.toHaveProperty('@context');
  });
});

describe('buildArticleSchema', () => {
  const input = {
    title: 'Test Article',
    description: 'A test description',
    datePublished: '2024-01-01',
    articleUrl: 'https://stevekinney.com/writing/test-article',
    imageUrl: 'https://stevekinney.com/writing/test-article/open-graph.jpg',
  };

  it('returns an Article type without @context', () => {
    const schema = buildArticleSchema(input);
    expect(schema['@type']).toBe('Article');
    expect(schema).not.toHaveProperty('@context');
  });

  it('includes headline, image, datePublished, and author', () => {
    const schema = buildArticleSchema(input);
    expect(schema.headline).toBe(input.title);
    expect(schema.image).toBe(input.imageUrl);
    expect(schema.datePublished).toBe('2024-01-01T00:00:00.000Z');
    expect(schema.author).toBeTruthy();
    expect((schema.author as Record<string, unknown>)['@type']).toBe('Person');
  });

  it('includes dateModified when provided', () => {
    const schema = buildArticleSchema({ ...input, dateModified: '2024-06-01' });
    expect(schema.dateModified).toBe('2024-06-01T00:00:00.000Z');
  });

  it('omits dateModified when not provided', () => {
    const schema = buildArticleSchema(input);
    expect(schema).not.toHaveProperty('dateModified');
  });

  it('preserves an invalid source date without throwing', () => {
    const schema = buildArticleSchema({ ...input, datePublished: 'not-a-date' });
    expect(schema.datePublished).toBe('not-a-date');
  });
});

describe('buildCourseSchema', () => {
  const input = {
    name: 'Testing Course',
    description: 'Learn testing',
    courseUrl: 'https://stevekinney.com/courses/testing',
    datePublished: '2024-01-01',
    dateModified: '2024-06-01T12:00:00.000Z',
  };

  it('returns a Course type without @context', () => {
    const schema = buildCourseSchema(input);
    expect(schema['@type']).toBe('Course');
    expect(schema).not.toHaveProperty('@context');
  });

  it('includes name, description, and url', () => {
    const schema = buildCourseSchema(input);
    expect(schema.name).toBe(input.name);
    expect(schema.description).toBe(input.description);
    expect(schema.url).toBe(input.courseUrl);
  });

  it('includes identity, dates, provider, and language', () => {
    const schema = buildCourseSchema(input);
    expect(schema['@id']).toBe(`${input.courseUrl}#course`);
    expect(schema.datePublished).toBe('2024-01-01T00:00:00.000Z');
    expect(schema.dateModified).toBe(input.dateModified);
    expect(schema.inLanguage).toBe('en-US');
    expect(schema.provider).toBeTruthy();
  });

  it('includes hasCourseInstance with at least one item containing courseMode', () => {
    const schema = buildCourseSchema(input);
    expect(Array.isArray(schema.hasCourseInstance)).toBe(true);
    expect(schema.hasCourseInstance.length).toBeGreaterThan(0);
    const instance = schema.hasCourseInstance[0] as Record<string, unknown>;
    expect(instance['@type']).toBe('CourseInstance');
    expect(instance.courseMode).toBeTruthy();
  });
});

describe('buildLessonSchema', () => {
  it('describes a lesson as a LearningResource in its parent course', () => {
    const schema = buildLessonSchema({
      name: 'The Basics',
      description: 'Learn testing',
      lessonUrl: 'https://stevekinney.com/courses/testing/the-basics',
      courseName: 'Testing',
      courseUrl: 'https://stevekinney.com/courses/testing',
      dateModified: '2024-06-01T12:00:00.000Z',
    });

    expect(schema['@type']).toBe('LearningResource');
    expect(schema['@id']).toBe(`${schema.url}#lesson`);
    expect(schema.learningResourceType).toBe('Lesson');
    expect(schema.isPartOf).toEqual({
      '@type': 'Course',
      '@id': 'https://stevekinney.com/courses/testing#course',
      name: 'Testing',
      url: 'https://stevekinney.com/courses/testing',
    });
    expect(schema).not.toHaveProperty('datePublished');
    expect(schema.dateModified).toBe('2024-06-01T12:00:00.000Z');
  });
});

describe('serializeJsonLd', () => {
  it('escapes characters that can terminate an inline script', () => {
    const serialized = serializeJsonLd({ text: '</script><script>alert("x")</script>' });
    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003C/script\\u003E');
  });
});

describe('buildBreadcrumbSchema', () => {
  const items = [
    { name: 'Courses', url: 'https://stevekinney.com/courses' },
    { name: 'Testing', url: 'https://stevekinney.com/courses/testing' },
  ];

  it('returns a BreadcrumbList type without @context', () => {
    const schema = buildBreadcrumbSchema(items);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema).not.toHaveProperty('@context');
  });

  it('assigns integer position starting at 1 for each item', () => {
    const schema = buildBreadcrumbSchema(items);
    schema.itemListElement.forEach((element, index) => {
      expect(element.position).toBe(index + 1);
    });
  });

  it('maps item url to the item field', () => {
    const schema = buildBreadcrumbSchema(items);
    expect(schema.itemListElement[0].item).toBe(items[0].url);
    expect(schema.itemListElement[1].item).toBe(items[1].url);
  });
});
