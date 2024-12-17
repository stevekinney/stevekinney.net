---
title: Building A Tic Tac Toe Game Using Test-Driven Development With Vitest
description: Learn to build a Tic Tac Toe game using TDD and Vitest.
modified: 2024-09-28T18:32:11.126Z
---

## Building a Tic Tac Toe Game Using Test-Driven Development with Vitest

**Table of Contents**

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Understanding Test-Driven Development](#understanding-test-driven-development)
5. [Setting Up Vitest](#setting-up-vitest)
6. [Designing the Game Logic](#designing-the-game-logic)
7. [Implementing the Game Logic with TDD](#implementing-the-game-logic-with-tdd)
   - [1. Creating the Game Board](#1-creating-the-game-board)
   - [2. Placing a Move](#2-placing-a-move)
   - [3. Checking for a Winner](#3-checking-for-a-winner)
   - [4. Checking for a Draw](#4-checking-for-a-draw)
8. [Building the User Interface](#building-the-user-interface)
9. [Testing the User Interface](#testing-the-user-interface)
10. [Conclusion](#conclusion)
11. [Additional Exercises](#additional-exercises)

---

### Introduction

In this guide, we'll build the classic game of **Tic Tac Toe** using **Test-Driven Development (TDD)** with **Vitest**, a fast and modern JavaScript testing framework. We'll start by developing the game logic through unit tests and then create a simple user interface using plain JavaScript, ensuring our UI is tested and functions correctly.

**Objectives:**

- Learn how to apply TDD principles to build a game.
- Understand how to write unit tests with Vitest.
- Develop a Tic Tac Toe game logic and user interface.
- Write tests for both the game logic and the UI interactions.

### Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax).
- Familiarity with Node.js and npm.
- Understanding of unit testing concepts.
- Node.js and npm installed on your machine.

### Project Setup

1. **Create a New Directory**

   ```bash
   mkdir tic-tac-toe-tdd
   cd tic-tac-toe-tdd
   ```

2. **Initialize npm**

   ```bash
   npm init -y
   ```

3. **Install Vitest**

   ```bash
   npm install --save-dev vitest
   ```

4. **Set Up the Project Structure**

   ```ts
   tic-tac-toe-tdd/
   ├── package.json
   ├── vitest.config.js
   ├── src/
   │   ├── game.js
   │   ├── ui.js
   │   └── index.html
   └── tests/
       ├── game.test.js
       └── ui.test.js
   ```

   - `src/`: Contains the source code for the game logic and UI.
   - `tests/`: Contains the test files.

### Understanding Test-Driven Development

**Test-Driven Development (TDD)** is a software development approach where you:

1. **Write a Test**: Write a test for the next bit of functionality.
2. **Run the Test and See It Fail**: Ensures the test detects the absence of functionality.
3. **Write the Minimal Code to Pass the Test**: Implement just enough code to make the test pass.
4. **Refactor**: Improve the code while keeping the tests passing.
5. **Repeat**: Continue with the next functionality.

This cycle is often referred to as **Red-Green-Refactor**.

### Setting Up Vitest

Add a test script to your `package.json`:

```json
{
	"scripts": {
		"test": "vitest"
	}
}
```

Create a `vitest.config.js` file (optional for simple setups):

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
	},
});
```

### Designing the Game Logic

Before we start coding, let's outline the game logic:

- The game board is a 3x3 grid.
- Players take turns placing their mark (X or O) on the board.
- The game checks for a winner after each move.
- A player wins if they have three of their marks in a row, column, or diagonal.
- The game ends in a draw if all spots are filled without a winner.

### Implementing the Game Logic with TDD

#### 1. Creating the Game Board

##### Step 1: Write the Test (Red)

Create `tests/game.test.js`:

```javascript
// tests/game.test.js
import { describe, it, expect } from 'vitest';
import { createGame } from '../src/game';

describe('Tic Tac Toe Game Logic', () => {
	it('initializes a 3x3 game board', () => {
		const game = createGame();
		expect(game.board).toEqual([
			['', '', ''],
			['', '', ''],
			['', '', ''],
		]);
	});

	it('starts with player X', () => {
		const game = createGame();
		expect(game.currentPlayer).toBe('X');
	});
});
```

**Explanation:**

- We test that `createGame` initializes an empty 3x3 board.
- We test that the game starts with player 'X'.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

You'll get an error: `createGame` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Implement `createGame` in `src/game.js`:

```javascript
// src/game.js
export function createGame() {
	return {
		board: [
			['', '', ''],
			['', '', ''],
			['', '', ''],
		],
		currentPlayer: 'X',
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

Tests should now pass.

##### Step 5: Refactor (if necessary)

Our code is simple; no refactoring needed.

#### 2. Placing a Move

We need to implement a function to place a move on the board.

##### Step 1: Write the Test (Red)

Add to `tests/game.test.js`:

```javascript
describe('placeMove', () => {
	it("places the current player's mark on the board", () => {
		const game = createGame();
		game.placeMove(0, 0); // Top-left corner
		expect(game.board[0][0]).toBe('X');
	});

	it('switches to the next player after a move', () => {
		const game = createGame();
		game.placeMove(0, 0);
		expect(game.currentPlayer).toBe('O');
	});

	it('does not allow placing a move on an occupied spot', () => {
		const game = createGame();
		game.placeMove(0, 0);
		expect(() => game.placeMove(0, 0)).toThrow('Spot already taken');
	});
});
```

**Explanation:**

- We test that the current player's mark is placed on the board.
- We test that the player switches after a move.
- We test that placing a move on an occupied spot throws an error.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Errors occur because `placeMove` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/game.js`:

```javascript
export function createGame() {
	return {
		board: [
			['', '', ''],
			['', '', ''],
			['', '', ''],
		],
		currentPlayer: 'X',
		placeMove(row, col) {
			if (this.board[row][col] !== '') {
				throw new Error('Spot already taken');
			}
			this.board[row][col] = this.currentPlayer;
			this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
		},
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests should pass.

##### Step 5: Refactor

Consider separating player switching logic.

#### 3. Checking for a Winner

We need to implement a method to check for a winner.

##### Step 1: Write the Test (Red)

Add to `tests/game.test.js`:

```javascript
describe('checkWinner', () => {
	it('detects a winning row', () => {
		const game = createGame();
		game.board = [
			['X', 'X', 'X'],
			['', '', ''],
			['', '', ''],
		];
		expect(game.checkWinner()).toBe('X');
	});

	it('detects a winning column', () => {
		const game = createGame();
		game.board = [
			['O', '', ''],
			['O', '', ''],
			['O', '', ''],
		];
		expect(game.checkWinner()).toBe('O');
	});

	it('detects a winning diagonal', () => {
		const game = createGame();
		game.board = [
			['X', '', ''],
			['', 'X', ''],
			['', '', 'X'],
		];
		expect(game.checkWinner()).toBe('X');
	});

	it('returns null if there is no winner', () => {
		const game = createGame();
		expect(game.checkWinner()).toBeNull();
	});
});
```

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Error: `checkWinner` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/game.js`:

```javascript
export function createGame() {
	return {
		board: [
			['', '', ''],
			['', '', ''],
			['', '', ''],
		],
		currentPlayer: 'X',
		placeMove(row, col) {
			if (this.board[row][col] !== '') {
				throw new Error('Spot already taken');
			}
			this.board[row][col] = this.currentPlayer;
			this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
		},
		checkWinner() {
			const b = this.board;
			const lines = [
				// Rows
				[b[0][0], b[0][1], b[0][2]],
				[b[1][0], b[1][1], b[1][2]],
				[b[2][0], b[2][1], b[2][2]],
				// Columns
				[b[0][0], b[1][0], b[2][0]],
				[b[0][1], b[1][1], b[2][1]],
				[b[0][2], b[1][2], b[2][2]],
				// Diagonals
				[b[0][0], b[1][1], b[2][2]],
				[b[0][2], b[1][1], b[2][0]],
			];

			for (let line of lines) {
				if (line[0] && line[0] === line[1] && line[1] === line[2]) {
					return line[0];
				}
			}
			return null;
		},
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests should pass.

##### Step 5: Refactor

Consider moving the lines array outside the function if needed.

#### 4. Checking for a Draw

We need to check if the game ends in a draw.

##### Step 1: Write the Test (Red)

Add to `tests/game.test.js`:

```javascript
describe('isDraw', () => {
	it('returns true when the board is full and there is no winner', () => {
		const game = createGame();
		game.board = [
			['X', 'O', 'X'],
			['X', 'O', 'O'],
			['O', 'X', 'X'],
		];
		expect(game.isDraw()).toBe(true);
	});

	it('returns false when the board is not full', () => {
		const game = createGame();
		game.board = [
			['X', 'O', ''],
			['X', '', 'O'],
			['O', 'X', 'X'],
		];
		expect(game.isDraw()).toBe(false);
	});

	it('returns false when there is a winner', () => {
		const game = createGame();
		game.board = [
			['X', 'X', 'X'],
			['O', 'O', ''],
			['', '', ''],
		];
		expect(game.isDraw()).toBe(false);
	});
});
```

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Error: `isDraw` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/game.js`:

```javascript
export function createGame() {
	return {
		// … previous code …
		isDraw() {
			if (this.checkWinner()) {
				return false;
			}
			for (let row of this.board) {
				if (row.includes('')) {
					return false;
				}
			}
			return true;
		},
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests should pass.

##### Step 5: Refactor

No immediate refactoring needed.

---

At this point, we've implemented the core game logic using TDD.

### Building the User Interface

Now we'll create a simple UI using HTML and JavaScript.

#### 1. Create `index.html`

```html
<!-- src/index.html -->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<title>Tic Tac Toe</title>
		<style>
			.board {
				display: grid;
				grid-template-columns: repeat(3, 100px);
				grid-gap: 5px;
			}
			.cell {
				width: 100px;
				height: 100px;
				font-size: 2em;
				text-align: center;
				line-height: 100px;
				border: 1px solid #000;
				cursor: pointer;
			}
			.disabled {
				pointer-events: none;
				background-color: #f0f0f0;
			}
			#message {
				margin-top: 20px;
				font-size: 1.2em;
			}
		</style>
	</head>
	<body>
		<h1>Tic Tac Toe</h1>
		<div class="board" id="board"></div>
		<div id="message"></div>
		<button id="reset">Reset Game</button>
		<script src="ui.js"></script>
	</body>
</html>
```

#### 2. Create `ui.js`

We'll write the UI code as we write tests for it.

### Testing the User Interface

We'll use **Vitest** with **Testing Library** to test our UI.

#### 1. Set Up Testing Library

Install dependencies:

```bash
npm install --save-dev jsdom @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

Update `vitest.config.js`:

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: './tests/setupTests.js',
	},
});
```

Create `tests/setupTests.js`:

```javascript
import '@testing-library/jest-dom';
```

#### 2. Writing UI Tests

Create `tests/ui.test.js`:

```javascript
// tests/ui.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../src/index.html'), 'utf8');

describe('Tic Tac Toe UI', () => {
	beforeEach(() => {
		document.body.innerHTML = html;
		require('../src/ui.js');
	});

	it('renders a 3x3 grid', () => {
		const cells = document.querySelectorAll('.cell');
		expect(cells.length).toBe(9);
	});

	it('allows players to take turns placing marks', async () => {
		const user = userEvent.setup();
		const cells = screen.getAllByRole('button');

		await user.click(cells[0]); // Player X
		expect(cells[0]).toHaveTextContent('X');

		await user.click(cells[1]); // Player O
		expect(cells[1]).toHaveTextContent('O');

		await user.click(cells[2]); // Player X
		expect(cells[2]).toHaveTextContent('X');
	});

	it('declares a winner when a player wins', async () => {
		const user = userEvent.setup();
		const cells = screen.getAllByRole('button');
		const message = screen.getByText('', { selector: '#message' });

		await user.click(cells[0]); // X
		await user.click(cells[3]); // O
		await user.click(cells[1]); // X
		await user.click(cells[4]); // O
		await user.click(cells[2]); // X wins

		expect(message).toHaveTextContent('Player X wins!');
	});

	it('declares a draw when the game ends without a winner', async () => {
		const user = userEvent.setup();
		const cells = screen.getAllByRole('button');
		const message = screen.getByText('', { selector: '#message' });

		// Fill the board to a draw
		const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8];
		for (let index of moves) {
			await user.click(cells[index]);
		}

		expect(message).toHaveTextContent("It's a draw!");
	});
});
```

#### 3. Implementing UI Code to Pass Tests

Update `src/ui.js`:

```javascript
import { createGame } from './game.js';

const game = createGame();
const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('reset');

// Create cells
for (let row = 0; row < 3; row++) {
	for (let col = 0; col < 3; col++) {
		const cell = document.createElement('button');
		cell.classList.add('cell');
		cell.dataset.row = row;
		cell.dataset.col = col;
		cell.setAttribute('aria-label', `Cell ${row},${col}`);
		boardElement.appendChild(cell);
	}
}

function updateBoard() {
	const cells = document.querySelectorAll('.cell');
	cells.forEach((cell) => {
		const row = cell.dataset.row;
		const col = cell.dataset.col;
		cell.textContent = game.board[row][col];
	});
}

function handleClick(event) {
	const cell = event.target;
	const row = cell.dataset.row;
	const col = cell.dataset.col;
	try {
		game.placeMove(row, col);
		updateBoard();
		const winner = game.checkWinner();
		if (winner) {
			messageElement.textContent = `Player ${winner} wins!`;
			disableBoard();
		} else if (game.isDraw()) {
			messageElement.textContent = "It's a draw!";
			disableBoard();
		}
	} catch (error) {
		// Ignore errors for occupied spots
	}
}

function disableBoard() {
	const cells = document.querySelectorAll('.cell');
	cells.forEach((cell) => {
		cell.disabled = true;
		cell.classList.add('disabled');
	});
}

function resetGame() {
	game.board = [
		['', '', ''],
		['', '', ''],
		['', '', ''],
	];
	game.currentPlayer = 'X';
	messageElement.textContent = '';
	const cells = document.querySelectorAll('.cell');
	cells.forEach((cell) => {
		cell.disabled = false;
		cell.classList.remove('disabled');
		cell.textContent = '';
	});
}

const cells = document.querySelectorAll('.cell');
cells.forEach((cell) => {
	cell.addEventListener('click', handleClick);
});

resetButton.addEventListener('click', resetGame);
```

#### 4. Run the Tests

Run the tests:

```bash
npm test
```

All tests should pass if the UI code correctly implements the game logic.

---

### Conclusion

By following Test-Driven Development principles, we've built a functional Tic Tac Toe game with both game logic and user interface. We've written unit tests for the game logic and used Testing Library to test the UI interactions, ensuring our application is reliable and behaves as expected.

**Key Takeaways:**

- **TDD Workflow:** Writing tests first helps define the expected behavior and leads to better-designed code.
- **Vitest for Testing:** Vitest provides a fast and modern testing experience for JavaScript applications.
- **Testing Library:** Using Testing Library allows us to write tests that resemble how users interact with our app.

### Additional Exercises

To further enhance your Tic Tac Toe game and testing skills, consider implementing the following features:

1. **AI Opponent**

   - Implement an AI player that makes moves against the human player.
   - Write tests to ensure the AI makes valid moves.

2. **Score Tracking**

   - Keep track of the number of wins for each player.
   - Write tests to verify that the scores are updated correctly.

3. **Improved UI**

   - Enhance the UI with better styling and animations.
   - Ensure accessibility by using proper ARIA roles and labels.

4. **Undo Functionality**

   - Allow players to undo their last move.
   - Write tests to ensure the game state is correctly reverted.

5. **Online Multiplayer**

   - Implement networked multiplayer functionality.
   - Write integration tests to simulate multiple players.

6. **Responsive Design**

   - Make the game responsive and playable on different devices.
   - Test UI elements on various screen sizes.

7. **Leaderboard**

   - Add a leaderboard to display top players' scores.
   - Write tests to ensure scores are correctly stored and retrieved.

8. **Test Coverage Analysis**

   - Integrate code coverage reporting with Vitest.
   - Analyze the coverage report to identify untested code paths.
