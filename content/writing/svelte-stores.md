---
title: A Gentle Introduction to Svelte Stores
description: "Svelte stores simplify state management across components. Let's learn how they're implemented."
date: 2021-08-10T16:00:00.006Z
modified: 2024-09-28T11:31:14-06:00
published: true
tags:
  - svelte
---

Any client-side framework or library looks reasonable when you're working on a small demonstration application. But, things tend to get out of hand as your application—and it's state management needs—grow. This is particularly true when you want to share state between multiple components that aren't located near each other in your component hierarchy.

Svelte comes with something called [_stores_](https://svelte.dev/docs/svelte-store). Stores are JavaScript objects that adhere to a simple interface. You could implement a store yourself without a lot of code—and that's totally something that you might actually choose to do. Svelte doesn't particularly care. Svelte has some built-in stores, but basically anything that has a `subscribe` method that returns a function allowing you to unsubscribe will do the trick.

Stores allow you to access data or functionality from multiple components. They're reactive, which just means that they'll update your components whenever their data changes, hence that handy `subscribe` method.

Sure, you _could_ do the thing where you move it up to the highest common component in the tree—the one that likely doesn't actually need this data itself—and then drill down to all of the components that actually do—just like they told us to when React first hit the scene. But, anyone who has ever done knows it's not fun and falls apart rapidly when you depart from the friendly shores of some naively simple demonstration application and get into the real world where you need to move components around because of _reasons_.

To put it more succinctly, Svelte Stores allow you to separate your state management from your component hierarchy. This is usually something that becomes important whenever you need the same piece of data in more than one place in whatever application you're building. I'm looking at you, `currentUser`.

With Svelte, you can define your stores and then just require them in your components. When the store updates, it will trigger a re-render of the component with the latest data.

If you've ever used Node's event emitters or [RxJS](https://rxjs.dev/), then you basically already have the gist of how stores work. They take a `subscribe` function that is called whenever the data in the store change. You could even use a Redux store as a Svelte store with just a little bit of modification—but that's another story for another day.

## Using Stores in Your Svelte Application

We're going to talk about how Svelte stores work below. But, I'd be remiss if I didn't at least discuss how to go about using them in your Svelte application. As I mentioned, basically the only rule of Svelte stores is that they have a `subscribe` method that pushes out a new value every time that internal value is updated.

You _could_ do something like this in your Svelte component's `<script>` tag:

```typescript
const counter = writable(0); // Create a new store.
// This might be happening in another file.

let value; // Create a variable that you can use in your markup.

// Subscribe to the store, updating the component's variable when it changes.
const unsubscribe = counter.subscribe((newValue) => (value = newValue));

// Unsubscribe to the store when the component is destroyed.
onDestroy(unsubscribe);
```

This works, but it's a bit tedious and it's common enough that Svelte provides you an abstraction for making this easier. Basically, you can prefix any store with a `$` and Svelte will handle all of the ceremony of subscribing and unsubscribing.

```html
<p>{$counter}</p>
```

That's it. The Svelte compiler looks at that `$` and says, "Oh, this must be a store! Let me subscribe to it and I'll unsubscribe from it when this component is removed." Boom. You're done.

Another fun advantage to this is that you can use the same store in multiple components and they'll all be synchronized to the same value. I'll leave it as an exercise to the reader (i.e. you) to try to just import an object, use it inline in your React component, _and_ make it so that each of the components using the object are using the same value without relying on the Context API.

## Creating a Store

Svelte provides three kinds of stores for you: `writable`, `readable` and `derived` stores. (Technically, these are really all just variations on `writable` stores—but that's neither here nor there.).

```ts
import { writable } from 'svelte/stores';

const store = writable(0);

store.subscribe((value) => console.log(`The current count is ${value}.`));

store.set(2); // This will trigger the function we passed to `subscribe`.

store.update((n) => n + 1); // This is similar to passing a function to
//  `useState` in React.
```

Like I said, the extra fun comes with the fact that basically anything can be a store as long as it abides by the contract that comes along with stores. What's involved in this? Basically, you need to implement the following:

- An object that has a `subscribe` method.
- That `subscribe` method should return a function that allows you to unsubscribe from changes.
- Optionally, you can implement a `set` method. This function should ideally change the underlying data structure that the store is wrapping.

**Fun Fact**: Above, I demonstrated how you can prefix a store with `$` in your Svelte component and the compiler will figure out all of the details. If you have a `set` method defined then you can write `$store = newValue` and the compiler will automatically interpret that to mean `store.set(newValue)`. Once you've pulled a store into your Svelte component, you can basically just treat it like any normal JavaScript object—so long as you've prefixed it with `$`.

## Creating Your Own Custom Store

Here is an obnoxiously simple store that you definitely shouldn't use, but should illustrate how simple it is under the hood.

```js
const createWritableStore = (value) => {
	// Create a data structure to keep track of all of the subscribers.
	const subscribers = new Set();

	// Define a `subscribe` method. It should take a callback function as an
	// argument.
	const subscribe = (fn) => {
		// Add the function to data structure above.
		subscribers.add(fn);
		// Call the function with the current value of the store.
		fn(value);
		// Return a function that allows you to remove this function from the list
		// of subscribers.
		return () => subscribers.delete(fn);
	};

	// `set` is a method that takes a new value and updates the one we're storing
	// in memory when we created the store and passed `value` in.
	const set = (newValue) => {
		value = newValue;
		// After updating value, call all of the subscibers and tell them about the
		// new value.
		for (const fn of subscribers) {
			fn(value);
		}
	};

	// Return our subscribe and set methods as an object. This adheres to the
	// basic interface of a Svelte store.
	return {
		subscribe,
		set,
	};
};
```

Now, the real implementation does a bunch of fun things like—you know—making sure you're actually passing it functions as a subscribers. So, definitely use the stores that Svelte provides over my naïve implementation above. But, this oversimplification should at least help you wrap your mind around how Svelte stores under the hood.

## Abstracting Writeable Stores

Sometimes you want all of the goodness of a store, but you want to give it a cleaner interface. For example, instead of letting just anyone set the value of the store to _anything_, you want to only allow consumers to increment the count, decrement the count, and reset it back to zero. (As opposed to doing something wild like setting it to a string. Some people just want to see the world burn.) Like I said earlier, as long as you abide by the store contract, you can do whatever you want and it still counts as a store.

Okay, so what does this mean—this basically means that you can proxy the subscribe method and then add whatever methods you want that will handle updating the values.

Let's do this with a counter—because who doesn't love a good counter?

```ts
const createCounter = (initialCount) => {
  const { subscribe, update, set } = writable(initialCount);

  return {
    subscribe,
    increment: () = update(count => count + 1),
    decrement: () = update(count => count - 1),
    reset: () = set(0),
  }
};
```

With this, we're still using `set` and `update`, but they're hidden from whoever is on the receiving end of the object that comes out of `createCounter`. They can `subscribe` to changes, they can `increment`, `decrement`, and `reset` the value—but they can't call `update` or `set` directly. Using the `$` syntax, they can just use it as a value that updates and you're UI will reflect those changes accordingly.

## Readable Stores

A readable store is just an abstraction around a writable store that hides the `set` method from you. Instead, it takes a callback that allows you figure out what it should listen to in order to be able to update stuff. For example, you could set up a readable store and with the callback function, you could have it listen for messages over a WebSocket connection or call an API at some interval.

```ts
const store = readable(0, (set) => {
	// The function passed in to a readable store is just the `set` method from a
	// writable store, but it's only available internally and will not be exposed
	// on the store that is returned from calling `readable`.
	const interval = setInterval(() => {
		set(Date.now());
	}, 1000);

	// You should return a function that should be called when the last
	// subscriber unsubscribes from your store.
	return () => clearInterval(interval);
});
```

This is a simplified version of how a readable store is implemented in the Svelte codebase.

```ts
const createReadableStore = (initialValue, fn) => {
	const store = createWritableStore(initialValue);

	fn(store.set);

	return { subscribe: store.subscribe };
};
```

It's just a closure around a writable store that hides that pesky `set` method from you. With that function, you can—and should—return a function that figures out how unsubscribe should work.

## Derived Stores

Derived stores subscribe to some other store and reactively update whenever one of the underlying stores change. If it's helpful, you can think of them as [computed properties in Ember][ember] or [MobX][mobx] or as selectors using [Redux][redux] with either [Reselect][reselect] or [the `useSelector` hook][redux].

You're basically saying:

- Listen to this other store,
- when it changes, this is what I want you to do,
- and then return a readable store based on that transformation.

[ember]: https://guides.emberjs.com/v3.3.0/object-model/computed-properties/
[mobx]: https://mobx.js.org/computeds.html
[redux]: https://react-redux.js.org/api/hooks#useselector-examples
[reselect]: https://github.com/reduxjs/reselect

Here is a real world example of a derived store in action. [SvelteKit][kit] is a framework that provides a lot of the common infrastructure for building Svelte applications. It is kind of like [NextJS][next] or even [Create React App][cra] (if you squint real hard), but for Svelte instead of React. It provides a bunch of stores out of the box and the `page` store is one of them. `page` gives you some of the information about the current route: the path, dynamic parameters in that path, the query parameters, etc.

In multiple places throughout [the application that I'm working on][temporal], I want to know whether we're looking at a given thing in full screen mode, which is determined by whether or not the `?fullScreen=true` query parameter is set. Cool. But, I don't want fuss with the `page` store every time I need figure out if we're in full screen mode or not. So, I created a derived store that looks like this:

```ts
import { page } from '$app/stores';
import { derived } from 'svelte/store';

export const isFullScreen = derived(page, ($page) => {
	const { query } = $page;
	if (!query.has('fullScreen')) return false;
	if (query.get('fullScreen') === 'false') return false;
	return true;
});
```

Let's talk about what's happening here:

- I am calling `derived` and passing it two arguments:
  - the `page` store, and
  - a function that figures out how to translate the contents of that store into what I want.
- The `$page` argument is just the value of the `page` store.
- I pull off the `query` property, although I could just as easily call `$page.query` in the next two lines.
- `query` is an instance of `URLSearchParams`, so I'm using it's API to determine:
  - whether or not there even is a query param called `fullScreen`, and
  - if so, is it set to something other than `"false"`.

Whenever the `page` store is updated, it will push a new value to everything that subscribes to it—just like the bespoke stores we wrote ourselves above. My derived store is a subscriber. When `page` updates, it will figure out if the `fullScreen` query parameter is still set. If this has changed, it will let anything subscribed to the `isFullScreen` store know so that it can update accordingly.

[kit]: https://kit.svelte.dev
[cra]: https://create-react-app.dev/
[temporal]: https://temporal.io

## In Conclusion

Svelte stores are a simple, but incredibly powerful, concept. One point that I want to reiterate is that any JavaScript object that has a `subscribe` method that returns a function allowing you to unsubscribe from the store works. You can put a light wrapper around Redux and use it as a store in Svelte. You can use [observables from RxJS](https://rxjs.dev/guide/observable) as Svelte stores. You can write your own or you can use abstract the built-in writable, readable, and derived stores to create your own functionality.

My thanks to **Rory MacKean** for finding a bunch of errors—typographical and otherwise—in the original version of this post.
