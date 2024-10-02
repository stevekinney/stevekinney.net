---
title: Implementing Tests for the Character Class
description: Example of how to implement tests for the Character class.
modified: 2024-09-28T18:32:10.999Z
---

Here is one way to implement tests for our `Character` class in [the previous exercise](asymmetric-matchers-exercise) using [Asymmetric Matchers](asymmetric-matchers.md).

```javascript
import { describe, it, expect } from 'vitest';
import { Character } from './character.js';
import { Person } from './person.js';

describe('Character', () => {
	it('should create a character with a first name, last name, and role', () => {
		const character = new Character('Ada', 'Lovelace', 'Computer Scientist');

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
		const character = new Character('Ada', 'Lovelace', 'Computer Scientist');

		character.levelUp();
		expect(character.level).toBe(2);
	});

	it('should update the last modified date when leveling up', () => {
		const character = new Character('Ada', 'Lovelace', 'Computer Scientist');

		const initialLastModified = character.lastModified;

		character.levelUp();

		expect(character.lastModified).not.toBe(initialLastModified);
	});

	// Bonus: Test that Character inherits from Person
	it('should inherit from Person', () => {
		const character = new Character('Ada', 'Lovelace', 'Computer Scientist');

		expect(character).toBeInstanceOf(Person);
	});
});
```
