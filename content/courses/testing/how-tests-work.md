---
title: How Tests Work
description: Explore techniques to ensure tests fail when expected.
modified: '2025-07-29T15:09:56-06:00'
date: '2024-10-02T08:49:23-05:00'
---

> \[!TIP] Steve's First Rule of Testing
> Your tests don't pass because your code works. Your tests pass because code doesn't _not_ work.

A test passes for one reason: **Because it didn't fail**.

These seems banal, but it'll be important later, so I'm going to say it again and again: There is _no such thing_ as a passing test. There are _only_ tests that didn't fail. It's a subtle but important distinction.

This is one of the big reasons why people will try to tell you on [Test Driver Development](test-driven-development.md). The basic premise is that if can start out with a failing test and then make it pass then you can be _pretty confident_ that you don't have a false positive on your hands.

If we think about how a test suite works, it's something that runs your code and keeps track of the times where an error was thrown. An `expect` that didn't get what it expects throws an error, which fails your test. If your test passes, it's not because there is something inherently correct about your code. There just isn't anything inherently _wrong_.

This test will obviously fail.

```javascript
it('should fail', () => {
  expect(true).toBe(false);
});
```

Interestingly, this test will _also_ fail.

```javascript
it('should fail', () => {
  throw new Error('Throwing is failing.');
});
```

At the same time, this test will pass.

```javascript
it('should pass', () => {
  const four = 2 + 2;
  console.log(four);
});
```

What we can summise—outside of the fact that I spelled it ou in that second test there is that a test fails when an error is thrown. This means that if we got _really_ board, we _could_ write our own super naïve version of `expect` that is missing a lot of the niceities of the one provided by Vitest or Jest or whatever.

```javascript
const expect = (a) => {
  return {
    toBe(b) {
      if (a !== b) {
        throw new Error(`Expected: ${a}, but got ${b}`);
      }
    },
  };
};
```

Luckily, we don't need to do that. Almost every test runner under the sun comes with either an assertion or expectation libary. And the only one that I can think of, [Mocha](https://mochajs.org/), has a sibling, [Chai](https://www.chaijs.com/). Given their names, one is left to assume that they're intended to be used together.

In fact, Vitest's assertion library _is_ Chai as you can see [here](https://github.com/vitest-dev/vitest/blob/1800167e4608327f335bc136f41543403486cfef/packages/vitest/package.json#L160).

## Insist that a Test Fails

I don't ever use this one, but I'm sure it's there for a reason and maybe it'll be useful for you. You can explicitly call out that you want a test to fail.

```javascript
test.fails('works with "test" as well', () => {
  expect(true).toBe(false);
});
```

If you want me to provide a rationale for why and when you'd use this, here's the best that I have for you. Your tests will pass for **one reason**: _None of your assertions failed_. This is by design, so there is no use complaining about it.

There is a catch of course; did your test pass because:

- all of your assertions passed,
- or because _none_ of them failed?

All a test runner _really_ does is run your code and keep track of every time an error is thrown. A failing test throws an error. So, the logic stands that if no error was thrown, then the test passed.

## Some Additional Nuances

This seems pretty straight-forward until we remember the one thing—aside from the DOM—that makes _everything_ in JavaScript hard: **asynchrony**. This is particularly insidious with asynchronous code.

```javascript
it('it will pass, unfortunately', () => {
  setTimeout(() => {
    expect('This should fail.').toBe('Totally not the same.');
  }, 1000);
});
```

It doesn't fail because asynchronous code is hard. But, if we annotate with the specific expectation that it fails, we can _at least_ get some feedback.

```javascript
test.fails('works with "test" as well', () => {
  setTimeout(() => {
    expect('This should fail.').toBe('Totally not the same.');
  }, 1000);
});
```

We'll talk more about this in the section on [testing asynchronous code](testing-asynchronous-code.md), but if your code returns a promise, then Vitest will wait for that promise to resolve.

```ts
test('works with "test" as well', () => {
  return new Promise((done) => {
    setTimeout(() => {
      expect('This should fail.').not.toBe('Totally not the same.');

      done(null);
    }, 500);
  });
});
```

## Expect Expectation

If you _really_ want to make sure that your tests aren't just passing because they're not failing, you can expect that there should be one or more assertions in your test.

```ts
expect.hasAssertions();
```

Alternatively, you can expect a given number of assertions.

```ts
expect.assertions(1);
```

This will come in handy when we talk about [testing asynchronous code](testing-asynchronous-code.md), but first let's dig a little bit deeper in [Beyond Strict Equality](beyond-strict-equality.md).
