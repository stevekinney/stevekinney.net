---
title: "Dependency Injection In JavaScript: What, Why, And How"
description: Learn the basics and benefits of Dependency Injection in JavaScript.
modified: 2024-09-28T14:45:40-06:00
---

Big fancy name, simple idea: **injecting dependencies** into a function or class rather than having the function or class create them itself.

In plainer terms, instead of your function being that one-person army who goes and fetches everything it needs (knocking on doors like "hey, where's my API data?"), you're being a good teammate and saying, **"Hey, I'm going to give you everything you need upfront."** No need for your function to run around asking for stuff.

This makes your code more flexible, and much easier to test. Testing's about to get so much easier you'll actually enjoy it. Maybe.

## Before Dependency Injection

Let's say you have a not-very-smart `UserService` that fetches some user data. But it's doing a little *too much* on its own.

```javascript
class UserService {
	getUser() {
		const apiClient = new ApiClient();
		return apiClient.get('/user');
	}
}
```

Here, `UserService` is responsible for **creating** the `ApiClient` instance and then using it. And while `ApiClient` might be a lovely class, this tightly couples these two. If you want to write a test for `UserService`, well… tough luck because you’re going to have to deal with `ApiClient` every time.

## And Now, With 100% More Dependency Injection

Let's loosen up these constraints and pass the dependencies via the constructor. Suddenly, life feels a little breezier.

```javascript
class UserService {
	constructor(apiClient) {
		this.apiClient = apiClient;
	}

	getUser() {
		return this.apiClient.get('/user');
	}
}
```

At this point, `UserService` doesn't care how the `apiClient` is created—or even what its underlying implementation is. All it cares about is: **"Hey, did someone pass me an object that has a `.get()` method? Cool, I’m good to go."**

## Testing This New, Amazing Code

Now here’s where DI really shines. Suppose you want to write a test for `UserService` without actually hitting the real API. What are you going to do? Mock or stub the API client!

Here’s how we could do it:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { UserService } from './UserService';

describe('UserService', () => {
	it('fetches user data', async () => {
		const fakeApiClient = {
			get: vi.fn().mockResolvedValue({ id: 1, name: 'Steve' }),
		};

		const userService = new UserService(fakeApiClient);
		const user = await userService.getUser();

		expect(fakeApiClient.get).toHaveBeenCalledWith('/user');
		expect(user).toEqual({ id: 1, name: 'Steve' });
	});
});
```

See how now we can just pass a fake `apiClient`, and tell it exactly how to behave? Then in the test, we don't worry about the intricacies of actual APIs or networking: we just make sure `UserService` calls the right method and receives the expected data. That’s the sweet nectar of a cleanly tested class.

## Why Bother?

- **Testability:** Yep, this is the big one. When your dependencies are injected, you can easily swap them out with mocks or stubs during testing. Compare that to the alternative—mocking out internal creation logic (gross) or actually hitting a live API (uhh… no thanks).
- **Flexibility:** Changing a dependency becomes as simple as handing a new one to your class or function. No need to dive deep into the internals just to update an implementation, making your app more maintainable.
- **Decoupling:** When your code doesn’t need to know *how* things are created, it’s largely isolated from changes. Want to swap out `ApiClient` for something else? Just hand in the new dependency. No drama, no tears.

## Dependency Injection in Functions

You don't need fancy classes to do Dependency Injection either! You can do it with simple functions:

```javascript
function getUser(apiClient) {
	return apiClient.get('/user');
}
```

Boom, flexible! You can pass whatever object you want into `getUser()`—even one that’s totally fake for testing purposes (don't worry, I won't tell anyone).

## Wrapping Up

Dependency Injection isn’t scary. It’s not even complicated. It's just a little sleight of hand where instead of creating all the stuff inside a function or class, you pass the stuff in from the outside. This pattern decouples your code, makes it easier to change *and* easier to test. Trust me, your future self will thank you.
