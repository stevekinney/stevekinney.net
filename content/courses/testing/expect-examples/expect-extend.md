---
title: expect.extend in Vitest
description: Learn how to use expect.extend to create custom matchers in Vitest.
modified: 2024-09-28T12:51:16-06:00
---

Let's talk about something *pretty neat* in Vitest: `expect.extend`. This is like giving yourself superpowers when it comes to assertions. Most folks are used to using the built-in matchers like `toBe`, `toEqual`, and `toHaveBeenCalledWith`—and, believe me, those are fantastic! But sometimes you want an assertion method that’s a little more *specific* to your domain, like, I don't know, checking if a band has released at least one multi-platinum album, and `toBe` just isn't going to cut it. That’s where `expect.extend` shines. It lets you write **custom matchers** tailored to your specific problem space.

## When Would You Use It?

You’d use `expect.extend` when you find yourself writing the same custom assertion logic in multiple test cases, or when the built-in matchers don’t quite express what you’re trying to test. It's about making your life easier when you're asserting things that are unique to your app (or music library, *wink*).

For instance, let’s say you've got this hypothetical music library app we keep talking about. You might want a matcher like `toBeLegendaryArtist`, which passes if an artist (like Green Day) has released more than 5 albums. Sure, you could write that test logic inline for each `expect`, but why not define it *once* and make your test assertions way more readable?

## How Does it Work?

You pass an object to `expect.extend` where each property is the name of a custom matcher you want to define—along with the function that defines how it works.

Here's an example where we build a custom matcher to check if an artist has released more than 5 albums.

## Example

```javascript
// Let's extend Vitest with a custom matcher
expect.extend({
	toBeLegendaryArtist(received) {
		const pass = received.albums.length > 5;
		if (pass) {
			return {
				message: () => `Expected ${received.name} to not be a legendary artist 😱`,
				pass: true,
			};
		}
		return {
			message: () => `Expected ${received.name} to be a legendary artist 🤨`,
			pass: false,
		};
	},
});

// Example artist data
const greenDay = {
	name: 'Green Day',
	albums: ['Dookie', 'Insomniac', 'Nimrod', 'Warning', 'American Idiot', '21st Century Breakdown'],
};

const nickleback = {
	name: 'Nickleback',
	albums: ['Silver Side Up', 'The Long Road', 'All the Right Reasons'],
};

// Example test using the custom matcher
test('checks if Green Day is a legendary artist', () => {
	expect(greenDay).toBeLegendaryArtist();
});

test('checks if Nickleback is a legendary artist', () => {
	expect(nickleback).not.toBeLegendaryArtist();
});
```

## What’s Happening Here?

We created a custom matcher, `toBeLegendaryArtist`. The function inside checks whether the artist has more than 5 albums. If they do, great, you’re a legendary artist. If not… well, sorry.

Now, instead of needing to write `expect(artist.albums.length).toBeGreaterThan(5)` every time, you can just say `expect(artist).toBeLegendaryArtist()` or its `not` form—*and* you get a nice, customized error message.

## When to Use Custom Matchers?

When you find yourself writing the same messy, domain-specific logic across multiple test files, a custom matcher is a great way to clean that up. Think of them like helper functions but for your `expect` statements. And let's be real, anything that makes tests more readable is a win in my book.
