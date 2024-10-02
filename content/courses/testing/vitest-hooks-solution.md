---
title: Creating the Character Using a Hook
description: Learn how to create the Character class using a hook.
modified: 2024-09-28T16:12:42-06:00
---

We could create the `Character` using a hook as follows seen below.

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { Character } from './character.js';
import { Person } from './person.js';

describe('Character', () => {
	let character;

	beforeEach(() => {
		character = new Character('Ada', 'Lovelace', 'Computer Scientist');
	});

	it('should create a character with a first name, last name, and role', () => {
		expect(character).toEqual({
			id: expect.any(String),
			firstName: 'Ada',
			lastName: 'Lovelace',
			role: 'Computer Scientist',
			level: 1,
			strength: expect.any(Number),
			dexterity: expect.any(Number),
			intelligence: expect.any(Number),
			wisdom: expect.any(Number),
			charisma: expect.any(Number),
			constitution: expect.any(Number),
			createdAt: expect.any(Date),
			lastModified: expect.any(Date),
		});
	});

	it('should allow you to increase the level', () => {
		character.levelUp();
		expect(character.level).toBe(2);
	});

	it('should update the last modified date when leveling up', () => {
		const initialLastModified = character.lastModified;

		character.levelUp();

		expect(character.lastModified).not.toBe(initialLastModified);
	});

	// Bonus: Test that Character inherits from Person
	it('should inherit from Person', () => {
		expect(character).toBeInstanceOf(Person);
	});
});
```
