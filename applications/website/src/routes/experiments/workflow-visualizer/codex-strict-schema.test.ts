import { describe, expect, it } from 'vitest';

import { stripIntroducedNulls, toStrictSchema } from './codex-runtime.js';

describe('toStrictSchema', () => {
  it('leaves a schema that is already strict unchanged', () => {
    const schema = {
      type: 'object',
      description: 'A verdict',
      properties: {
        real: { type: 'boolean' },
        reason: { type: ['string', 'null'] },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
            additionalProperties: false,
          },
          minItems: 1,
        },
      },
      required: ['real', 'reason', 'tags'],
      additionalProperties: false,
    };
    const copy = structuredClone(schema);

    const result = toStrictSchema(schema);

    expect(result.schema).toEqual(schema);
    expect(result.nullablePaths).toEqual([]);
    expect(result.droppedKeywords).toEqual([]);
    expect(result.rewrites).toEqual([]);
    expect(schema).toEqual(copy);
  });

  it('closes every object, requires every property, and makes optional ones nullable', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        base: { type: 'string' },
        count: { type: 'integer', minimum: 0 },
      },
      required: ['files'],
    });

    expect(result.schema).toEqual({
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        base: { type: ['string', 'null'] },
        count: { type: ['integer', 'null'], minimum: 0 },
      },
      required: ['files', 'base', 'count'],
      additionalProperties: false,
    });
    expect(result.nullablePaths).toEqual(['base', 'count']);
  });

  it('handles nested optional objects and arrays of objects', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              line: { type: 'integer' },
              suggestion: { type: 'string' },
              location: {
                type: 'object',
                properties: { file: { type: 'string' }, column: { type: 'integer' } },
                required: ['file'],
              },
            },
            required: ['line'],
          },
        },
      },
    });

    expect(result.nullablePaths).toEqual([
      'findings',
      'findings[].suggestion',
      'findings[].location',
      'findings[].location.column',
    ]);
    expect(result.schema).toEqual({
      type: 'object',
      properties: {
        findings: {
          anyOf: [
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  line: { type: 'integer' },
                  suggestion: { type: ['string', 'null'] },
                  location: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          file: { type: 'string' },
                          column: { type: ['integer', 'null'] },
                        },
                        required: ['file', 'column'],
                        additionalProperties: false,
                      },
                      { type: 'null' },
                    ],
                  },
                },
                required: ['line', 'suggestion', 'location'],
                additionalProperties: false,
              },
            },
            { type: 'null' },
          ],
        },
      },
      required: ['findings'],
      additionalProperties: false,
    });
  });

  it('makes an optional enum nullable through anyOf', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['high', 'low'] },
        kind: { const: 'finding' },
      },
    });

    expect(result.schema['properties']).toEqual({
      severity: { anyOf: [{ type: 'string', enum: ['high', 'low'] }, { type: 'null' }] },
      kind: { anyOf: [{ const: 'finding' }, { type: 'null' }] },
    });
  });

  it('converts anyOf members and extends an optional anyOf with null', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        target: {
          anyOf: [{ type: 'string' }, { type: 'object', properties: { path: { type: 'string' } } }],
        },
      },
      required: [],
    });

    expect(result.schema['properties']).toEqual({
      target: {
        anyOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: { path: { type: ['string', 'null'] } },
            required: ['path'],
            additionalProperties: false,
          },
          { type: 'null' },
        ],
      },
    });
    expect(result.nullablePaths).toEqual(['target', 'target.path']);
  });

  it('leaves an optional property that already allows null alone', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        note: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        flag: { type: 'boolean', enum: [true, null] },
      },
    });

    expect(result.nullablePaths).toEqual([]);
    expect(result.schema['required']).toEqual(['note', 'flag']);
  });

  it('drops keywords strict mode rejects and reports where', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 40, format: 'email' },
        url: { type: 'string', format: 'uri' },
        extra: {
          type: 'object',
          properties: { a: { type: 'string' } },
          patternProperties: { '^x-': { type: 'string' } },
          dependentRequired: { a: ['b'] },
        },
      },
      required: ['name', 'url', 'extra'],
      allOf: [{ required: ['name'] }],
      not: { required: ['other'] },
      if: { properties: { name: { const: 'x' } } },
      then: { required: ['url'] },
      else: { required: [] },
    });

    expect(result.droppedKeywords).toEqual([
      { path: 'name', keyword: 'minLength' },
      { path: 'name', keyword: 'maxLength' },
      { path: 'url', keyword: 'format: uri' },
      { path: 'extra', keyword: 'patternProperties' },
      { path: 'extra', keyword: 'dependentRequired' },
      { path: '', keyword: 'allOf' },
      { path: '', keyword: 'not' },
      { path: '', keyword: 'if' },
      { path: '', keyword: 'then' },
      { path: '', keyword: 'else' },
    ]);
    expect(result.schema['properties']).toMatchObject({
      name: { type: 'string', format: 'email' },
      url: { type: 'string' },
    });
    expect(Object.keys(result.schema)).toEqual([
      'type',
      'properties',
      'required',
      'additionalProperties',
    ]);
  });

  it('turns oneOf into anyOf and closes open additionalProperties, saying so', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        labels: { type: 'object', additionalProperties: { type: 'string' } },
      },
      required: ['value', 'labels'],
      additionalProperties: true,
    });

    expect(result.schema['properties']).toEqual({
      value: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      labels: { type: 'object', properties: {}, required: [], additionalProperties: false },
    });
    expect(result.rewrites).toEqual([
      {
        path: '',
        message: '`additionalProperties` became `false`, so the model can’t add other keys',
      },
      {
        path: 'value',
        message: '`oneOf` became `anyOf`, so a value may match more than one choice',
      },
      {
        path: 'labels',
        message: 'an object with no `properties` can only be empty in strict mode',
      },
      {
        path: 'labels',
        message: '`additionalProperties` became `false`, so the model can’t add other keys',
      },
    ]);
  });

  it('converts $defs and wraps an optional $ref in anyOf', () => {
    const result = toStrictSchema({
      type: 'object',
      properties: { owner: { $ref: '#/$defs/person' } },
      $defs: {
        person: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: 'string' } },
          required: ['name'],
        },
      },
    });

    expect(result.schema).toEqual({
      type: 'object',
      properties: { owner: { anyOf: [{ $ref: '#/$defs/person' }, { type: 'null' }] } },
      $defs: {
        person: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: ['string', 'null'] } },
          required: ['name', 'email'],
          additionalProperties: false,
        },
      },
      required: ['owner'],
      additionalProperties: false,
    });
    expect(result.nullablePaths).toEqual(['owner', '$defs.person.email']);
  });
});

