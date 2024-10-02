---
title: expect.addSnapshotSerializer in Vitest
description: Learn how to use expect.addSnapshotSerializer to simplify snapshots.
modified: 2024-09-28T12:50:54-06:00
---

Okay, so here’s the deal: **expect.addSnapshotSerializer** is one of those nifty Vitest methods that helps when your snapshots—those “store a reference to what the output should look like” things—get a little too wild or verbose. Think of it as a way to declutter, clean up, or modify how stuff shows up in your snapshot tests.

## What Does it Do?

**expect.addSnapshotSerializer** lets you **define** *how* your data appears in the snapshot file. Sometimes you have objects with tons of properties, but maybe you’re only concerned about a few of them when you capture a snapshot. Or maybe you want to make that object a little easier to read. Instead of dealing with massive, unreadable blobs, this method allows you to implement a serializer that transforms the output to match your preferences.

## When Would I Use It?

You’ll want to use this either:

1. When your snapshot output is too noisy and you only care about some key details.
2. When you're dealing with nested objects, dates, or something like file paths that change depending on the environment, and you want to clean that junk up in your snapshots.
3. Anytime you want more readable, maintainable snapshot files.

A serializer will take your object, do some magic to simplify it, and then store that in the snapshot file. Much better than having to sift through hundreds of lines of unnecessary data, right?

## Example

Say we’re building out a little music library app (because who doesn’t love music?). Imagine we’ve got an object representing a song in a band’s catalog. We might get something like this:

```javascript
const song = {
	id: 'abc123',
	title: 'Welcome to Paradise',
	artist: 'Green Day',
	album: 'Dookie',
	likes: '2910132',
	createdAt: new Date(),
};
```

But for snapshot tests, we want something **cleaner**. Maybe we’re only caring about the title, artist, and album. So let’s write a custom snapshot serializer!

```javascript
expect.addSnapshotSerializer({
	test: (val) => val && val.artist === 'Green Day', // Only serialize Green Day songs
	print: (val) => `Song: ${val.title} by ${val.artist} from the album ${val.album}`,
});
```

Now, instead of the entire object with all the fields and that pesky `createdAt` date flying around, your snapshot will look like this:

```plaintext
Song: Welcome to Paradise by Green Day from the album Dookie
```

Much cleaner, right? You can now focus on the important stuff instead of the clutter. This comes in handy when you’re doing **snapshot tests** and don’t want extra noise in your test files.

## Wrapping up

So, **expect.addSnapshotSerializer** is your pal when you want to tailor your snapshot tests, remove extraneous stuff you don’t care about, or make complicated output easier to work with. If you’ve ever squinted at a huge snapshot file and thought, “Do I really need all this?”—now you know how to clean it up.

Give it a whirl next time you’re building your sweet Vitest tests!
