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
});
