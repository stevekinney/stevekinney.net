---
title: Using toBe and toEqual for Strict Equality
description: Learn the difference between toBe and toEqual in Vitest testing.
modified: 2024-09-29T15:44:49-06:00
---

Most of us have been living in the "everything should be immutable" world long enough to know that there is a difference between comparing objects by reference and comparing it with object that *looks* the same in terms of its value, but has a difference reference in memory.

## toBe

So far, we're only used `.toBe`, which checks for strict equality (e.g. `===` or `Object.is`).

This works like we expect for simple types:

```ts
test('strings should be strictly equal', () => {
	expect('string').toBe('string');
});

test('numbers should be strictly equal', () => {
	expect(2).toBe(2);
});

test('booleans should be strictly equal', () => {
	expect(true).toBe(true);

	expect(false).toBe(false);
});

test('undefined should be strictly equal to itself', () => {
	expect(undefined).toBe(undefined);
});

test('null should be strictly equal to itself', () => {
	expect(null).toBe(null);
});

test('BigInts should be strickly equal', () => {
	expect(BigInt(Number.MAX_SAFE_INTEGER)).toBe(BigInt(Number.MAX_SAFE_INTEGER));
});
```

But, things get a little trickier when comparing objects (arrays *and* functions are objects in JavaScript).

```ts
describe('toBe', () => {
	test.fails('objects should not be strictly equal', () => {
		expect({ a: 1 }).toBe({ a: 1 });
	});

	test.fails('arrays should be strictly equal', () => {
		expect([1, 2, 3]).toBe([1, 2, 3]);
	});

	test.fails('functions should to be strictly equal', () => {
		expect(() => {}).toBe(() => {});
	});
});
```

## toEqual

Consider this function:

```javascript
export const generateFibonacci = (n) => {
	const sequence = [0, 1];

	for (let i = 2; i < n; i++) {
		sequence[i] = sequence[i - 1] + sequence[i - 2];
	}

	return sequence;
};
```

This seems like something I'd like to test, right? Here is the issue, this otherwise wonderful test will blow up in my face.

```javascript
it('should generate fibonacci sequence', () => {
	const fibonacci = generateFibonacci(10);
	expect(fibonacci).toBe([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
});
```

And like, Vitest knows that they serialize to the same thing. But it's forcing us to be more specific. Instead, when we're comparing two objects that are not referentially equal, we can use `toEqual`. I'm just going to [quote the documentation](https://vitest.dev/api/expect.html#toequal) for a hot minute:

> \[!NOTE] Naming Things is Hard
> `toEqual` asserts if actual value is equal to received one or has the same structure, if it is an object (compares them recursively).

Let's look at another example:

```ts
describe('toEqual', () => {
	test('similar objects should pass with #toEqual', () => {
		expect({ a: 1 }).toEqual({ a: 1 });
	});

	test('similar nested objects should pass with #toEqual', () => {
		expect({ a: 1, b: { c: 2 } }).toEqual({ a: 1, b: { c: 2 } });
	});

	test('similar arrays should pass with #toEqual', () => {
		expect([1, 2, 3]).toEqual([1, 2, 3]);
	});

	test('similar multi-dimensional arrays should pass with #toEqual', () => {
		expect([1, [2, 3]]).toEqual([1, [2, 3]]);
	});

	test('functions should to be strictly equal if compared by reference', () => {
		const fn = () => {};
		expect(fn).toBe(fn);
	});
});
```

## toEqual vs. toStrictEqual

`toStrictEqual` is a little bit more… strict.

- `{ a: 1, b: undefined }` and `{ a: 1 }` are equal but not *strictly* equal.
- A object literal and a class instance with the exact same properties are also not strictly equal.

Here are some tests that you can review that might help clarify the difference. You can also play around with these tests in `examples/strictly-speaking/strictly-speaking.test.js`.

```javascript
class Person {
	constructor(name) {
		this.name = name;
	}
}

test('objects with the same properties are equal', () => {
	expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
});

test('objects with different properties are not equal', () => {
	expect({ a: 1, b: 2 }).not.toEqual({ a: 1, b: 3 });
});

test('objects with undefined properties are equal to objects without those properties', () => {
	expect({ a: 1 }).toEqual({ a: 1, b: undefined });
});

test('objects with undefined properties are *not* strictly equal to objects without those properties', () => {
	expect({ a: 1 }).not.toStrictEqual({ a: 1, b: undefined });
});

test('instances are equal to object literals with the same properties', () => {
	expect(new Person('Alice')).toEqual({ name: 'Alice' });
});

test('instances are not strictly equal to object literals with the same properties', () => {
	expect(new Person('Alice')).not.toStrictEqual({ name: 'Alice' });
});
```

## Further Reading

Here are some assertions that you *may* want to consider:

- [`toBe`](https://vitest.dev/api/expect.html#tobe)
- [`toBeCloseTo`](https://vitest.dev/api/expect.html#tobecloseto)
- [`toBeInstanceOf`](https://vitest.dev/api/expect.html#tobeinstanceof)
- [`toBeUndefined`](https://vitest.dev/api/expect.html#tobeundefined)
- [`toContain`](https://vitest.dev/api/expect.html#tocontain)
- [`toThrow`](https://vitest.dev/api/expect.html#tothrow)
- [`toThrowError`](https://vitest.dev/api/expect.html#tothrowerror)

You can see the full API for `expect` here:

- [Vitest's Expect API](https://vitest.dev/api/expect.html).
- [Jest's Expect API](https://jestjs.io/docs/expect)
