---
title: Installing and Setting Up Claude Code
description: >-
  Install Claude Code with the native installer, Homebrew, WinGet, release
  channels, auto-updates, Windows guidance, and claude doctor.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code](https://code.claude.com/docs/en/overview) is
[Anthropic](https://www.anthropic.com/)'s agentic development tool. It runs in
the terminal, IDEs, desktop and web surfaces, and automation contexts.

The current primary install path is the native installer. Do not teach npm as the
default install path for new users.

## Native Installer

On macOS and Linux:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

On Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

The native installer supports auto-updates and release channels. That is the main
reason to prefer it over package-manager installs for most developers.

## Package Managers

[Homebrew](https://brew.sh/) and
[WinGet](https://learn.microsoft.com/windows/package-manager/winget/) are
supported alternatives:

```bash
brew install --cask claude-code
```

```powershell
winget install Anthropic.ClaudeCode
```

The tradeoff is update behavior. Homebrew and WinGet installations do not use
Claude Code's built-in auto-update path, so the package manager owns updates.

## Windows and WSL

Claude Code supports native Windows installation. Windows Subsystem for Linux is
still useful when the repository and toolchain are Linux-oriented. Choose the
environment that matches the project, not the one that makes installation look
shorter.

## Verify the Setup

Run:

```bash
claude --version
claude doctor
```

`claude doctor` checks common environment and authentication problems. Use it
before debugging a repository-specific failure.

## Release Channels

Claude Code supports stable and latest channels through settings such as
`autoUpdatesChannel`. For teaching and team onboarding, prefer stable unless a
lesson explicitly depends on a new feature from the latest channel.
