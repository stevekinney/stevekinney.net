---
title: Setting Up a Python Environment on macOS
description: A brief guide for getting started writing Python on a Mac using virtual environments.
date: 2024-08-06T16:00:00.006Z
modified: 2024-09-28T11:31:14-06:00
published: true
tags:
  - python
  - virtual-env
---

So, you want to get started writing some Python on your Macintosh computer. That seems reasonable. Let's walk through some of the steps.

## Install the Xcode Command Line Tools

I can't remember if you're going to need this immediately, but you're going to need this _eventually_. Let's get it out of the way now.

```sh
xcode-select --install
```

> [!Info] Why do I need this?
> Apple offers the Xcode Command Line Tools, a set of essential software development utilities. These include compilers, debuggers, and more, all vital for macOS development. They aid in compiling code, managing versions, and using system utilities. Users can install them without the full Xcode IDE, making them a lightweight option for those who don't need the complete environment—which includes you at this point.

## Install Homebrew

Obviously, if you already have Homebrew, you can skip this step. But for the sake of completeness, let's assume that you don't.

What is [Homebrew](https://brew.sh/)? Homebrew is a popular package manager for macOS that simplifies the installation of software. Basically, instead of going out and finding some special tool (i.e. Python), downloading it, and installing it correcting, you can run a simple command like `brew install python`.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

If you already have Homebrew, go ahead and give it an update for good measure.

```sh
brew update
```

## Install Python

Next, let's use that fresh—or, freshly updated—Homebrew installation to install Python.

```sh
brew install python
```

> [!Done] This might be good enough.
> You could—and probably _should_ stop here if you're just getting started and looking for a super basic setup. We'll keep going a little bit, but if anything that follows confuses you, then this is a good place to pause and you can come back later and follow the rest of the steps.

## Set Up a Virtual Environment

Virtual environments allow you to create isolated Python environments for different projects. This maybe isn't the _most_ important thing in the world right now, but if you ever end up with two or more different projects that use different versions of a given library, you'll thank me later.

We're going to install `virtualenv`. `pip` is a package manager that comes with Python.

```sh
pip install virtualenv
```

> [!Question] What is a virtual environment?
> `virtualenv` is a tool used to create isolated Python environments, allowing different projects to have their own dependencies, regardless of conflicts with other projects. It prevents dependency conflicts by maintaining separate directories containing Python binaries and libraries for each project. This isolation ensures that changes in one environment do not affect others. Using `virtualenv` promotes cleaner project setups and easier dependency management.

Next, we'll create a virtual environment for your project:

```sh
mkdir awesome-project
cd awesome-project
python3 -m venv venv
```

Activate the virtual environment:

```sh
source venv/bin/activate
```

## Install Essential Python Packages

Once the virtual environment is activated, you can install necessary packages using `pip`.

Optionally, we're going to give `pip` a quick upgrade.

```sh
pip install --upgrade pip
```

Install whatever packages you're going to use. For example, we _could_ install the following packages.

```sh
pip install numpy pandas matplotlib
```

## Automate Environment Setup with `requirements.txt`

To ensure your environment can be easily replicated, create a `requirements.txt` file.

> [!Question] What is a requirements.txt?
> A `requirements.txt` file is a plain text file used in Python projects to specify the list of external packages required for the project. Each line in the file typically includes the name of a package and optionally its version number. This allows for easy installation of dependencies using the `pip` command.

You can use `pip` to generate `requirements.txt`:

```sh
pip freeze > requirements.txt
```

The `pip freeze` command generates a list of all the installed packages in your current Python environment along with their versions. This output is formatted in a way that can be easily written to a `requirements.txt` file. This is useful for creating a snapshot of the current environment's dependencies, which can then be shared and used to recreate the environment elsewhere.

If you're coming from Node, it's not wrong to think of a `requirements.txt` as an analogue to a `package.json`.

Install dependencies from `requirements.txt` in a new environment:

```sh
pip install -r requirements.txt
```

## Optional: Use `pyenv` for Python Version Management

If you need to manage multiple Python versions, `pyenv` can be very useful.

You can install `pyenv` using Homebrew.

```sh
brew install pyenv
```

Add `pyenv` to your shell startup file:

```sh
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init --path)"' >> ~/.zshrc
```

Install a specific Python version:

```sh
pyenv install 3.x.x
```

Set the global Python version:

```sh
pyenv global 3.x.x
```
