---
title: Integrating Figma Designs into Storybook
description:
modified: 2024-09-28T11:31:16-06:00
---

A lot of times it'd be nice to see what we're implementing in the same place where we're reviewing our implementation. If you're using Figma, then you can integrate into your stories to make your life just a little bit easier.

> [!NOTE] Storybook can integrate with more than just Figma
> We're using Figma, but the [Designs addon](https://storybook.js.org/addons/@storybook/addon-designs/) works with more than just Figma. You can read the full documentation [here](https://storybookjs.github.io/addon-designs/?path=/docs/docs-quick-start--docs).

First, we'll need to install another addon into Storybook.

```sh
npx storybook@latest add @storybook/addon-designs
```

Running this script will install the dependency as well as add it to `.storybook/main.ts`.

Head over into Figma and click on the **Share** button towards the right in the toolbar and then select **Copy Link**.

![Sharing a Figma file](assets/storybook-figma-share-file.png)

Next, in your story, we're going to add a parameter that creates the link between the story and the designs.

```ts
const meta: Meta<typeof Button> = {
	title: 'Button',
	component: Button,
	parameters: {
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/w7qcf0DQZEQhudgeOoLbZ8/Components?type=design&node-id=24%3A177&mode=design&t=i9nPQJAFW2alh32c-1',
		},
	},
	// …additional properties…
};
```

And now, when you start up storybook, you'll be able to see both side by side.

![Figma design alongside Storybook](assets/storybook-alongside-figma.png)
