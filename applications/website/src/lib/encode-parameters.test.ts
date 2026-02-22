import { describe, expect, it } from 'vitest';
import { encodeParameters } from './encode-parameters';

describe('encodeParameters', () => {
  it('should return an empty string for empty input', () => {
    expect(encodeParameters({})).toBe('');
  });

  it('should encode simple key-value pairs', () => {
    const params = { name: 'John', age: '30' };
    expect(encodeParameters(params)).toBe('name=John&age=30');
  });

  it('should handle spaces in values', () => {
    const params = { query: 'hello world' };
    expect(encodeParameters(params)).toBe('query=hello+world');
  });

  it('should handle special characters in values', () => {
    const params = { filter: 'price>100&available=true' };
    const result = encodeParameters(params);
    // Using URLSearchParams uses standard URL encoding rules
    expect(result).toContain('price%3E100'); // '>' becomes %3E
    expect(result).toContain('available%3Dtrue'); // '=' becomes %3D
  });

  it('should handle non-ASCII characters', () => {
    const params = { name: '日本語' };
    const result = encodeParameters(params);
    expect(result).toBe('name=%E6%97%A5%E6%9C%AC%E8%AA%9E');
  });

  it('should handle special characters in keys', () => {
    const params = { 'user-name': 'test-user', 'email@domain': 'user@example.com' };
    expect(encodeParameters(params)).toBe('user-name=test-user&email%40domain=user%40example.com');
  });

  it('should handle number values', () => {
    const params = { age: 30, price: 19.99 };
    expect(encodeParameters(params)).toBe('age=30&price=19.99');
  });

  it('should handle boolean values', () => {
    const params = { active: true, disabled: false };
    expect(encodeParameters(params)).toBe('active=true&disabled=false');
  });

  it('should handle array values', () => {
    const params = { tags: ['javascript', 'typescript', 'svelte'] };
    expect(encodeParameters(params)).toBe('tags=javascript&tags=typescript&tags=svelte');
  });

  it('should handle mixed array values', () => {
    const params = { values: [1, true, 'text'] };
    expect(encodeParameters(params)).toBe('values=1&values=true&values=text');
  });

  it('should handle empty arrays', () => {
    const params = { tags: [] };
    expect(encodeParameters(params)).toBe('');
  });

  it('should handle multiple arrays', () => {
    const params = {
      categories: ['books', 'movies'],
      ratings: [4, 5],
    };

    const result = encodeParameters(params);
    expect(result).toContain('categories=books');
    expect(result).toContain('categories=movies');
    expect(result).toContain('ratings=4');
    expect(result).toContain('ratings=5');
  });

  it('should handle null or undefined values', () => {
    const params = { nullValue: null, undefinedValue: undefined, validValue: 'test' };
    expect(encodeParameters(params)).toBe(
      'nullValue=null&undefinedValue=undefined&validValue=test',
    );
  });

  it('should handle complex nested objects correctly', () => {
    const params = { object: { foo: 'bar' } };
    expect(encodeParameters(params)).toBe('object=%5Bobject+Object%5D');
  });

  it('should handle very long string values', () => {
    const longString = 'a'.repeat(2000);
    const params = { long: longString };
    expect(encodeParameters(params)).toContain('long=');
    expect(encodeParameters(params).length).toBeGreaterThan(2000);
  });

  it('should handle special numeric values', () => {
    const params = { nan: NaN, infinity: Infinity, negInfinity: -Infinity };
    expect(encodeParameters(params)).toBe('nan=NaN&infinity=Infinity&negInfinity=-Infinity');
  });

  it('should handle empty string values', () => {
    const params = { empty: '' };
    expect(encodeParameters(params)).toBe('empty=');
  });

  it('should handle array with empty or null values', () => {
    const params = { items: ['one', '', null, undefined] };

    const result = encodeParameters(params);
    expect(result).toContain('items=one');
    expect(result).toContain('items=');
    expect(result).toContain('items=null');
    expect(result).toContain('items=undefined');
  });
});
