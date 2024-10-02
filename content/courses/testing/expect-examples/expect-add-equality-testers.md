---
title: expect.addEqualityTesters in Vitest
description: Understanding expect.addEqualityTesters in Vitest for custom comparisons.
modified: 2024-09-28T12:50:51-06:00
---

Okay, so let’s talk about **`expect.addEqualityTesters`** in Vitest, and when you might use it—though, to be honest, you've probably never had the privilege of needing it… yet.

## What Does it Do?

In testing, sometimes the default equality checks just don’t cut it. Like, if you’re comparing two objects that have some complex behavior—maybe some dynamically generated properties—Vitest’s default comparison method (`===` under the hood) might not be smart enough to see that, yeah, under the hood they really are the same thing.

**`expect.addEqualityTesters`** gives you a way to tell Vitest: “Yo, if you see two of these kinds of values, here’s how I want you to compare them.” It's a custom comparison method for specific kinds of objects or values.

## When Would You Use It?

Imagine you're writing tests for some complex object like… I don’t know… guitars in your music library application! Let’s say two guitars have the same "shape" but different serial numbers—technically they’re the same guitar model, we don’t care about the serials for our tests. Normally, Vitest’s `expect` would fail since the objects are technically not 100% equal. This is where you can tell `expect` to treat them equally based on specific properties.

Another scenario is when you just need to compare something that's **really** specific—like, I don’t know how often this happens in your life—but say you’ve got some deep recursive structure or maybe a class that doesn't play nicely with JavaScript’s default comparisons.

## Example

Here’s an example in your simple music library: Let’s say you have a custom `Song` object and you want tests to treat two `Song` objects as equal if they have the same `title` and `artist` but ignore any additional internal data like generated `id`s.

```javascript
// Let's say we have a Song class
class Song {
	constructor(title, artist, id) {
		this.title = title;
		this.artist = artist;
		this.id = id; // random ID, not important for our tests
	}
}

// Custom equality tester that ignores the 'id' field
expect.addEqualityTesters([
	(first, second) => {
		if (first instanceof Song && second instanceof Song) {
			return first.title === second.title && first.artist === second.artist;
		}
	},
]);

// Now let's test!
test('should compare songs correctly', () => {
	const song1 = new Song('Basket Case', 'Green Day', 1); // Who doesn't love this one?!
	const song2 = new Song('Basket Case', 'Green Day', 2); // Different ID, same song otherwise

	expect(song1).toEqual(song2); // Should pass because ID is ignored!
});
```

Here, we added a custom equality tester that ignores the `id` field of `Song`. Now, when we use `expect(song1).toEqual(song2)`, the comparison will pass even though `song1` and `song2` have different IDs. Instead, they’ll be considered equal because their `title` and `artist` fields match.

## Quick Note for Sanity's Sake

You should only really bust out **custom equality testers** when you *need* them. Usually, if you’re feeling like you need to write a ton of custom comparison logic, it **could** be a sign that something funky’s going on in your data or design that you’ll want to straighten out instead.
