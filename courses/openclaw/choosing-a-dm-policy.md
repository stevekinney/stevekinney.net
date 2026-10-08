---
title: Choosing a DM Policy
description: "Understand OpenClaw's four DM policies (pairing, allowlist, open, and disabled), what each means for strangers messaging your agent, and which to use."
---

When you [add a channel](adding-telegram-as-a-channel.md), you're giving your agent a front door that anyone on that platform can knock on. Telegram bots are public by username. Slack apps can be messaged by anyone in the workspace. A phone number can receive a text from anybody.

Every channel therefore has a **DM policy** that decides what happens when someone you haven't approved sends your agent a direct message. It's set with `dmPolicy`, and it takes one of four values.

> [!NOTE] Policy is about who gets in, not what they can do
> A DM policy only decides whether a sender's messages reach your agent. What that conversation is then allowed to _do_ is controlled separately by tool and approval policy. You need both.

## The Four Policies

| Policy      | What happens to an unknown sender              | Who it's for                                     |
| ----------- | ---------------------------------------------- | ------------------------------------------------ |
| `pairing`   | They get a pairing code, and you approve it    | Getting started, or a small, changing group      |
| `allowlist` | Silently ignored unless they're in `allowFrom` | Day-to-day use by a known set of people          |
| `open`      | Anyone can talk to your agent                  | Almost never                                     |
| `disabled`  | All DMs are ignored                            | Channels you don't use, or an emergency rollback |

The policy lives under the channel it applies to, for example `channels.telegram.dmPolicy`. If an account inside a channel doesn't set its own, it inherits the channel's value. The default is `pairing`.

The four values are a progression, not a menu of equals. Here's what each one actually means.

### `pairing`

This is the default. When someone you haven't approved sends a DM, they don't reach the agent. Instead, OpenClaw replies with a short message containing their user ID, a **pairing code**, and the command you'd run to approve them. You saw this in the Telegram lesson:

```text
openclaw pairing approve telegram <code>
```

You run that command on the machine hosting the Gateway. Once approved, the sender's messages go through.

It exists so that the first person can get in without anyone knowing their user ID in advance. You message the bot, it tells you your ID, and you approve yourself.

A few things to know:

- You can see waiting requests with `openclaw pairing list <channel>`.
- Pairing codes expire after about an hour, so an old request can't be redeemed later.
- Approving through the CLI also makes the **first** approved person the command owner if there isn't one yet. That's the right outcome when the first person is you.

> [!WARNING] Check who you're approving
> A pairing code is only as trustworthy as your approval. Approve only the request you're expecting, right after you sent the message yourself, and confirm the user ID in the reply matches your own. If a request shows up that you didn't trigger, don't approve it.

### `allowlist`

Only senders listed in `allowFrom` are admitted. There's no challenge and no prompt. Anybody else is simply not let in.

```json5
{
  channels: {
    telegram: {
      dmPolicy: 'allowlist',
      allowFrom: ['telegram:123456789'],
    },
  },
}
```

Each entry is the sender's canonical ID on that platform, which is the user ID that the pairing message showed you.

Two details matter:

- **An empty `allowFrom` rejects everyone.** OpenClaw only logs a warning at startup, so it's easy to lock yourself out and not notice.
- **You can reuse one list across channels.** If several people need access, define a named access group once and reference it from each channel with `allowFrom: ['accessGroup:operators']`, instead of keeping three lists in sync by hand.

### `open`

This lets in anyone who finds the channel. It deliberately doesn't work as a single switch: `open` also requires `allowFrom` to include `"*"`.

```json5
{
  channels: {
    telegram: {
      dmPolicy: 'open',
      allowFrom: ['*'],
    },
  },
}
```

If you set `open` and forget the wildcard, the channel fails closed instead of opening up. That makes "anyone may talk to my agent" a two-handed decision, which is the point.

For a personal assistant, this is almost never what you want. Anyone who discovers your bot or number is talking to an agent that can read your files and use your accounts.

