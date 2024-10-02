---
title: toBeTruthy in Vitest
description: Learn how to use the.toBeTruthy() matcher in Vitest testing.
modified: 2024-09-28T12:52:57-06:00
---

Let’s talk about `toBeTruthy`. The `.toBeTruthy()` matcher is a pretty straightforward tool in your testing toolbox. You’ll want to bust this one out when you need to confirm that *something* evaluates to `true` in a "truthy" way. Now, let's pause for a sec and define "truthy" here.

In JavaScript, "truthy" values are things that aren't `false`, `0`, `null`, `undefined`, `NaN`, or an empty string (`""`). Basically, it's testing if something has a value that JavaScript considers "truthy." It doesn’t care if the value is strictly `true`, just *something* that isn't "falsy."

You’d use `.toBeTruthy()` when the actual value doesn’t need to exactly be `true`, but it needs to be something that can stand in for `true`.

## When to Use it

Use `.toBeTruthy()` when you want to check if a value's existence or result is meaningful enough for JavaScript to consider it as "truthy." Maybe you’re testing some user input or a variable that shouldn't be empty but doesn’t need to be the literal boolean `true`.

## Example

Let’s say in our glorious and completely over-engineered music library, we’re checking if an artist has a name (because unnamed artists are bad UI, right?). We’re not here to validate the exact name, we’re just verifying that something truthy exists. That’s where `.toBeTruthy()` shines.

```javascript
// Suppose we've got a simple function to fetch an artist:
function getArtistName(artist) {
	return artist.name; // artist might be an object or might not
}

it('checks if the artist name exists', () => {
	const artist = { name: 'Green Day' }; // An actual band, booyah!

	expect(getArtistName(artist)).toBeTruthy();
});

it('fails to find an artist name', () => {
	const artistWithoutAName = { name: '' }; // Empty string—nope.

	expect(getArtistName(artistWithoutAName)).not.toBeTruthy();
});
```

## What Happens here

In the first test, `getArtistName(artist)` returns `"Green Day"`, which is a truthy value ('cause it’s a non-empty string), so the test passes.

In the second test, `getArtistName(artistWithoutAName)` returns an empty string (`""`), which is falsy. Since we’re using `.not.toBeTruthy()`, this test also passes (because there’s no name, and the expectation was something falsy).

Now you're armed and ready to call `.toBeTruthy()` whenever you're validating something lightweight, like "Does this exist?", "Is this non-null?" or "Is this just not flat-out false?" 🤘
