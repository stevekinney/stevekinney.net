---
title: toSatisfy in Vitest
description: "Learn how to use Vitest's toSatisfy matcher with custom logic."
modified: 2024-09-28T12:54:53-06:00
---

So let’s talk about `toSatisfy`. This matcher, my friend, is kind of a wildcard—it lets you write your own custom logic to say whether a value matches what you're expecting. It's like Vitest saying, "Listen, I usually have an opinion on whether something passes, but right now, that's all you."

## What It Does

`toSatisfy` confirms that your value meets a condition defined by a function **you provide**. Vitest will pass the actual value into your custom function, and whatever that function returns (`true` or `false`) determines whether the test passes.

## When Would You Use It?

You'd pull out `toSatisfy` when none of the built-in matchers quite do the job. Maybe you want to do something more complex than `toBe`, `toContain`, or one of the standard matchers. If that’s the case, `toSatisfy` lets you define your own logic.

In real-world terms—imagine you’re testing that an album title contains at least one uppercase letter **and** one number (hey, I don’t know what kind of weird Green Day spinoff app you’re building, but I’m here for it). None of the usual matchers will handle this perfectly, but `toSatisfy` will let you define that special sauce.

## Example of `toSatisfy`

Let’s say we have a `Song` object. We want to verify that the song’s title is sufficiently rebellious: it must be at least 5 characters long and contain no lame punctuation like exclamation marks (a Green Day song title is loud *because of the music*, not gimmicky punctuation!).

```javascript
import { describe, it, expect } from 'vitest';

// Example naive Song object
const song = {
	title: 'Basket Case',
	artist: 'Green Day',
	album: 'Dookie',
};

describe('Song Title Tests', () => {
	it('should have a rebellious song title', () => {
		expect(song.title).toSatisfy((title) => {
			return title.length > 5 && !title.includes('!');
		});
	});
});
```

## What’s Happening Here?

- The song title (`'Basket Case'`) gets passed into our custom matcher function.
- The function checks that the title has more than 5 characters **and** does not contain an exclamation mark.

If both conditions are true, `toSatisfy` will return `true` and the test passes. If the song title contained an exclamation mark, or was too short, the test would crash and burn faster than a disorganized punk rock tour.

## Why Is This Cool?

Because **you** get to decide what "satisfy" means. No need to struggle with convoluted combinations of built-in methods. Just write a quick custom function, and you're off to the races.

Now, don’t go crazy throwing `toSatisfy` on everything—you still want readable tests! But when you need some custom logic, it’s a solid tool to make your tests as punk rock as your code.
