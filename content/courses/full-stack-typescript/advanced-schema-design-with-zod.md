---
title: Advanced Schema Design with Zod
---

Zod offers advanced schema design patterns to handle complex validation scenarios effectively.

## Recursive Data Structures with `z.lazy()`

Handle schemas that reference themselves recursively (e.g., tree-like structures). `z.lazy()` allows you to define a schema that refers to itself without causing circular dependency issues during schema definition.

```ts
interface Category {
	name: string;
	subcategories?: Category[]; // Recursive reference
}

const categorySchema: z.ZodSchema<Category> = z.lazy(() =>
	z.object({
		name: z.string(),
		subcategories: z.array(categorySchema).optional(), // Use lazy schema here
	}),
);

const validCategory: Category = {
	name: 'Electronics',
	subcategories: [
		{ name: 'Computers' },
		{ name: 'Phones', subcategories: [{ name: 'Smartphones' }] },
	],
};

categorySchema.parse(validCategory); // Valid

const invalidCategory: any = {
	name: 'Books',
	subcategories: [{ name: 123 }], // Invalid subcategory type
};

// categorySchema.parse(invalidCategory); // Throws ZodError: Expected object, received number at 'subcategories[0].name'
```

## Preprocessing for Complex Validation with `z.preprocess()` and `z.superPreprocess()`

Use preprocessing to handle complex data transformations or conditional validation logic before applying the main schema validation. This is particularly useful when dealing with data that requires significant preparation before it can be validated against a specific schema.

```ts
const complexDataSchema = z.preprocess(
	(input) => {
		if (typeof input === 'string' && input.startsWith('{') && input.endsWith('}')) {
			try {
				return JSON.parse(input); // Attempt to parse JSON string
			} catch (e) {
				return input; // If parsing fails, return original string for string validation
			}
		}
		return input; // Return original input if not a JSON-like string
	},
	z.union([
		z.object({
			// Schema for parsed JSON object
			type: z.literal('json'),
			data: z.object({ value: z.number() }),
		}),
		z.string().startsWith('prefix-'), // Schema for string with prefix
	]),
);

complexDataSchema.parse('{ "type": "json", "data": { "value": 42 } }'); // Valid, parses JSON and validates object schema
complexDataSchema.parse('prefix-string-value'); // Valid, validates string schema
// complexDataSchema.parse("invalid json string"); // Throws ZodError for string schema validation failure
```

By mastering schema construction, refinement, transformation, and error handling, you gain the power to define precise data expectations and enforce them rigorously at runtime with Zod.

## Zod and TypeScript Synergy: A Powerful Partnership

Zod is designed to work seamlessly with TypeScript, enhancing the developer experience and maximizing type safety throughout your applications.

### Type Inference: Bridging Runtime and Compile Time

Zod's powerful type inference capabilities are a game-changer for TypeScript developers. The `z.infer<typeof schema>` utility allows you to automatically extract the TypeScript type from a Zod schema. This eliminates the need to manually define types that mirror your schemas, reducing redundancy and ensuring type consistency between your validation logic and your TypeScript code.

```ts
const productSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(2),
	price: z.number().positive(),
	description: z.string().optional(),
});

// Infer the TypeScript type from the Zod schema
type Product = z.infer<typeof productSchema>;

function processProduct(product: Product) {
	console.log(`Processing product: ${product.name} (ID: ${product.id}), Price: $${product.price}`);
	// ... further logic with type-safe 'product' object
}

const validProductData = {
	id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
	name: 'Awesome Gadget',
	price: 99.99,
};

const parsedProduct = productSchema.parse(validProductData); // Runtime validation
processProduct(parsedProduct); // Type-safe usage of validated data
```

With `z.infer`, you establish a single source of truth for your data structure – the Zod schema. TypeScript automatically understands the shape of the validated data, providing compile-time type safety for data validated at runtime.

### Function Signatures: Ensuring Type Safety at Function Boundaries

Zod schemas can be used to define precise type signatures for function parameters and return values, extending type safety beyond object structures to function interfaces. This is particularly useful for ensuring type correctness when working with functions that handle external data or perform complex data transformations.

