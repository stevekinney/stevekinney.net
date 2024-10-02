---
title: 'Solution: Adding Button Size Variants and Controls'
description:
modified: 2024-09-28T11:31:16-06:00
---

We should also probably update the component as well, right?

```tsx
import { ComponentProps } from 'react';
import clsx from 'clsx';

import styles from './button.module.css';

type ButtonProps = ComponentProps<'button'> & {
	variant?: 'primary' | 'secondary' | 'destructive';
	size?: 'small' | 'medium' | 'large';
};

export const Button = ({ variant = 'primary', size = 'medium', ...props }: ButtonProps) => {
	return <button className={clsx(styles.button, styles[variant], styles[size])} {...props} />;
};
```

Lastly, we need to add additional stories for our button sizes.

```tsx
export const Small: Story = {
	args: {
		children: 'Button',
		size: 'small',
	},
};

export const Medium: Story = {
	args: {
		children: 'Button',
		size: 'medium',
	},
};

export const Large: Story = {
	args: {
		children: 'Button',
		size: 'large',
	},
};
```

As promised, it's time to talk about [default arguments](default-args.md).
