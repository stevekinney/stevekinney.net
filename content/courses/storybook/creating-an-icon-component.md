---
title: Creating an Icon Component
description:
modified: 2024-09-28T11:31:16-06:00
---

I'm not sure that we're going to do this together, but I thought I'd show you my very naïve implementation of an `Icon` component. I want to limit the number of available icons _and_ I want auto-complete to help me find the icon that I need. Here is my very simple icon component that we can start with.

```tsx
import {
	type LucideIcon,
	AlertTriangle,
	Check,
	HelpCircle,
	Info,
	X,
	Zap,
	ChevronDown,
	Skull,
	Star,
	ExternalLink,
	Heart,
} from 'lucide-react';
import { ComponentProps } from 'react';

export type IconProps = ComponentProps<LucideIcon> & {
	type:
		| 'warning'
		| 'check'
		| 'help'
		| 'info'
		| 'x'
		| 'zap'
		| 'chevron'
		| 'skull'
		| 'star'
		| 'external'
		| 'heart';
};

const iconComponents: Record<IconProps['type'], LucideIcon> = {
	warning: AlertTriangle,
	check: Check,
	help: HelpCircle,
	info: Info,
	x: X,
	zap: Zap,
	chevron: ChevronDown,
	skull: Skull,
	star: Star,
	external: ExternalLink,
	heart: Heart,
};

export const Icon = ({ type, ...props }: IconProps) => {
	const IconComponent = iconComponents[type];
	return <IconComponent {...props} />;
};

export const icons = Object.keys(iconComponents) as IconProps['type'][];
```