describe('stripIntroducedNulls', () => {
  const schema = {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            line: { type: 'integer' },
            suggestion: { type: 'string' },
            note: { type: ['string', 'null'] },
          },
          required: ['line'],
        },
      },
      base: { type: 'string' },
      owner: { $ref: '#/$defs/person' },
    },
    required: ['findings', 'owner'],
    $defs: {
      person: { type: 'object', properties: { email: { type: 'string' } } },
    },
  };

  it('removes nulls at formerly optional paths, through arrays and references', () => {
    expect(
      stripIntroducedNulls(
        {
          findings: [
            { line: 1, suggestion: null, note: null },
            { line: 2, suggestion: 'Use const.', note: 'ok' },
          ],
          base: null,
          owner: { email: null },
        },
        schema,
      ),
    ).toEqual({
      findings: [
        { line: 1, note: null },
        { line: 2, suggestion: 'Use const.', note: 'ok' },
      ],
      owner: {},
    });
  });

  it('keeps a null at a required property, so validation can reject it', () => {
    expect(stripIntroducedNulls({ findings: null, owner: null }, schema)).toEqual({
      findings: null,
      owner: null,
    });
  });

  it('follows anyOf members to find the property', () => {
    const union = {
      type: 'object',
      properties: {
        target: {
          anyOf: [{ type: 'string' }, { type: 'object', properties: { path: { type: 'string' } } }],
        },
      },
    };

    expect(stripIntroducedNulls({ target: { path: null } }, union)).toEqual({ target: {} });
    expect(stripIntroducedNulls({ target: null }, union)).toEqual({});
  });
});
