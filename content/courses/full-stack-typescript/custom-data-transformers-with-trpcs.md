### Custom Data Transformers

When you need to serialize `Date`, `Map`, or `BigInt` fields, consider [SuperJSON](https://github.com/blitz-js/superjson). Install `superjson` and register it in both server and client:

```ts
import superjson from 'superjson';

const t = initTRPC.create({
	transformer: superjson,
});
```

And on the client:

```ts
createTRPCClient<AppRouter>({
	transformer: superjson,
	links: [
		/* ... */
	],
});
```

Now your date objects will remain actual `Date` objects on the client, not random strings.
