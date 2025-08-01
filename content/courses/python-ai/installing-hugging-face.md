---
title: Installing the Hugging Face CLI
description: A brief guide on how to install the Hugging Face CLI.
modified: 2025-08-01T05:18:46-05:00
---

> [!NOTE] You most likely won't have to do this.
> But, just in case—here are some instructions.

To install the Hugging Face Command Line Interface (CLI), you will primarily need to **install the `huggingface_hub` library**. You should install the `huggingface_hub` library using `pip`, the Python package manager.

This is considered the "first and foremost thing" to do.

```bash
pip install huggingface_hub
```

Alternatively, you can use the `-U` flag to ensure you get an up-to-date or the latest version of the package:

```bash
pip install -U huggingface_hub
```

Once `huggingface_hub` is installed, you can use CLI commands like `hugging face CLI login` to interact with the Hugging Face Hub from your terminal.

## Logging In

Once you have the CLI installed, you'll need a [Access Token](https://huggingface.co/settings/tokens). Then you can run the CLI to log in.

```sh
huggingface-cli login
```

Paste in you Access Token and you should be good to.
