---
title: Building An Authentication System Using Test-Driven Development With
  Express And Vitest
description: Learn how to create an authentication system with TDD using Express and Vitest.
modified: 2024-09-28T17:47:03-06:00
---

## Building an Authentication System Using Test-Driven Development with Express and Vitest

**Table of Contents**

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Understanding Test-Driven Development](#understanding-test-driven-development)
5. [Setting Up Express with Vitest](#setting-up-express-with-vitest)
6. [Designing the Authentication System](#designing-the-authentication-system)
7. [Implementing the System with TDD](#implementing-the-system-with-tdd)
   - [1. User Registration](#1-user-registration)
   - [2. User Login](#2-user-login)
   - [3. User Logout](#3-user-logout)
8. [Testing Focus Areas](#testing-focus-areas)
   - [Unit Tests: Form Validation and Encryption Methods](#unit-tests-form-validation-and-encryption-methods)
   - [Integration Tests: API Endpoints for Authentication](#integration-tests-api-endpoints-for-authentication)
   - [Security Tests: Handling Authentication Tokens](#security-tests-handling-authentication-tokens)
9. [Running the Tests](#running-the-tests)
10. [Conclusion](#conclusion)
11. [Additional Exercises](#additional-exercises)

### Introduction

Building a secure authentication system is a critical aspect of many web applications. In this guide, we'll develop a simple authentication system using **Test-Driven Development (TDD)** with **Express** (a Node.js web application framework) and **Vitest**, a modern JavaScript testing framework.

**Objectives:**

- Learn how to apply TDD in building an authentication system.
- Understand how to write unit, integration, and security tests with Vitest.
- Implement user registration, login, and logout functionality.
- Ensure proper handling of authentication tokens.

### Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax) and Node.js.
- Familiarity with Express.js.
- Understanding of unit testing and TDD concepts.
- Node.js and npm installed on your machine.

### Project Setup

1. **Create a New Project Directory**

   ```bash
   mkdir auth-system-tdd
   cd auth-system-tdd
   ```

2. **Initialize npm**

   ```bash
   npm init -y
   ```

3. **Install Dependencies**

   ```bash
   npm install express bcrypt jsonwebtoken
   ```

   - `express`: Web application framework.
   - `bcrypt`: For password hashing.
   - `jsonwebtoken`: For generating and verifying JWT tokens.

4. **Install Dev Dependencies**

   ```bash
   npm install --save-dev vitest supertest
   ```

   - `vitest`: Testing framework.
   - `supertest`: For testing HTTP endpoints.

5. **Project Structure**

   ```ts
   auth-system-tdd/
   ├── package.json
   ├── vitest.config.js
   ├── src/
   │   ├── app.js
   │   ├── routes/
   │   │   └── auth.js
   │   ├── controllers/
   │   │   └── authController.js
   │   └── models/
   │       └── user.js
   └── tests/
       ├── unit/
       │   └── auth.test.js
       └── integration/
           └── auth.integration.test.js
   ```

   - `src/`: Contains the application code.
   - `tests/`: Contains the test files.

### Understanding Test-Driven Development

**Test-Driven Development (TDD)** is a software development approach where you:

1. **Write a Test**: Write a test for the next bit of functionality.
2. **Run the Test and See It Fail**: Ensures the test detects the absence of functionality.
3. **Write the Minimal Code to Pass the Test**: Implement just enough code to make the test pass.
4. **Refactor**: Improve the code while keeping the tests passing.
5. **Repeat**: Continue with the next functionality.

This cycle is often referred to as **Red-Green-Refactor**.

### Designing the Authentication System

**Features:**

- **User Registration**: Allows users to create an account with a username and password.
- **User Login**: Authenticates users and provides a JWT token.
- **User Logout**: Invalidates the user's session (for stateless JWT, this can be handled on the client-side).

**Components:**

- **Form Validation**: Ensuring user inputs meet criteria.
- **Password Encryption**: Securely storing user passwords using hashing.
- **JWT Token Handling**: Generating and verifying JSON Web Tokens for authentication.

### Implementing the System with TDD

#### 1. User Registration

##### Step 1: Write the Test (Red)

Create `tests/unit/auth.test.js`:

```javascript
// tests/unit/auth.test.js
import { describe, it, expect } from 'vitest';
import { validateRegistrationData, hashPassword } from '../../src/controllers/authController';

describe('Auth Controller - Unit Tests', () => {
	describe('validateRegistrationData', () => {
		it('should validate correct data', () => {
			const data = { username: 'testuser', password: 'Password123' };
			const result = validateRegistrationData(data);
			expect(result).toBe(true);
		});

		it('should invalidate data with missing fields', () => {
			const data = { username: 'testuser' };
			expect(() => validateRegistrationData(data)).toThrow('Password is required');
		});

		it('should invalidate data with weak password', () => {
			const data = { username: 'testuser', password: 'pass' };
			expect(() => validateRegistrationData(data)).toThrow('Password is too weak');
		});
	});

	describe('hashPassword', () => {
		it('should hash the password', async () => {
			const password = 'Password123';
			const hash = await hashPassword(password);
			expect(hash).not.toBe(password);
			expect(hash).toMatch(/^\$2[aby]\$.{56}$/); // Regex for bcrypt hash
		});
	});
});
```

**Explanation:**

- We test `validateRegistrationData` for valid and invalid inputs.
- We test `hashPassword` to ensure it hashes the password correctly.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The tests fail because `validateRegistrationData` and `hashPassword` are not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Create `src/controllers/authController.js`:

```javascript
// src/controllers/authController.js
import bcrypt from 'bcrypt';

export function validateRegistrationData(data) {
	if (!data.username) {
		throw new Error('Username is required');
	}
	if (!data.password) {
		throw new Error('Password is required');
	}
	if (data.password.length < 6) {
		throw new Error('Password is too weak');
	}
	return true;
}

export async function hashPassword(password) {
	const saltRounds = 10;
	return await bcrypt.hash(password, saltRounds);
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm run test
```

The tests should pass.

##### Step 5: Refactor (if necessary)

Ensure error messages are consistent and code is clean.

#### 2. User Login

##### Step 1: Write the Test (Red)

Add to `tests/unit/auth.test.js`:

```javascript
import { verifyPassword, generateToken } from '../../src/controllers/authController';

describe('verifyPassword', () => {
	it('should return true for correct password', async () => {
		const password = 'Password123';
		const hash = await hashPassword(password);
		const result = await verifyPassword(password, hash);
		expect(result).toBe(true);
	});

	it('should return false for incorrect password', async () => {
		const password = 'Password123';
		const hash = await hashPassword(password);
		const result = await verifyPassword('WrongPassword', hash);
		expect(result).toBe(false);
	});
});

describe('generateToken', () => {
	it('should generate a JWT token', () => {
		const user = { id: 1, username: 'testuser' };
		const token = generateToken(user);
		expect(token).toBeDefined();
		expect(typeof token).toBe('string');
	});
});
```

**Explanation:**

- We test `verifyPassword` for correct and incorrect passwords.
- We test `generateToken` to ensure it creates a JWT token.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The tests fail because `verifyPassword` and `generateToken` are not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/controllers/authController.js`:

```javascript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key'; // In production, store this securely

// … previous code …

export async function verifyPassword(password, hash) {
	return await bcrypt.compare(password, hash);
}

export function generateToken(user) {
	return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm run test
```

The tests should pass.

##### Step 5: Refactor

Ensure the secret key is managed securely (e.g., using environment variables).

#### 3. User Logout

Since we're using JWT tokens, logout can be handled on the client side by deleting the token. However, for server-side logout (e.g., blacklisting tokens), we'd need additional infrastructure. For simplicity, we'll assume stateless JWT and focus on the client-side logout.

### Testing Focus Areas

#### Unit Tests: Form Validation and Encryption Methods

We've already written unit tests for:

- **Form Validation**: Ensuring that registration data meets the criteria.
- **Encryption Methods**: Testing password hashing and verification.

#### Integration Tests: API Endpoints for Authentication

We'll write integration tests to test the API endpoints.

##### Step 1: Set Up the Express App

Create `src/app.js`:

```javascript
// src/app.js
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js';

const app = express();

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

export default app;
```

Create `src/routes/auth.js`:

```javascript
// src/routes/auth.js
import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;
```

Update `src/controllers/authController.js`:

```javascript
// … previous imports and functions …

const users = []; // In-memory user store (replace with a database in production)

export async function register(req, res) {
	try {
		validateRegistrationData(req.body);
		const hashedPassword = await hashPassword(req.body.password);
		const user = { id: users.length + 1, username: req.body.username, password: hashedPassword };
		users.push(user);
		res.status(201).json({ message: 'User registered successfully' });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}

export async function login(req, res) {
	try {
		const user = users.find((u) => u.username === req.body.username);
		if (!user) {
			throw new Error('Invalid username or password');
		}
		const isValid = await verifyPassword(req.body.password, user.password);
		if (!isValid) {
			throw new Error('Invalid username or password');
		}
		const token = generateToken(user);
		res.json({ token });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
```

##### Step 2: Write Integration Tests (Red)

Create `tests/integration/auth.integration.test.js`:

```javascript
// tests/integration/auth.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('Auth Routes - Integration Tests', () => {
	it('should register a new user', async () => {
		const response = await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		expect(response.status).toBe(201);
		expect(response.body.message).toBe('User registered successfully');
	});

	it('should not register a user with existing username', async () => {
		// Register the user first
		await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		// Try registering again
		const response = await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		expect(response.status).toBe(400);
		expect(response.body.error).toBe('Username already exists');
	});

	it('should login a registered user', async () => {
		// Register the user
		await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		// Login
		const response = await request(app).post('/api/auth/login').send({
			username: 'testuser',
			password: 'Password123',
		});
		expect(response.status).toBe(200);
		expect(response.body.token).toBeDefined();
	});

	it('should not login with incorrect password', async () => {
		// Register the user
		await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		// Attempt to login with wrong password
		const response = await request(app).post('/api/auth/login').send({
			username: 'testuser',
			password: 'WrongPassword',
		});
		expect(response.status).toBe(400);
		expect(response.body.error).toBe('Invalid username or password');
	});
});
```

**Explanation:**

- We test the `/register` and `/login` endpoints.
- We ensure that registration and login work as expected.

##### Step 3: Run the Test and See It Fail

Run the test:

```bash
npm run test
```

The tests may fail due to `Username already exists` not being handled.

##### Step 4: Write Minimal Code to Pass the Test (Green)

Update `register` function in `authController.js`:

```javascript
export async function register(req, res) {
	try {
		validateRegistrationData(req.body);
		const existingUser = users.find((u) => u.username === req.body.username);
		if (existingUser) {
			throw new Error('Username already exists');
		}
		const hashedPassword = await hashPassword(req.body.password);
		const user = { id: users.length + 1, username: req.body.username, password: hashedPassword };
		users.push(user);
		res.status(201).json({ message: 'User registered successfully' });
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
}
```

##### Step 5: Run the Test Again

Run the test:

```bash
npm run test
```

All tests should pass.

##### Step 6: Refactor

Consider moving the user store to a separate module or using a database.

#### Security Tests: Handling Authentication Tokens

We need to ensure that tokens are handled securely.

##### Step 1: Write the Test (Red)

Add to `tests/integration/auth.integration.test.js`:

```javascript
describe('Protected Routes', () => {
	it('should access protected route with valid token', async () => {
		// Register and login the user
		await request(app).post('/api/auth/register').send({
			username: 'testuser',
			password: 'Password123',
		});
		const loginResponse = await request(app).post('/api/auth/login').send({
			username: 'testuser',
			password: 'Password123',
		});
		const token = loginResponse.body.token;

		// Access protected route
		const response = await request(app)
			.get('/api/protected')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.message).toBe('Protected content');
	});

	it('should not access protected route without token', async () => {
		const response = await request(app).get('/api/protected');
		expect(response.status).toBe(401);
		expect(response.body.error).toBe('Unauthorized');
	});

	it('should not access protected route with invalid token', async () => {
		const response = await request(app)
			.get('/api/protected')
			.set('Authorization', 'Bearer invalidtoken');
		expect(response.status).toBe(401);
		expect(response.body.error).toBe('Invalid token');
	});
});
```

**Explanation:**

- We test that a protected route can be accessed with a valid token.
- We test that access is denied without a token or with an invalid token.

##### Step 2: Implement Protected Route

Update `src/app.js`:

```javascript
// … previous code …
import { authenticateToken } from './middleware/authMiddleware.js';

app.get('/api/protected', authenticateToken, (req, res) => {
	res.json({ message: 'Protected content' });
});
```

Create `src/middleware/authMiddleware.js`:

```javascript
// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key';

export function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (!token) return res.status(401).json({ error: 'Unauthorized' });

	jwt.verify(token, SECRET_KEY, (err, user) => {
		if (err) return res.status(401).json({ error: 'Invalid token' });
		req.user = user;
		next();
	});
}
```

##### Step 3: Run the Test Again

Run the test:

```bash
npm run test
```

All tests should pass.

##### Step 4: Refactor

- Store the `SECRET_KEY` in environment variables.
- Handle token expiration and refresh if necessary.

### Running the Tests

Run all tests using:

```bash
npm run test
```

Vitest will execute all tests in the `tests/` directory and report the results.

### Conclusion

By following Test-Driven Development principles, we've built a basic authentication system with Express. We've written unit tests for form validation and encryption methods, integration tests for API endpoints, and security tests for handling authentication tokens. This approach ensures our application is reliable, secure, and behaves as expected.

**Key Takeaways:**

- **TDD Workflow:** Writing tests first helps define expected behavior and leads to better-designed code.
- **Vitest for Testing:** Vitest provides a fast and modern testing experience for JavaScript applications.
- **Comprehensive Testing:** Combining unit, integration, and security tests ensures a robust application.

### Additional Exercises

To further enhance your authentication system and testing skills, consider implementing the following features:

1. **Password Reset Functionality**

   - Implement password reset via email.
   - Write tests to ensure the reset process is secure.

2. **Account Verification**

   - Send a verification email upon registration.
   - Write tests to verify that unverified accounts cannot log in.

3. **Role-Based Access Control**

   - Implement roles (e.g., user, admin) and permissions.
   - Write tests to ensure access control is enforced correctly.

4. **Using a Database**

   - Replace the in-memory user store with a database (e.g., MongoDB, PostgreSQL).
   - Write tests that interact with the database, possibly using a test database.

5. **Session Management**

   - Implement session management for token invalidation (e.g., blacklisting tokens).
   - Write tests to ensure sessions are handled correctly.

6. **Input Sanitization**

   - Ensure all inputs are sanitized to prevent injection attacks.
   - Write tests to verify that the system is secure against such attacks.

7. **Rate Limiting**

   - Implement rate limiting to protect against brute-force attacks.
   - Write tests to ensure rate limiting works as expected.

8. **Security Auditing**

   - Use tools to audit your code for security vulnerabilities.
   - Address any issues found and write tests to prevent regressions.
