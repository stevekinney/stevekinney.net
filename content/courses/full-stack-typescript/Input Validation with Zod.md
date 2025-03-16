---
title: Input Validation with Zod
description: 'Use Zod with React Hook Form to create robust, type-safe form validation in your frontend applications.'
modified: 2025-03-15T14:44:38-06:00
---

One popular approach is to use **React Hook Form** (a form state management library) in combination with Zod. React Hook Form has official support for Zod via a resolver. The setup looks like this:

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const FormSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});
type FormData = z.infer<typeof FormSchema>;

function MyFormComponent() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(FormSchema)
  });

  const onSubmit = (data: FormData) => {
    console.log("Valid form data:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {…register("username")} placeholder="Username" />
      {errors.username && <span>{errors.username.message}</span>}

      <input {…register("password")} type="password" placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

In this example, `zodResolver(FormSchema)` tells React Hook Form to use Zod to validate the form values against `FormSchema`. The `errors` object will contain any validation errors (with our custom messages, if provided in the schema). Each field’s error message is easily accessible (e.g. `errors.username.message`). This setup ensures that when the user submits the form (or as they blur fields, depending on configuration), the Zod schema runs and either allows the submission (with `data` being fully typed and validated) or returns errors that you can display.

The benefit of this approach is a **single source of truth** for validation – the same schema could be used on the backend to validate incoming data. It also means less manual wiring of error messages; Zod’s messages and errors flow naturally into the form. Moreover, by validating on the client side, you improve UX by catching mistakes early (e.g., showing “Password must be at least 8 characters” as soon as the check fails) rather than waiting for a server round trip.

Even if you’re not using a form library, you can still use Zod in React by manually calling `schema.safeParse` on, say, form submit. For instance, you could use a React component’s state for form inputs and on submit do `const result = FormSchema.safeParse(formState)`. If `result.success` is false, set error messages accordingly; if true, proceed. But libraries like React Hook Form simplify this by tying into component state and re-renders for you.

In summary, Zod on the frontend helps maintain **type safety and validation consistency**. You get to leverage the same robust validation rules in the browser, leading to more resilient applications. And thanks to integrations like React Hook Form’s resolver, setting it up is very convenient – you largely just plug in your schema and let the library handle the rest.
