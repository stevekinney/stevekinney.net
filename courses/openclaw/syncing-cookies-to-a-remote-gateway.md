---
title: Syncing Your Browser Cookies to a Remote Gateway
description: Let a remote OpenClaw Gateway browse as you by pushing cookies from your Mac's Chrome into the Gateway's browser profile, scoped to the domains you choose.
---

When your Gateway runs on another machine, so does its browser. That browser is a fresh Chrome with no logins, so the moment your agent needs something behind a login (your GitHub notifications, a dashboard, an internal tool), it hits a wall.

You have a few ways to get past it. This lesson is about one of them: **cookie sync**, which copies the login cookies for sites you choose from the Chrome on your Mac into a browser profile on the remote Gateway, and keeps them fresh.

> [!WARNING] This hands your agent your logged-in sessions
> A profile with your cookies in it can act as you on those sites, and an agent can use it unattended, with nobody at the desk to approve anything. Read the security section before you run anything here, and sync as few sites as you can.

## Why Is the Remote Browser Empty?

OpenClaw drives a browser through a named **profile**. There are three built-in profiles, and which one you use decides whose cookies the agent has.

| Profile    | What it is                                                                               |
| ---------- | ---------------------------------------------------------------------------------------- |
| `openclaw` | The default. A dedicated Chrome with its own data directory, isolated, with no logins.   |
| `user`     | Attaches to your real, signed-in Chrome. It needs someone at the computer to approve it. |
| `chrome`   | Drives a browser you already have open, through the Chrome extension.                    |

You can also create your own named profiles. The idea behind cookie sync is to create one, put just the cookies a task needs into it, and point the agent at that instead of your whole browser.

## Choosing an Approach

There are four options, and they trade convenience against exposure.

| Approach                        | How it works                                                                              | Good for                                                        | Watch out for                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Don't sign in**               | The agent uses the isolated `openclaw` profile and public pages only                      | Research, monitoring, anything public                           | Hits login walls                                                      |
| **A fixture account**           | Log in to a throwaway or low-privilege account inside the remote browser                  | Testing, demos                                                  | Setup effort; you have to log in on the remote box                    |
| **Cookie sync** (this lesson)   | Your Mac decrypts cookies for named domains and pushes them to the Gateway                | A real account on a few specific sites, with the Gateway remote | The remote profile now holds real sessions                            |
| **Drive the Mac's own browser** | The Mac is a [paired node](connecting-a-remote-node.md), and the agent browses through it | Sites that reject copied cookies; no cookies leave the Mac      | The Mac has to be online; the `user` profile needs a human to approve |

Pick the first one that works. Each step down hands over more.

There's a second tool you may run into, `import-profile`. It's the one-time, same-machine cousin of cookie sync, and it's only for when the Gateway and the browser are on the **same Mac**. Which of the two exists depends on your Gateway's mode, not on a preference:

|                  | `import-profile`       | `cookie-sync`                                                    |
| ---------------- | ---------------------- | ---------------------------------------------------------------- |
| Gateway          | Local, on the same Mac | Remote                                                           |
| What it does     | Copies cookies once    | Pushes cookies over the Gateway connection, once or continuously |
| Domain filter    | Optional               | **Required.** An empty allowlist syncs nothing                   |
| Who reads Chrome | The Gateway process    | The `openclaw` CLI on your Mac                                   |

Since your Gateway is remote, `cookie-sync` is the one you want.

## Know What You're Handing Over

Before you sync anything, be clear about what happens to the cookies.

- **Cookies only.** Passwords never leave your browser. Local storage and IndexedDB aren't copied either.
- **Only the domains you name.** `--domains` is required, and an empty list syncs nothing. Everything else in your browser stays put.
- **Decrypted on your Mac, sent over the encrypted Gateway connection.** Chrome encrypts its cookies, and only your Mac can decrypt them. That's why macOS asks for a Keychain or Touch ID approval. Cookie values aren't written to logs.
- **Once they arrive, they're in a profile an agent can use on its own.** That's the part that matters. A session cookie is a login. Whoever holds it, human or agent, is signed in without a password or a two-factor prompt.

A few rules follow from that:

1. **Use a dedicated or low-privilege account** where you can, not your main one.
2. **Sync the narrowest domain list that works.** Syncing `github.com` is one decision. Syncing your whole browsing session is a different one.
3. **Don't make the synced profile the default.** Name it explicitly when a task needs it, so every other browsing job keeps using the empty `openclaw` profile.
4. **Narrow the agent's browser tools** for jobs that use it, the same way you would for any signed-in session.
5. **Treat the page as untrusted.** A signed-in page can still contain text that tries to instruct your agent, and now the agent has your credentials.

