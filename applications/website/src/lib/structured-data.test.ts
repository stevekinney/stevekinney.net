import { describe, expect, it } from 'vitest';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildCourseSchema,
  buildPersonSchema,
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
    expect(schema.datePublished).toBe(input.datePublished);
    expect(schema.author).toBeTruthy();
    expect((schema.author as Record<string, unknown>)['@type']).toBe('Person');
  });

  it('includes dateModified when provided', () => {
    const schema = buildArticleSchema({ ...input, dateModified: '2024-06-01' });
    expect(schema.dateModified).toBe('2024-06-01');
  });

  it('omits dateModified when not provided', () => {
    const schema = buildArticleSchema(input);
    expect(schema).not.toHaveProperty('dateModified');
  });
});

describe('buildCourseSchema', () => {
  const input = {
    name: 'Testing Course',
    description: 'Learn testing',
    courseUrl: 'https://stevekinney.com/courses/testing',
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

  it('includes hasCourseInstance with at least one item containing courseMode', () => {
    const schema = buildCourseSchema(input);
    expect(Array.isArray(schema.hasCourseInstance)).toBe(true);
    expect(schema.hasCourseInstance.length).toBeGreaterThan(0);
    const instance = schema.hasCourseInstance[0] as Record<string, unknown>;
    expect(instance['@type']).toBe('CourseInstance');
    expect(instance.courseMode).toBeTruthy();
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
