---
title: toBeGreaterThanOrEqual in Vitest
description: Learn how to use toBeGreaterThanOrEqual for value comparisons.
modified: 2024-09-28T12:52:06-06:00
---

Ah, one of my favorites—you gotta love that subtle power in comparisons. `toBeGreaterThanOrEqual` is exactly what it sounds like. It's one of those methods you whip out when you need to check that a value is **greater than or equal** to something else. Think of it as a gentle way of saying "Hey, this number? It better be at least *this* big—or even bigger. I don't care, just don't dip below."

So when would you use it? Maybe you need to confirm that an album's runtime is at least a certain length before you'd consider it a potential time-travel device. Or maybe Green Day just dropped a new song and you need to ensure that **at least** 10 people have listened to it to consider it a "hit." When doing these kinds of sanity checks in your app, `toBeGreaterThanOrEqual` has your back.

## Example

Let's say we're in our mock music library app, and we need to test that a song meets a minimum duration requirement—because no one wants a freakishly short Green Day song, right? In our app, the duration is in seconds, so anything shorter than 30 seconds is suspect.

```javascript
const song = { title: 'Boulevard of Broken Dreams', duration: 181 };

test('should have a duration of at least 30 seconds', () => {
	expect(song.duration).toBeGreaterThanOrEqual(30);
});
```

Here, we’re checking that "Boulevard of Broken Dreams" has at least a 30-second runtime. With a runtime of 181 seconds, it passes! 🎉
