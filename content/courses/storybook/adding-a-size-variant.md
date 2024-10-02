---
title: Adding a Size Variant with CVA
description:
modified: 2024-09-28T11:31:16-06:00
---

In the [previous section](class-variance-authority.md), we looked using [Class Variance Authority](https://cva.style) to programmatically apply Tailwind's utility classes based on the props passed in. Now, we want to do that for the style as well.

The first step is to add another variant.

```diff
@@ -52,9 +52,15 @@ export const variants = cva(
           'active:bg-danger-400',
         ],
       },
+      size: {
+        small: ['text-sm', 'px-2', 'py-1'],
+        medium: ['text-sm', 'px-2.5', 'py-1.5'],
+        large: ['text-sm', 'px-3', 'py-2'],
+      },
     },
     defaultVariants: {
       variant: 'secondary',
+      size: 'medium',
     },
   },
 );
```

Next, we use that in our component.

```diff
@@ -68,5 +68,5 @@ export const variants = cva(
 type ButtonVariants = VariantProps<typeof variants>;

 export const Button = ({ variant = 'primary', size = 'medium', ...props }: ButtonProps) => {
-  return <button className={clsx(variants({ variant }), styles[size])} {...props} />;
+  return <button className={clsx(variants({ variant, size }))} {...props} />;
 };
```

Finally, we can make our type even cleaner.

```diff
@@ -4,10 +4,7 @@ import clsx from 'clsx';

 import styles from './button.module.css';

-type ButtonProps = ComponentProps<'button'> & {
-  variant?: ButtonVariants['variant'];
-  size?: 'small' | 'medium' | 'large';
-};
+type ButtonProps = ComponentProps<'button'> & ButtonVariants;

 export const variants = cva(
   [
```