## Before You Start

You'll need:

- **A Mac with Chrome** (or another Chrome-family browser) signed in to the sites you want. Cookie sync is macOS-only.
- **The `openclaw` CLI on that Mac.** The macOS app keeps its own copy at `~/.openclaw/bin/openclaw`, but that folder isn't on your `PATH`, and the documentation doesn't say whether the app counts that copy as the external CLI. To be safe, install it the normal way from the [installation lesson](installation.md), then check it:

  ```sh
  command -v openclaw
  openclaw --version
  ```

- **A reachable remote Gateway,** like the one from the [Tailscale lessons](connecting-securely-with-tailscale.md), with your Mac able to connect to it.
- **A browser on the Gateway.** This is the one that trips people up on [Railway](https://railway.com?referralCode=kinney). The template's image doesn't include Chromium, and it ships with browser control turned off. To use a browser there, you'd switch to the template's browser image variant and enable browser control, and you should do that deliberately. The template's security notes cover it.

> [!NOTE] Gateway mode decides which tool you get
> If a Cookie sync option in the macOS app is greyed out, that's the app telling you it's connected to a **local** Gateway. Cookie sync only exists in remote mode, and installing a CLI won't change that.

## Step 1: See What's in Your Browser

List the Chrome profiles on your Mac:

```sh
openclaw browser system-profiles
```

You'll see names like `Default` and `Profile 1`. Pick the one that's signed in to the sites you want.

Be careful with the `hasCookies: true` flag. It means OpenClaw found the file, not that it can read it.

## Step 2: Choose Your Domains

Decide which sites the agent needs and write them down. Cookies belong to specific hosts, so a site can use more than one. A login on GitHub might involve `github.com` and `gist.github.com`.

Start with one site. You can always add more.

## Step 3: Sync

Run the sync from your Mac, aimed at the remote Gateway and naming a profile to create or update:

```sh
openclaw browser --url wss://openclaw.<your-tailnet>.ts.net cookie-sync \
  --domains github.com --into work
```

Here's what each part means:

- **`--url`** points the command at the remote Gateway instead of a local one.
- **`--domains`** is the allowlist. Separate several with commas.
- **`--into work`** is the name of the profile on the Gateway to push into. Pick a name that says what the profile is for.

The CLI connects to the Gateway as a client, so expect the usual token and device-pairing requirements. You may need to approve it from the Gateway with `openclaw devices list` and `openclaw devices approve`.

macOS will ask for a Keychain or Touch ID approval. That's the prompt letting the CLI decrypt Chrome's cookies, so say yes when it's your own command.

When it finishes, you'll see a summary. Here's one from a run on a Mac, syncing GitHub:

```text
cookie sync chrome/Default -> imported-4 via configured/default:
total=2898 pushed=16 skipped=2882 failed=0
domains=.github.com,gist.github.com,github.com
```

Reading it:

- **`total`** is every cookie in that Chrome profile.
- **`pushed`** is how many matched your domains and were sent.
- **`skipped`** is everything that didn't match. That's most of them, and it's what you want.
- **`failed`** should be `0`.

If `pushed` is `0`, none of your domains matched. Check the spelling, and try the bare domain.

## Step 4: Check That It Worked

A pushed count isn't proof that anything is on disk yet. While the remote Chrome is running, new cookies live in its memory, and a cookie file can look plausible without holding anything. A fresh, empty profile's cookie database is around 20 KB, and a handful of cookies doesn't change that, so file size tells you nothing.

The test that matters is whether the agent can use it. Ask it to open a page that's only visible when you're signed in, using the profile you named, and to describe what it sees. Never ask it to sign in:

> Using the `work` browser profile, open https://github.com/notifications and tell me what's on the page. Don't sign in or change anything. If you see a login form instead, say so and stop.

A login form means the cookies didn't take. Common reasons are a domain that doesn't match, a session that already expired, or a site that ties its sessions to the device.

If you want to count cookies directly, stop the profile's browser so it flushes to disk, then copy its `Cookies` database somewhere and count the rows:

```sh
openclaw browser stop --browser-profile work
```

On the Gateway host, `openclaw browser status` shows a running profile's data directory.

## Step 5: Tell the Agent to Use It

Importing cookies doesn't make the new profile the agent's browser. If `browser.defaultProfile` isn't set, the default is still `openclaw`, the empty one. That's the safe state, so leave it that way.

Name the profile where you need it:

```sh
openclaw browser --browser-profile work snapshot
```

And in prompts and automations, say so explicitly: "Using the `work` browser profile, …". That way, a job that doesn't need a login can't accidentally get one.

## Step 6: Keep the Cookies Fresh

Sessions expire, and sites rotate cookies. One sync is a snapshot. To keep the remote profile signed in, add `--watch`:

```sh
openclaw browser --url wss://openclaw.<your-tailnet>.ts.net cookie-sync \
  --domains github.com --into work --watch
```

That keeps running and pushes updates as your Mac's cookies change. A few things to plan for:

- **It runs on your Mac.** The command has to stay alive, so run it somewhere durable, like a `tmux` session or a login item.
- **Nothing syncs while the Mac is asleep or offline.** The remote profile just keeps what it last received.
- **The macOS app can do it for you.** In remote mode, the app has a Cookie sync toggle that supervises the same `--watch` command against the connected Gateway. It's off by default. Find it under **Settings → This Mac → Browser**. The CLI reference lists it under **Settings → General → Browser login**, so check both.

## Limits

- **Cookies only.** If a site keeps its login in local storage or IndexedDB, syncing cookies won't sign you in.
- **macOS and Chrome-family browsers only.**
- **Some sessions won't transfer.** Certain Google sessions use device-bound credentials that stay tied to the Mac they started on, so they can ask you to sign in again even after a clean sync. Other sites may reject a session that suddenly appears from a different place. The documented fix for stubborn sites isn't to retry. It's to drive the browser on your Mac itself through the node proxy, which is the fourth option in the table above.
- **It's a copy.** Signing out on your Mac doesn't necessarily sign out the copy on the Gateway.

## Troubleshooting

| Symptom                                            | What's going on                                                                                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An error about a missing or empty allowlist        | `--domains` is required. An empty list is a hard error and syncs nothing.                                                                                                                 |
| `pushed=0`                                         | Nothing matched. Check the domain spelling, and make sure that Chrome profile is actually signed in to the site.                                                                          |
| The Cookie sync toggle is greyed out in the app    | The app is connected to a local Gateway. Cookie sync only exists in remote mode.                                                                                                          |
| `command -v openclaw` prints nothing               | The app's built-in CLI isn't on your `PATH`. Install the CLI properly, or call `~/.openclaw/bin/openclaw` directly.                                                                       |
| `Profile "…" not found. Available profiles: …`     | The profile was just created and the Browser service hasn't reloaded. Wait about ten seconds and check `openclaw browser profiles`.                                                       |
| `unable to open database file`                     | A permissions error, not corruption. It's the failure `import-profile` hits when the Gateway can't read Chrome's cookies. `cookie-sync` avoids it because your terminal does the reading. |
| The agent sees a login page anyway                 | The cookies expired, didn't match, or the site rejects copied sessions. Re-sync, then try driving the Mac's browser instead.                                                              |
| The browser tools don't work at all on the Gateway | Browser control is probably disabled, or the image has no Chromium. See the Railway note above.                                                                                           |

> [!WARNING] Don't give the Gateway Full Disk Access to make `import-profile` work
> It's tempting, because it makes a failing import start working. But the grant is tied to a versioned file path that changes on the next Node upgrade, and it applies to every script anyone runs under that interpreter. `cookie-sync`, scoped to a domain list, solves the same problem with a much smaller footprint.

## Cleaning Up

When you're done with a synced profile, remove it properly:

1. **Stop the watcher** if you started one.
2. **Delete the profile** on the Gateway:

   ```sh
   openclaw browser stop --browser-profile work
   openclaw browser delete-profile --name work
   ```

   A message about user data removal not being confirmed is expected for a profile that never launched, so don't worry about it.

3. **Sign out of the site's other sessions.** Deleting the profile removes the cookies from the Gateway, but it doesn't end the session on the site's side. Use the site's security settings to sign out other sessions or revoke the access.

If you'd rather block the one-time import path entirely, set `browser.allowSystemProfileImport` to `false`. That turns off `import-profile` for both the CLI and for imports an agent triggers.

> [!NOTE] Versions and updates
> This lesson follows OpenClaw's `2026.9.8` documentation. The sample output comes from one `cookie-sync` run on a Mac, and the end-to-end flow against a remote Gateway wasn't rehearsed. Check `openclaw browser --help` on your build for the exact flags.
