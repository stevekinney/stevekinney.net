---
title: toBeInstanceOf in Vitest
description: Using toBeInstanceOf to verify object instances in tests.
modified: 2024-09-28T12:52:10-06:00
---

So let's chat about `toBeInstanceOf`. Imagine you're trying to figure out if a certain object is of a specific class or type. You might have a custom class or constructor function, and you're just trying to ensure that the object you got is, in fact, an instance of that particular class.

Vitest’s `toBeInstanceOf` matcher is your friend here. It allows you to check whether an object is an instance of a constructor (function or class). So, if you've got some fancy Artist class with properties like `name` and `genre`, `toBeInstanceOf` can step in and help verify that something is, in fact, an instance of the artist.

## When Would You Use It?

This really comes into play when you're dealing with objects created from classes or constructors. So, if you're working with classes in your codebase (which I know you love to do at 2 a.m. after a day of meetings), and you want to ensure that some code is doing the right thing by returning an object of the correct type, `toBeInstanceOf` is there for you.

Typically, you'd drop this matcher into your tests when you’re trying to enforce that certain objects, returned by functions or created within your app, are what you're expecting.

## Example

Let’s stick with that music library idea. Say we have an `Artist` class for representing your favorite bands, like Green Day. Now, if a function is supposed to return an instance of `Artist`, you'd want to make sure that it's not giving you some random object or, worse, `null` (oh no, the dreaded null!). Here’s how you’d check that with `toBeInstanceOf`.

```javascript
class Artist {
	constructor(name) {
		this.name = name;
	}
}

function createArtist(name) {
	return new Artist(name);
}

test('creates an instance of Artist', () => {
	const artist = createArtist('Green Day');
	expect(artist).toBeInstanceOf(Artist);
});
```

In this example, we’ve got an `Artist` class and a `createArtist` function that returns a new instance of it. We’re using `toBeInstanceOf` to make sure that whatever `createArtist` spits out when handed the string `'Green Day'` actually *is* an instance of `Artist`.

If `createArtist` started returning something wild like an empty object `{}`, this test would fail because that’s not an instance of `Artist`. It helps you catch those weird bugs before they escape into the wild and end up on your production servers.

## Wrap-Up

Long story short: `toBeInstanceOf` helps you check if something is created from the correct constructor. Use it anytime you’re dealing with objects made from classes or constructors, and you want to guarantee they're correctly instantiated.
