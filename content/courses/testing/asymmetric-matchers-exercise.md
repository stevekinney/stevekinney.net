---
title: Testing the Character Class
description: Writing tests for the Character class and its key attributes.
modified: 2024-09-28T18:32:11.103Z
---

Let's head over to `examples/characters` and spend a moment reflecting on this `Character` class, which is a subset of the `Person` class we were just looking at.

```javascript
import { Person } from './person.js';
import { rollDice } from './roll-dice.js';

export class Character extends Person {
	constructor(firstName, lastName, role) {
		super(firstName, lastName);

		this.role = role;
		this.level = 1;

		this.createdAt = new Date();
		this.lastModified = this.createdAt;

		this.strength = rollDice(4, 6);
		this.dexterity = rollDice(4, 6);
		this.intelligence = rollDice(4, 6);
		this.wisdom = rollDice(4, 6);
		this.charisma = rollDice(4, 6);
		this.constitution = rollDice(4, 6);
	}

	levelUp() {
		this.level++;
		this.lastModified = new Date();
	}
}
```

You can take a look at `roll-dice.js`, but I'll spoil the surpise: It's _basically_ a random number generator. It also has two dates—`createdAt` and `lastModified` that will be a bit hard to pin down as well. Can you write some tests that will test the parts we can pin down?

- We know that the first and last name should be what we pass in.
- Full name should likely be the first and last name combined.
- We know that the role should be whatever was given to the contructor.
- We know that the level of the character will always default to `1`.
- **Bonus**: Could you figure out a clever way to see if the date was successfully modified?

You can peek at a [possible solution here](asymmetric-matchers-solution.md).
