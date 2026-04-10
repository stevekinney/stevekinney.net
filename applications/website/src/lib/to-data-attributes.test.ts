import { describe, expect, test } from 'vitest';
import { toDataAttributes } from './to-data-attributes';

describe('toDataAttributes', () => {
  test('should convert object to data attributes', () => {
    const props = {
      foo: 'bar',
      baz: 'qux',
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      'data-foo': 'bar',
      'data-baz': 'qux',
    });
  });

  test('should convert object to data attributes with numbers', () => {
    const props = {
      foo: 1,
      baz: 2,
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      'data-foo': '1',
      'data-baz': '2',
    });
  });

  test('should convert object to data attributes with boolean values', () => {
    const props = {
      isActive: true,
      isDisabled: false,
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      'data-isActive': 'true',
      'data-isDisabled': 'false',
    });
  });

  test('should omit null and undefined values', () => {
    const props = {
      foo: null,
      baz: undefined,
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({});
  });

  test('should not convert class and style props', () => {
    const props = {
      class: 'foo',
      style: { color: 'red' },
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      class: 'foo',
      style: { color: 'red' },
    });
  });

  test('should omit data props', () => {
    const props = {
      data: { foo: 'bar' },
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({});
  });

  test('should handle empty objects', () => {
    const props = {};
    const result = toDataAttributes(props);
    expect(result).toEqual({});
  });

  test('should handle mixed property types', () => {
    const props = {
      text: 'hello',
      count: 42,
      enabled: true,
      class: 'my-class',
      style: { margin: '10px' },
      data: { ignored: true },
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      'data-text': 'hello',
      'data-count': '42',
      'data-enabled': 'true',
      class: 'my-class',
      style: { margin: '10px' },
    });
  });

  test('should handle keys with special characters or prefixes', () => {
    const props = {
      'data-test': 'shouldHaveDoublePrefix',
      'special-key': 'value',
      camelCase: 'value',
    };

    const result = toDataAttributes(props);

    expect(result).toEqual({
      'data-data-test': 'shouldHaveDoublePrefix',
      'data-special-key': 'value',
      'data-camelCase': 'value',
    });
  });
});
