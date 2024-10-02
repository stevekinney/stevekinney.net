---
title: Understanding Generics in TypeScript
description: "Let's learn a little bit about what generics are in TypeScript, why they're useful, and how to use them."
date: 2021-08-16T16:00:00.006Z
modified: 2024-09-28T11:31:14-06:00
published: true
tags:
  - typescript
---

When you're first learning TypeScript, you typically start by adding fairly straight-forward type annotations to your functions and variables. All is good in the world and it feels easy. For example, you might take a function that is allegedly supposed to add two numbers together and make sure that it _actually_ takes two numbers as arguments.

```ts
const add = (x: number, y: number) => {
	return x + y;
};
```

You can even go as far as telling TypeScript that this function returns a number as well, but you don't need to. TypeScript will infer that due to the fact that there is only one code path (e.g. no conditionals, loops, or anything of that nature) and if you add two numbers together, you're going to get a number.

- **Some free advice that you didn't ask for**: When in doubt, let TypeScript infer types, if possible. Typically, it does a better job and finds a more restrictive type than you might on your own.
- **Caveat**: A lot of times, I will add an annotation for the return value when I'm first developing the function. It's like a free unit test.

Once you've gotten the basics of TypeScript down, it's time to take a look at generics. [Generics][gen] allow us to be a little bit more flexible with our type system. You can think of them as variables for your types.

[gen]: https://www.typescriptlang.org/docs/handbook/2/generics.html

Let's say you want to build a linked list data structure. Very cool. Ideally, we want to create a linked list where the value can be of any type. But, we want all of the nodes in any given linked list to be of the _same_ type.

That last requirement means that we _cannot_ use the `any` type, because that's just chaos mode: Sure, it would allow the first node in the linked list to be of `any` type, but it would not force subsequent nodes in that list to be of the same type.

Before your brain fully clicks with generics, you might be tempted to create a whole bevy of linked list types. You'd make one for numbers, one for strings, one for objects where the keys are strings and the values are numbers, so on and so forth. (When I say _you_, I'm mostly projecting. I mean _me_. I was tempted to do this until every fiber of my being screamed at me to stop.)

This is where we might use a generic. You might have seen some syntax at looks like this:

```tsx
type Link<T> = {
	value: T;
	next?: Link<T>;
};
```

What's going on here? Well, `T` in this case is a _generic_. What we're saying here is that we want to create a linked list node of _some_ type. We want the value to be of that type and the next node should also be a linked list node of the same type. (I'm calling it a `Link`, because "Node" means things in JavaScript land.) It's common to use `T` because it stands for "type," but—like any other variable name—it _could_ be anything. You could make it `Link<MeatballSandwich>` if you hated your colleagues as well as your future self.

We can't just make a new object with that type.

```ts
const link: Link = {};
```

Why? Because as much as TypeScript wants to help us out, we haven't given it enough information. TypeScript is saying, "help me help you. Sure, you want make a `Link`, but what is `T` going to be? Can you tell me so that I can make sure that it's always `T`? Thanks!"

We can define what type `T` should be.

```ts
const link: Link<string> = { value: 'hello' };
```

`<T>` in our type definition is getting filled in with `string` in this case. This means that everywhere where we saw `T` in our type definition will now be replaced with `string` for this particular instance.

This won't work:

```ts
const firstLink: Link<number> = {
	value: 2,
	next: {
		value: 'string', // This won't work.
	},
};
```

This will work, however:

```ts
const firstLink: Link<number> = {
	value: 2,
	next: {
		value: 4,
	},
};
```

TypeScript will try to help you out as much as possible. `T` is both the value of that node and also set for all of the `next` nodes in the linked list. You now have type safety and can be confident that every value in the chain has the same type. Even if you try to add a node with a string value somewhere far away in your code base, TypeScript will be there to protect you from yourself. That's what I call a good friend.

## Using Generics with Functions

You can also use a generic in a function. `identity` is a common utility function. It's frequently used in libraries as a placeholder function. The idea is simple, it's a function that immediately returns whatever argument it was handed. For example, you might use this in a library where a consumer can pass in optional function to map over the values with, but if they don't you want your library code to move along with a reasonable default like `identity`.

As with the linked list example, it would _less than ideal_ if we had to make new functions for every different type that we anted to use the identity function on.

```ts
function identity<T>(arg: T) {
	return arg;
}
```

Here we're saying whatever the argument passed in is, that should also be the return type. Both the argument and the return type are `T`.

```ts
identity<number>(3);
```

We're now calling `identity` saying that the argument and the return values are both numbers. But this is kind of tedious, right? Clearly `3` is a number, so why do I need to tell `identity` that `3` is a number? It turns out that you don't. TypeScript will try its darnest to help out. If possible, it will infer the type and set `T` for you.

```ts
identity(3);
```

This gets all of the type safety of knowing that the return value of `identity` is also a number. If you passed in a string as the argument instead, it would set `T` to string for that execution and know that the return value is a string.

## Your Turn to Try This Out

Are you familiar with the [`tap` utility method](https://lodash.com/docs/#tap)? `tap` takes an argument and a function. It passes the argument into the function and immediately returns the return value.

For example:

```js
const arrayWithoutLast = tap([1, 2, 3, 4], function (array) {
	// Pop always returns the value it removed from the end of the array.
	return array.pop();
});
```

Here are the nuances: It not only needs to figure out the type like `identity` but it also needs to pass that same type into the function, _and_ it needs to return that type. The callback function is just mutating the object, so it doesn't need to return anything.

The following code should return the original array without the last item.

```ts
const popped = tap([1, 2, 3], (n) => n.pop());
```

(You can peek at the solution [here](https://gist.github.com/stevekinney/d14cbaff3e0aa8ee3e1dcf96837af1ca)).
