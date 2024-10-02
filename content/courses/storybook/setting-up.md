---
modified: 2024-09-28T11:31:16-06:00
title: Setting Up Storybook
description:
---

Storybook handles most of it's own configuration. Inside of an existing projects, you just need to run the following command.

```bash
npx storybook@latest init
```

When you run this command, Storybook will take a look at your project and try to figure out what framework—if any—that you're using along with what build tools you're using. For the sake of argument, let's say we're using React, TypeScript, and Vite.

Storybook will install the following dependencies:

- [`@chromatic-com/storybook`](https://npm.im/@chromatic-com/storybook)
- [`@storybook/addon-essentials`](https://npm.im/@storybook/addon-essentials)
- [`@storybook/addon-interactions`](https://npm.im/@storybook/addon-interactions)
- [`@storybook/addon-links`](https://npm.im/@storybook/addon-links)
- [`@storybook/blocks`](https://npm.im/@storybook/blocks)
- [`@storybook/react`](https://npm.im/@storybook/react)
- [`@storybook/react-vite`](https://npm.im/@storybook/react-vite)
- [`@storybook/test`](https://npm.im/@storybook/test)

Additionally, [`eslint-plugin-storybook`](https://npm.im/eslint-plugin-storybook) will be installed _only_ if you're already using [ESLint](https://eslint.org/) in your project.

There is one additional dependency, [`@storybook/addon-onboarding`](https://npm.im/@storybook/addon-onboarding), that will _only_ be installed with certain frameworks. You'll also most likely be removing it later.

It will also create `.storybook` directory at the root of your project with two files:

- `.storybook/main.ts`
- `.storybook/preview.ts`

It will set you up with some basic stories in `src/stories`.

Lastly, it will start up a server running on port 6006. You can start this server up at any time using `npm run storybook`.

![Storybook's initial welcome screen](assets/storybook-welcome-screen.png)

With that, let's take a look at [writing our first story](writing-stories).
