---
title: Which Testing Framework Should I Use?
description: An overview of testing frameworks like Jest, Vitest, and Jasmine.
modified: 2024-09-28T15:35:51-06:00
---

You *could* separate testing libraries into two classes:

- **An assertion library**: A library that makes sure that your code does what it expects (or throws an error if it doesn't). Some examples include [Chai](https://www.chaijs.com), [Should.js](https://shouldjs.github.io), [Node's built-in `assert` module](https://nodejs.org/api/assert.html).
- **A test runner**: A process that runs through all of your tests and generates reports. [Mocha](https://mochajs.org) is an example of this. A very basic test running might grep for all of the files that end in `*.test.js` and execute them using Node.

Some modern testing frameworks (namely: [Jasmine](https://jasmine.github.io), [Jest](https://jestjs.io), and [Vitest](https://vitest.dev)) combine a test runner with an assertion library. So, this distinction probably isn't terribly important these days, but I think it's worth calling out. If there was an assertion library that you like *more* than whatever comes built-in with Jest, you *could* swap it out with another assertion library and everything should work as expected.

I'm not going to waste your time and make you eat your vegetables and build one from scratch just to prove a point.

## Adding Vitest to Visual Studio Code

If you use Vitest and Visual Studio Code, there is [a helpful plugin for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) that makes it easy to run your tests from inside your editor. There is also a [Visual Studio Code Plugin for Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest).
