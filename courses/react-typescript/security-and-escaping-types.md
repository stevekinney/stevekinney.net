---
title: Security And Escaping Types
description: >-
  Cross-Site Scripting (XSS) attacks remain one of the most common web security
  vulnerabilities, and React applications aren't immune. While React's JSX
  provides some built-in protections by escaping values by default, there are
  still plen...
modified: '2025-09-06T17:49:18-06:00'
date: '2025-09-06T17:49:18-06:00'
---

Cross-Site Scripting (XSS) attacks remain one of the most common web security vulnerabilities, and React applications aren't immune. While React's JSX provides some built-in protections by escaping values by default, there are still plenty of ways to shoot yourself in the foot—especially when dealing with user-generated content, third-party APIs, or that seemingly innocent `dangerouslySetInnerHTML` prop. Let's explore how TypeScript can help us build safer React applications by creating type-safe abstractions for handling untrusted content.

By the end of this guide, you'll understand how to use TypeScript's type system to enforce proper sanitization, create safe wrappers around dangerous operations, and build a mental model for thinking about trusted vs. untrusted data throughout your application.

## The Problem with Trust

Before we dive into solutions, let's establish the core issue: in a web application, not all strings are created equal. Some strings are safe to render directly, while others need to be sanitized or escaped first.

Consider this perfectly innocent-looking React component:

```tsx
// ❌ Dangerous - what if content contains <script> tags?
function UserProfile({ bio }: { bio: string }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}
```

If `bio` contains something like `<script>alert('XSS!');</script>`, you've just executed arbitrary JavaScript in your user's browser. Not ideal.

The traditional approach is to remember to sanitize inputs manually:

```tsx
import DOMPurify from 'dompurify';

// ✅ Better, but easy to forget
function UserProfile({ bio }: { bio: string }) {
  const sanitizedBio = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />;
}
```

This works, but it relies on developer discipline. What happens when someone adds a new component six months from now and forgets the sanitization step? TypeScript can help us make this mistake impossible.

## Modeling Trust with Types

The key insight is that we can use TypeScript's type system to distinguish between trusted and untrusted strings. Once a string has been properly sanitized, we'll wrap it in a branded type that can only be created through safe operations.

Let's start by defining our core types:

```ts
// Brand types to distinguish trusted from untrusted content
export type UntrustedString = string & { readonly __brand: 'UntrustedString' };
export type TrustedHtml = string & { readonly __brand: 'TrustedHtml' };
export type TrustedText = string & { readonly __brand: 'TrustedText' };

// Helper to create untrusted strings from user input
export function untrusted(value: string): UntrustedString {
  return value as UntrustedString;
}
```

These are **branded types**—they're still strings at runtime, but TypeScript treats them as distinct types. The `__brand` property exists only in the type system and helps prevent accidental mixing of trusted and untrusted content.

Now we can create functions that safely transform untrusted content into trusted content:

```ts
import DOMPurify from 'dompurify';

// Sanitize HTML content, removing dangerous elements and attributes
export function sanitizeHtml(content: UntrustedString): TrustedHtml {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
  return sanitized as TrustedHtml;
}

// Escape text content for safe display
export function escapeText(content: UntrustedString): TrustedText {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;') as TrustedText;
}
```

## Type-Safe HTML Rendering

Now we can create a component that only accepts trusted HTML:

```tsx
interface SafeHtmlProps {
  content: TrustedHtml;
  className?: string;
}

function SafeHtml({ content, className }: SafeHtmlProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: content }} />;
}
```

The beauty of this approach is that `SafeHtml` can only be used with content that has been explicitly sanitized:

```tsx
function UserProfile({ bio }: { bio: string }) {
  // This forces explicit sanitization
  const trustedBio = sanitizeHtml(untrusted(bio));

  return <SafeHtml content={trustedBio} />;
}

// ❌ TypeScript error - can't pass raw string
function BrokenProfile({ bio }: { bio: string }) {
  return <SafeHtml content={bio} />; // Error: Type 'string' is not assignable to type 'TrustedHtml'
}
```

## Handling Form Inputs Safely

Form inputs are another common source of XSS vulnerabilities. Let's create a type-safe pattern for handling user input:

