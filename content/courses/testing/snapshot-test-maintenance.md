---
title: Maintaining Snapshot Tests
description: A quick and easy guide to understanding snapshot testing with Vitest.
modified: 2024-09-28T15:26:39-06:00
---

So here's the deal with **snapshot testing**—it's **quick** and **easy** to write, but like any magic trick, there’s some sleight of hand you should be aware of. A snapshot is basically a serialized version of the output that your component, function, or whatever you’re testing spits out. Vitest (and tools like it) compares this serialized version to the previously saved "snapshot" version on disk during each test.

If the outputs match, Vitest tells you all is good. If they don't, it's basically like Vitest coming back and saying, "Hey, something’s different. Did you mean to change this?" That’s when you get to decide: **Is this exactly what I expected?** or **Did I accidentally mess something up?**

Snapshot testing doesn't just apply to components either. You can use it for **API responses**, logging outputs, whatever—just toss it into a `toMatchSnapshot()` and call it a day.

## The Good, the Bad, and the Snapshot

### The Good

Snapshot tests can **save you time**. Write a test, capture the output, and any future changes will be auto-compared to that snapshot. It’s a handy tool when everything is working smoothly.

### The Bad

But it’s not all pizza and sunshine. Over time, you’re gonna have to **inspect** these bad boys and make some decisions. Since snapshots are just serialized data, they don't care about context. If your UI component's JSX render changed because you renamed a button, does that mean your app is broken? Maybe not. Maybe everything’s cool. But you have to look at it and say, “Is this change legit or an unintentional bug?”

### The Snapshot

When a snapshot fails, Vitest will scream: “TEST FAIL.” The next step is either updating it (if the change is intentional) or fixing the bug (if it’s an error).

## How to Maintain Your Snapshots

### Step 1: Identify the Difference

When Vitest tells you your snapshot test failed, your first step is to inspect the changes. You'll see a nice diff displayed in your terminal (or a less nice but still helpful diff if you're not using a proper terminal).

Take a close look at that diff. Does it look like a developer (you) did this on purpose? Or is something fishy?

### Step 2: Update Intentionally, Not Blindly

I know we're all busy and deadlines are looming, but **don't just automatically update the snapshot** without thinking. I mean, come on, that's just asking for it. 😅

If the changes are valid—such as a visual tweak or expected output changes—*then* you can confidently run:

```bash
npx vitest --update
```

Basically gives Vitest the ol’: “I got this, update the snapshot.” Done.

### Step 3: Broken? Roll Back and Fix

If the snapshot test revealed an issue that you didn’t expect, then don’t bother updating it. **Fix your code first**. The snapshot is just the messenger here, telling you something’s off in your logic.

## Tips for Controlling Snapshot Bloat

### Use Selective Snapshot Testing

You don’t need to snapshot everything in your codebase. Like, really, does every single line of boilerplate or tiny utility function need a golden record? Probably not. So use them **where they have meaningful value**—like specific UI components or bigger functions.

### Keep Your Snapshots Small and Focused

Snapshots should align with **meaningful outputs**, not **large chunks of data**. If your snapshot is several hundred lines long, you're probably trying to cover too much ground with one test. Break it up.

## In Conclusion

Snapshot testing is a great way to add **quick regression checks** to your codebase—just make sure you're **paying attention**. It's so tempting to update snapshots without thinking twice when you're in a rush. Resist the urge.

Being mindful of your snapshots won’t just improve your tests. It’ll also save future-you from yelling at past-you for blindly approving a bunch of nonsense changes.
