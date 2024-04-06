---
title: 'Solution: Adding Button Size Variants and Controls'
description:
exclude: false
drafted: false
modified: 2024-04-03T13:29:58-06:00
---

We should also probably update the component as well, right?

```tsx
import { ComponentProps } from 'react';
import clsx from 'clsx';

import styles from './button.module.css';

type ButtonProps = ComponentProps<'button'> & {
	variant?: 'primary' | 'secondary' | 'destructive';
	size?: 'extra-small' | 'small' | 'medium' | 'large';
};

export const Button = ({ variant = 'primary', size = 'medium', ...props }: ButtonProps) => {
	return <button className={clsx(styles.button, styles[variant], styles[size])} {...props} />;
};
```

Lastly, we need to add additional stories for our button sizes.

```tsx
export const ExtraSmall: Story = {
	args: {
		children: 'Button',
		size: 'extra-small',
	},
};

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