```tsx
interface FormData {
  username: UntrustedString;
  email: UntrustedString;
  bio: UntrustedString;
}

function UserForm() {
  const [formData, setFormData] = useState<FormData>({
    username: untrusted(''),
    email: untrusted(''),
    bio: untrusted(''),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate and sanitize before sending to server
    const safeData = {
      username: escapeText(formData.username),
      email: validateEmail(formData.email),
      bio: sanitizeHtml(formData.bio),
    };

    submitUserData(safeData);
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: untrusted(e.target.value),
      }));
    };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.username}
        onChange={handleInputChange('username')}
        placeholder="Username"
      />
      <input
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        placeholder="Email"
      />
      <textarea value={formData.bio} onChange={handleInputChange('bio')} placeholder="Bio" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Email Validation with Safety

Here's how we might implement that `validateEmail` function with proper error handling:

```ts
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateEmail(email: UntrustedString): TrustedText {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }

  // Additional sanitization - remove any potential HTML/JS
  return escapeText(email);
}
```

## Real-World Integration with APIs

When working with external APIs, you often can't trust the data you receive. Here's how to handle API responses safely:

```ts
import { z } from 'zod';

// Define expected API response structure
const ApiUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  bio: z.string(),
  avatar_url: z.string().url().optional(),
});

type ApiUser = z.infer<typeof ApiUserSchema>;

// Transform API data into our trusted types
async function fetchUser(userId: number): Promise<{
  id: number;
  username: TrustedText;
  email: TrustedText;
  bio: TrustedHtml;
  avatarUrl?: string;
}> {
  const response = await fetch(`/api/users/${userId}`);
  const rawData = await response.json();

  // Validate the structure first
  const userData = ApiUserSchema.parse(rawData);

  // Then sanitize the content
  return {
    id: userData.id,
    username: escapeText(untrusted(userData.username)),
    email: escapeText(untrusted(userData.email)),
    bio: sanitizeHtml(untrusted(userData.bio)),
    avatarUrl: userData.avatar_url,
  };
}
```

This approach combines Zod's runtime validation with our security types, ensuring that data is both structurally correct and properly sanitized.

## Advanced: Content Security Policies

For additional security, consider implementing Content Security Policy (CSP) headers alongside your type-safe sanitization:

```tsx
// In your HTML head or Next.js app
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
].join('; ');

// This would typically be set as an HTTP header
// Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

CSP acts as a second line of defense—even if malicious content somehow makes it through your sanitization, the browser will block its execution.

## Utility Functions for Common Cases

Here are some handy utilities you might want in your security toolkit:

```ts
// Create trusted content from compile-time constants
export function trusted<T extends string>(content: T): TrustedHtml {
  return content as TrustedHtml;
}

// Combine multiple trusted HTML pieces
export function joinTrustedHtml(pieces: TrustedHtml[], separator = ''): TrustedHtml {
  return pieces.join(separator) as TrustedHtml;
}

// Template literal helper for trusted HTML
export function html(strings: TemplateStringsArray, ...values: TrustedHtml[]): TrustedHtml {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += values[i] + strings[i + 1];
  }
  return result as TrustedHtml;
}

// Usage examples:
const staticContent = trusted('<p>This is safe static content</p>');
const userContent = sanitizeHtml(untrusted(userInput));
const combined = html`<div>${staticContent}${userContent}</div>`;
```

## Testing Your Security Measures

Don't forget to test your sanitization logic! Here are some common XSS payloads to test against:

```ts
// security.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeText, untrusted } from './security';

describe('sanitization', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
  ];

  it('should remove dangerous script tags', () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeHtml(untrusted(payload));
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
    });
  });

  it('should escape text content properly', () => {
    const dangerous = '<script>alert("xss")</script>';
    const escaped = escapeText(untrusted(dangerous));
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
```

## Performance Considerations

Sanitization isn't free—DOMPurify needs to parse and clean HTML, which can be expensive for large content. Consider these optimizations:

- **Memoization**: Cache sanitized content to avoid re-processing
- **Lazy sanitization**: Only sanitize content when it's actually displayed
- **Server-side sanitization**: Clean content once on the server rather than on every client render

```tsx
import { useMemo } from 'react';

function OptimizedUserProfile({ bio }: { bio: string }) {
  // Memoize expensive sanitization
  const trustedBio = useMemo(() => sanitizeHtml(untrusted(bio)), [bio]);

  return <SafeHtml content={trustedBio} />;
}
```

## What We've Accomplished

By leveraging TypeScript's type system, we've created a security model that:

- **Makes unsafe operations explicit** through branded types
- **Forces sanitization** before dangerous operations like `dangerouslySetInnerHTML`
- **Provides clear boundaries** between trusted and untrusted data
- **Integrates with existing validation** libraries like Zod
- **Scales across your application** without relying on developer discipline

> [!TIP]
> Start by identifying all the places in your app where untrusted content enters the system—form inputs, API responses, URL parameters, localStorage values. These are your security boundaries.

The type system won't catch every possible security issue, but it will eliminate the most common XSS vulnerabilities by making unsafe operations impossible to perform accidentally. Combined with proper testing, CSP headers, and security-minded code review, you'll have a robust defense against client-side attacks.

Remember: security is about defense in depth. Types are one layer—make sure you're thinking holistically about your application's security posture.