```ts
const configSchema = z.object({
	apiKey: z.string(),
	apiUrl: z.string().url(),
	timeout: z.number().positive().default(5000), // Default timeout in milliseconds
});
type Config = z.infer<typeof configSchema>;

function initializeApp(configData: unknown): Config {
	// Input as 'unknown' to force runtime validation
	const config = configSchema.parse(configData); // Runtime validation of config data
	console.log('App initialized with config:', config);
	return config; // Type-safe Config object returned
}

const validConfigData = {
	apiKey: 'your-api-key',
	apiUrl: '[https://api.example.com](https://www.google.com/search?q=https://api.example.com)',
	// timeout is optional, default will be used
};

const appConfig = initializeApp(validConfigData); // Runtime validation and type-safe config
// initializeApp({ apiKey: 123, apiUrl: "invalid-url" }); // Runtime validation error

// Type-safe access to config properties
console.log('API Key:', appConfig.apiKey);
console.log('API URL:', appConfig.apiUrl);
console.log('Timeout:', appConfig.timeout);
```

By using Zod schemas to define function signatures, you create clear contracts for your functions, ensuring that they receive and return data in the expected format, validated at runtime.

### Asynchronous Validation: Handling External Data Sources

Zod supports asynchronous validation with the `schema.parseAsync(data)` method. This is crucial for scenarios where validation logic needs to interact with external resources, such as databases or APIs, to perform checks.

```ts
import { z } from 'zod';

const usernameSchema = z
	.string()
	.min(3)
	.refine(
		async (username) => {
			// Simulate asynchronous check against a database or API
			await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network latency
			const isUsernameTaken = await checkUsernameAvailability(username); // Assume this function checks username in a database
			return !isUsernameTaken; // Username is valid if not taken
		},
		{ message: 'Username is already taken' },
	);

async function validateUsername(username: string) {
	try {
		const validatedUsername = await usernameSchema.parseAsync(username);
		console.log(`Username "${validatedUsername}" is valid and available.`);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error('Username validation failed:', error.errors);
		} else {
			console.error('Unexpected error:', error);
		}
	}
}

// Assume checkUsernameAvailability is an asynchronous function that checks username availability
async function checkUsernameAvailability(username: string): Promise<boolean> {
	// ... (Implementation to check username in database or API) ...
	// Simulate:
	const takenUsernames = ['takenUser', 'anotherTakenUser'];
	return takenUsernames.includes(username);
}

validateUsername('newUser123'); // Validates asynchronously, assuming "newUser123" is available
// validateUsername("takenUser"); // Validates asynchronously, throws ZodError: Username is already taken
```

`parseAsync()` returns a Promise that resolves with the validated data if validation succeeds or rejects with a `ZodError` if validation fails. This enables you to seamlessly integrate asynchronous validation into your application's data flow.

### Zod in the Wild: Real-World Applications

Zod's versatility makes it applicable across various contexts in TypeScript development. Here are some common real-world use cases:

## API Request/Response Validation

In server-side applications (e.g., Express, NestJS), use Zod to validate incoming API requests and outgoing API responses. This ensures data integrity at your API boundaries.

```ts
import express, { Request, Response } from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const createUserSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(8),
});

app.post('/users', async (req: Request, res: Response) => {
	try {
		const userData = createUserSchema.parse(req.body); // Validate request body
		// ... (Create user in database using validated userData) ...
		res.status(201).json({ message: 'User created successfully', user: userData });
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ errors: error.errors }); // Return validation errors to client
		} else {
			res.status(500).json({ message: 'Server error' });
		}
	}
});

app.listen(3000, () => console.log('Server listening on port 3000'));
```

## Form Validation

In web applications (e.g., React, Angular, Vue.js), use Zod to validate user inputs in forms. This provides robust client-side validation and improves user experience.

```ts
import React, { useState } from 'react';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});
type ContactFormData = z.infer<typeof contactFormSchema>;

function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<z.ZodError<ContactFormData> | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationResult = contactFormSchema.safeParse(formData); // Validate form data

    if (validationResult.success) {
      console.log('Form data is valid:', validationResult.data);
      setErrors(null); // Clear errors
      // ... (Submit form data) ...
    } else {
      console.error('Form validation errors:', validationResult.error.errors);
      setErrors(validationResult.error); // Set errors to display to user
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
        {errors?.formErrors
          .filter((err) => err.path[0] === 'name')
          .map((err) => (
            <p className="error">{err.message}</p>
          ))}
      </div>
      {/* ... (Email and Message fields and error display similar to Name) ... */}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Data Serialization/Deserialization

Validate and transform data when serializing to or deserializing from formats like JSON or when interacting with storage systems.

```ts
import { z } from 'zod';

