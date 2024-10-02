---
title: Adding an Icon Gallery to Storybook
description:
modified: 2024-09-28T11:31:16-06:00
---

There are lots of icons out there, but typically, you want to use as many icons as you need but as few as you can get away with in your application or design system. Storybook's `IconGallery` block makes it easy to show off the icons that you intend to use in your application.

There is not a lot to making an icon gallery in Storybook.

```mdx
import { Meta, Title, IconGallery, IconItem } from '@storybook/blocks';
import { icons, Icon } from './components/icon';

<Meta title="Icons" />

<Title>Icons</Title>

These are the icons being used in our design system. They are available as React components.

<IconGallery>
	{icons.map((icon) => (
		<IconItem key={icon} name={icon}>
			<Icon type={icon} />
		</IconItem>
	))}
</IconGallery>
```

![An icon gallery in Storybook](assets/storybook-icon-gallery@2x.png)

> [!example] The implementation of the `Icon` component
> You can check out my implementation of the `Icon` component [here](creating-an-icon-component.md).