### `disabled`

All DMs are ignored. It's the right setting for a channel you've connected but aren't using, and it's the fastest way to close a door if you think you've overexposed something.

Note that it only affects _direct messages_. Group and channel traffic is governed separately by `groupPolicy`, so `disabled` doesn't turn the channel itself off.

## Letting In an Admitted Sender Is Not Making Them an Owner

There are two different grants that are easy to confuse:

- **Chat access** decides whether someone's messages reach the agent. That's what `dmPolicy` and `allowFrom` control.
- **Command ownership** decides who can _administer_ the installation: run `/update`, restart the Gateway, change configuration, and approve commands.

Adding someone to `allowFrom` by hand gives them chat access and nothing more. They can talk to the agent but will be refused by owner-only commands. When that happens, the agent replies with the exact `openclaw config set commands.ownerAllowFrom` command to run.

Approving a pairing request through the CLI is the exception: if there's no owner yet, it makes that first person the owner. Later approvals grant DM access only.

## A Different Dial: Session Scope

There's one more setting with "DM" in its name that's easy to mix up with the policy. `session.dmScope` doesn't decide _who_ gets in. It decides whether admitted senders **share a conversation**.

| Value                      | What it does                                                   |
| -------------------------- | -------------------------------------------------------------- |
| `main` (default)           | Every DM, from everyone, lands in the agent's one main session |
| `per-peer`                 | Each sender gets their own session                             |
| `per-channel-peer`         | Each sender gets their own session on each channel             |
| `per-account-channel-peer` | The same, separated per account as well                        |

With the default, two people who are both allowed to DM the agent are sharing one conversation and one history. That's fine when the only person is you, and a privacy leak when it isn't.

One side effect to be aware of: the agent's ability to recall things across your private conversations is on by default only while `dmScope` is unset or `main`. Turning on isolation turns that default off.

## Our Recommendation

**Use `pairing` to get in, then switch to `allowlist` and leave it there.**

Pairing is a bootstrap step, not a permanent policy. If you leave it on after you've approved yourself, every stranger who messages the bot receives the same pairing prompt for as long as the bot exists. That's an invitation to try to socially engineer your approval.

Here's the sequence:

1. Leave the channel on its default, `pairing`.
2. Message the bot yourself and note the user ID in the reply.
3. Approve your own request:

   ```sh
   openclaw pairing approve telegram <code>
   ```

4. Record your ID in `allowFrom` and switch to `allowlist`:

   ```json5
   {
     channels: {
       telegram: {
         dmPolicy: 'allowlist',
         allowFrom: ['telegram:123456789'],
       },
     },
   }
   ```

5. Check the file, then restart the Gateway:

   ```sh
   openclaw config validate
   openclaw gateway restart
   ```

6. **Test the negative case.** Message the bot from a second account that isn't on the list and confirm it gets nowhere.

Step 6 is the one people skip. `openclaw channels status --probe` only checks that the connection to the platform works. It says nothing about whether your policy is doing what you think, so test with a real allowed-versus-rejected pair of messages.

Then adjust for your situation:

| Your situation                           | DM policy                                  | `session.dmScope`  |
| ---------------------------------------- | ------------------------------------------ | ------------------ |
| Just you                                 | `allowlist` with your ID                   | Leave the default  |
| You and a few trusted people             | `allowlist`, ideally an access group       | `per-channel-peer` |
| A channel you've connected but don't use | `disabled`                                 | Doesn't matter     |
| You think something is overexposed       | `disabled` everywhere, right now           | Doesn't matter     |
| A public bot for strangers               | Don't. Make a separate, locked-down agent. | `per-channel-peer` |

And whichever you pick, keep the second layer in place. A tight DM policy plus an agent that asks before running commands is much safer than either one alone. If you haven't already, revisit the execution settings in [Setting Up OpenClaw](openclaw-setup.md).

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.5`. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai).