const userDataSchema = z.object({
	userId: z.number(),
	username: z.string(),
	profileData: z
		.object({
			bio: z.string().optional(),
			avatarUrl: z.string().url().optional(),
		})
		.nullable(), // Profile data can be null
});
type UserData = z.infer<typeof userDataSchema>;

function serializeUserData(user: UserData): string {
	userDataSchema.parse(user); // Validate before serialization
	return JSON.stringify(user);
}

function deserializeUserData(jsonString: string): UserData {
	const parsedData = JSON.parse(jsonString);
	return userDataSchema.parse(parsedData); // Validate after deserialization
}

const userToSerialize: UserData = {
	userId: 123,
	username: 'testUser',
	profileData: {
		bio: 'Software developer',
		avatarUrl:
			'[https://example.com/avatar.png](https://www.google.com/search?q=https://example.com/avatar.png)',
	},
};

const serialized = serializeUserData(userToSerialize);
console.log('Serialized user data:', serialized);

const deserialized = deserializeUserData(serialized);
console.log('Deserialized user data:', deserialized);
```

## Configuration Validation

Enforce type safety for application configuration files, ensuring that configuration values are valid and prevent runtime errors due to misconfigurations.

```ts
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';

const appConfigSchema = z.object({
	server: z.object({
		host: z.string(),
		port: z.number().positive(),
	}),
	database: z.object({
		url: z.string().url(),
		username: z.string(),
		password: z.string(),
	}),
	featureFlags: z.record(z.string(), z.boolean()).optional(), // Optional feature flags
});
type AppConfig = z.infer<typeof appConfigSchema>;

function loadConfig(configPath: string): AppConfig {
	try {
		const configFile = fs.readFileSync(configPath, 'utf8');
		const configData = yaml.load(configFile); // Load YAML config
		return appConfigSchema.parse(configData); // Validate config data
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error('Configuration validation failed:', error.errors);
		} else {
			console.error('Error loading configuration:', error);
		}
		throw new Error('Failed to load application configuration.');
	}
}

const config = loadConfig('./config.yaml'); // Load and validate configuration from YAML file
console.log('Loaded configuration:', config);

// Type-safe access to configuration values
console.log('Server Host:', config.server.host);
console.log('Database URL:', config.database.url);
```

These examples demonstrate the breadth of Zod's applicability. By integrating Zod into your TypeScript projects, you can significantly enhance data validation and type safety across various application layers.

## Custom Error Maps

Zod’s default error messages might be a bit robotic for your taste. Use a custom error map to globally or locally tweak them.

### Setting a Global Error Map

```ts
import { z, ZodError, ZodIssueCode } from 'zod';

z.setErrorMap((issue, ctx) => {
	if (issue.code === ZodIssueCode.invalid_type) {
		return { message: `Invalid type: expected ${issue.expected}, got ${issue.received}` };
	}
	// fallback to default message
	return { message: ctx.defaultError };
});

z.string().parse(123);
// => "Invalid type: expected string, got number"
```

### Schema-Level Error Map

```ts
const mySchema = z.string().errorMap((issue, ctx) => {
	return { message: "This isn't a string—cut it out." };
});
```

### Why Use Error Maps?

- Centralized, consistent error styling.
- Local or global overrides.
- Friendlier messages that are more domain-specific.

Coercion Schemas: Let Zod Do the Parsing

If you receive string inputs that represent numbers, booleans, or dates, try the new `z.coerce.*` APIs to automatically convert them.

### Example: Coercing Strings to Numbers

```ts
import { z } from 'zod';

const numberFromString = z.coerce.number().min(10);

// "15" -> 15 -> passes
numberFromString.parse('15');

// "8" -> 8 -> fails because it's < 10
```

#### Other Coercions

- `z.coerce.boolean()`
- `z.coerce.date()`

This is simpler than writing manual `.preprocess()` or `.transform()` in many cases.

## Schema Merging

`objectSchemaA.merge(objectSchemaB)` merges two object schemas, combining (and overriding) properties.

### Example

```ts
import { z } from 'zod';

const schemaA = z.object({
	name: z.string(),
	age: z.number(),
});

const schemaB = z.object({
	age: z.number().min(18),
	email: z.string().email(),
});

const merged = schemaA.merge(schemaB);
// => z.object({
//      name: z.string(),
//      age: z.number().min(18),
//      email: z.string().email(),
//    });
```

### Difference vs. Intersection

- `merge` only works on object schemas and merges properties (with the second schema overwriting clashing keys).
- `intersection` can combine any schemas (not just objects) and requires both validations to pass.
