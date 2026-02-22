---
title: Mocking Reading And Writing Files
description: Learn how to mock file operations using Vitest and fs/promises.
modified: '2025-07-29T15:09:56-06:00'
date: '2024-10-02T08:49:23-05:00'
---

Usually, when you're testing something like file operations, you don't actually want your tests messing around with your file system. We don't want some rogue unit test changing the file that holds your coworkers' lunch preferences or—god forbid—deleting it entirely. That's where mocking comes in. With mocking, we can just _pretend_ we're reading and writing files. Vitest and modern tools like `fs/promises` make this super straightforward. So, let's dig in.

## Setting the Scene

Let's assume you've got this super fancy little module that reads from a file, modifies the data, and writes it back. Something really _real-world_ like this:

```javascript
// fileOperations.js
import { readFile, writeFile } from 'fs/promises';

export async function processFile(filePath, content) {
  const existingContent = await readFile(filePath, 'utf-8');
  const updatedContent = `${existingContent}\n${content}`;
  await writeFile(filePath, updatedContent);
  return updatedContent;
}
```

The dream here is that you'll pass a file path and some new content, and it'll append that content to whatever's in the file. Pretty standard. But for the sake of our tests, we don't want to actually read or write files.

## Mocking the File System with Vitest

We can mock `fs/promises` using Vitest's `vi.mock()` function. This lets us _intercept_ those calls to `readFile` and `writeFile` and return specific values we want.

### Write the Test

Let's first write the tests, mocking those file system calls so we don't nuke any actual files.

```javascript
import { processFile } from './fileOperations';
import { readFile, writeFile } from 'fs/promises';
import { describe, it, expect, vi } from 'vitest';

vi.mock('fs/promises'); // this magic line mocks the whole module

describe('processFile', () => {
  it('should read content, append new content, and write it back', async () => {
    // Arrange: Set up mock behavior
    const mockFilePath = 'mockFile.txt';
    const mockExistingContent = 'Hello World';
    const mockNewContent = 'Vitest is awesome';

    // Mock 'readFile' to return some existing content
    readFile.mockResolvedValue(mockExistingContent);

    // Act: Call the function we're testing
    const result = await processFile(mockFilePath, mockNewContent);

    // Assert: Did the magic happen?
    expect(readFile).toHaveBeenCalledWith(mockFilePath, 'utf-8');
    expect(writeFile).toHaveBeenCalledWith(
      mockFilePath,
      `${mockExistingContent}\n${mockNewContent}`,
    );
    expect(result).toBe(`${mockExistingContent}\n${mockNewContent}`);
  });
});
```

### Breaking it Down

#### The Mock

`vi.mock('fs/promises')` essentially says, “Hey, Vitest, don't even try interacting with the real file system—just mock everything in this module.”

#### Mocking `readFile`

We want to simulate reading the file without actually doing it. `readFile.mockResolvedValue(mockExistingContent)` tells Vitest, “Yo, every time someone calls `readFile`, instead of hitting the disk, just hand them this mock content.”

#### Asserting `writeFile`

After appending the contents, you're gonna want to check that it's calling `writeFile` correctly. With `expect(writeFile).toHaveBeenCalledWith(mockFilePath, expectedContent)`, you're confirming it's writing back what you'd expect.

### Running the Test

Assuming you've got Vitest all set up, you can kick the test off by running:

```bash
npx vitest
```

And if everything is wired up correctly, it'll pass! 🎉

## Common Pitfalls

1. **Forgetting to mock the right thing:** The file system API lives under different names (`fs`, `fs/promises`). Make sure you're mocking the right one! Newer Node.js code prefers `fs/promises`, which is why we're mocking that.
2. **Mocks returning undefined:** If you forget `mockResolvedValue`, Vitest will return `undefined` by default. So if you're wondering why your test is throwing `undefined is not a function`—check those mocks!

## Final Thoughts

Mocking file reading and writing can be a bit intimidating at first, but once you get the hang of it, your tests will be cleaner, faster, and less likely to wipe out someone's precious files (e.g. your own).
