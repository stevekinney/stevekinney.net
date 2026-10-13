---
title: Connecting to Your OpenClaw Securely with Tailscale
description: 'Put your OpenClaw Gateway on a private tailnet with Tailscale Serve: no open ports, a stable HTTPS URL, and access limited to devices you control.'
---

Once your Gateway lives on another machine, you need a way to reach it. The obvious options are not great. Opening a port to the internet invites strangers to try your credentials, and an SSH tunnel means setting one up on every laptop, and it isn't an option at all on a phone.

[Tailscale](https://tailscale.com) gives you a third option. It builds a private network (a **tailnet**) out of the devices you sign in, and OpenClaw can publish the Gateway to that network and nowhere else. The result is what's often called a "zero open ports" setup:

- The Gateway only listens on loopback (`127.0.0.1`).
- Nothing is bound to `0.0.0.0` and nothing is port-forwarded.
- There is no inbound firewall rule to maintain.
- You get one stable HTTPS address, `https://<host>.<tailnet>.ts.net`, that works from your Mac, your phone, and any [paired node](connecting-a-remote-node.md).

The OpenClaw side of this (`gateway.tailscale.*`) is built into core, so there's no plugin to install. The `tailscale` CLI and daemon are separate software that you install yourself.

> [!NOTE] Hosting on Railway?
> [Railway](https://railway.com?referralCode=kinney) can't run Tailscale next to the Gateway, so it needs a different arrangement. See [Running OpenClaw on Railway with Tailscale](running-openclaw-on-railway-with-tailscale.md).

## Serve vs. Funnel

Tailscale has two ways to publish a service, and mixing them up is the most common mistake.

|                     | Serve                                                | Funnel                                      |
| ------------------- | ---------------------------------------------------- | ------------------------------------------- |
| Who can reach it    | Only devices on your tailnet, subject to your policy | **Anyone on the public internet**           |
| Auth OpenClaw needs | Token, password, or trusted proxy                    | Password, enforced (it won't start without) |
| Right for this?     | **Yes, this is the default**                         | Rarely, and only on purpose                 |

> [!WARNING] Use Serve, not Funnel
> Funnel puts your Gateway's Control UI on the public internet behind one shared password. Whoever has that password gets full operator access. Everything in this lesson uses Serve.

## Before You Start

You'll need:

- A Gateway you can sign in to (a VPS, a home server, or another Mac).
- A [Tailscale account](https://login.tailscale.com).
- Tailscale on **both** the Gateway host and every device you want to connect from.

## Step 1: Install Tailscale on the Gateway Host

Tailscale has to be installed **and logged in** on the machine that runs the Gateway. On a Linux host:

```sh
curl -fsSL https://tailscale.com/install.sh | sudo sh
sudo tailscale up
```

`tailscale up` prints a login link. Open it in a browser and approve the machine.

If you want a predictable device name, and Tailscale's own SSH so you can administer the box without exposing port 22, use this variant instead:

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

On a Mac, install the Tailscale app and sign in. OpenClaw finds the CLI inside the app bundle on its own, so you don't need to add it to your `PATH`.

## Step 2: Turn On MagicDNS and HTTPS Certificates

In the [Tailscale admin console](https://login.tailscale.com/admin), make sure both of these are on:

1. **MagicDNS**, so devices get names like `openclaw.your-tailnet.ts.net`.
2. **HTTPS certificates**, under **DNS → HTTPS Certificates**. Tailscale uses these to give the Gateway a real certificate.

## Step 3: Make Sure the Gateway Requires Authentication

Serve can't be combined with `gateway.auth.mode: "none"`. Check that you have a token (the default), password, or trusted-proxy auth configured. If you don't have a token yet, generate one:

```sh
openclaw doctor --generate-gateway-token
```

Or do it yourself:

```sh
openssl rand -hex 32
```

Use a long random value. The security audit flags secrets shorter than 24 characters, and startup rejects blank tokens, the literal strings `undefined` and `null`, and example placeholders.

Prefer the `OPENCLAW_GATEWAY_TOKEN` environment variable over writing the secret into your config file, so it never ends up in a repository.

## Step 4: Point the Gateway at Tailscale Serve

On the Gateway host:

```sh
openclaw config set gateway.bind loopback
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

That's the whole configuration. If you prefer to edit `~/.openclaw/openclaw.json` directly, it looks like this:

```json5
{
  gateway: {
    bind: 'loopback',
    tailscale: { mode: 'serve' },
  },
}
```

Behind the scenes, OpenClaw tells Tailscale to serve HTTPS on port `443` and proxy it to a private loopback listener that the Gateway owns. Tailscale terminates TLS; the Gateway never faces the network directly. The ordinary listener stays on `127.0.0.1:18789` for programs on the same machine.

> [!NOTE] The first request can be slow
> The first HTTPS request after you enable Serve may take a while because the certificate is being issued. Let it finish and try again.

## Step 5: Allow Your Devices to Reach the Gateway

Serve obeys your tailnet's access policy. If your policy doesn't allow it, the URL works on the Gateway host and **silently times out everywhere else**. This is the leading cause of "it doesn't work."

In the admin console, open **Access Controls** and allow your devices to reach the Gateway host on TCP port `443`. With the modern grants format, add an entry to the existing `grants` array:

```json5
// Tailscale policy files are HuJSON, so these // comments are valid
{ src: ['autogroup:member'], dst: ['<gateway-host-or-ip>'], ip: ['tcp:443'] }
```

On an older ACL-style policy, add this to the `acls` array instead:

```json5
{ action: 'accept', src: ['autogroup:member'], dst: ['<gateway-host-or-ip>:443'] }
```

`autogroup:member` means everyone on your tailnet. If other people share it, narrow `src` to a specific user, group, or tag that covers only the devices that should have access.

## Step 6: Verify It Worked

First, on the Gateway host, check that the route exists:

```sh
tailscale serve status
```

You should see an HTTPS route for `https://<host>.<tailnet>.ts.net` that proxies to a private loopback port owned by the Gateway. That is the expected result. It does **not** point straight at port 18789.

Next, from a **different** device on your tailnet:

```sh
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>.<tailnet>.ts.net/
```

You should get `200`. If it times out from other devices but works on the Gateway host, go back to Step 5.

Finally, prove the Gateway didn't open a port of its own:

```sh
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

The listener must be on `127.0.0.1:18789`. If you see `0.0.0.0`, a LAN address, or a tailnet address, the zero-open-ports property is already gone. On Linux you can also list everything that's listening beyond loopback:

```sh
sudo ss -tlnp | grep -v '127.0.0.1\|::1'
```

## Step 7: Connect Your Devices

Everything uses the same address. Open it in a browser to reach the Control UI:

```text
https://<host>.<tailnet>.ts.net
```

For clients that speak WebSocket, swap the scheme:

```text
wss://<host>.<tailnet>.ts.net
```

- **The macOS app:** go to **Settings → Connection → Remote (another host) → Direct (ws/wss)** and enter the `wss://` address.
- **The iOS and Android apps:** point them at the same `wss://` address. They have no SSH tunnel option, which makes Serve the practical way to reach a remote Gateway from a phone.
- **Paired nodes:** nodes use the same Gateway WebSocket endpoint, so this address is what you'll enter in [Connecting to a Remote OpenClaw as a Paired Node](connecting-a-remote-node.md).

Each new device still needs its own identity and approval. A private network gets a device to the front door; it doesn't skip the lock.

## Optional: Sign In with Your Tailscale Identity

With Serve, OpenClaw can recognize who you are from Tailscale itself instead of asking for the shared token every time. It checks the request against the local Tailscale daemon (`tailscale whois`), so the identity can't be faked by a client.

This is on by default when you use Serve with token auth, and it's controlled by `gateway.auth.allowTailscale`. It's narrower than it sounds:

- It only covers Control UI sign-in.
- HTTP API endpoints (`/v1/*`, `/tools/invoke`, and `/api/channels/*`) **never** use it. They always follow your configured auth.
- It doesn't replace device identity. A browser that already has a device identity can skip the one-time pairing code, but clients without one are still rejected, and node connections still have to be paired.

It also assumes you trust the Gateway host. If untrusted code could run on that machine, turn it off and require the token or password:

```sh
openclaw config set gateway.auth.allowTailscale false
```

## Audit Your Exposure

Run the built-in audit, then double-check from the Tailscale side:

```sh
openclaw security audit
tailscale serve status --json
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

`openclaw status` should report Tailscale exposure as `serve` (or `off`), and never `funnel`. A public Funnel or a LAN bind is a finding the audit asks you to fix right away.

## Troubleshooting

| Symptom                                             | First thing to check                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| The URL works on the Gateway host but not elsewhere | The TCP `443` access policy from Step 5                                   |
| The Gateway fails to start with Serve               | Auth mode isn't `none`, and the Tailscale daemon is running and logged in |
| The first request hangs                             | Certificate issuance. Wait, then retry                                    |
| `tailscale serve` isn't recognized                  | Update Tailscale. The Serve CLI changed in version 1.52                   |
| `proxy_attribution_required`                        | You're running your own `tailscale serve` route. See the note below       |

> [!NOTE] Let OpenClaw manage Serve
> Setting `gateway.tailscale.mode` to `serve` lets OpenClaw configure Tailscale itself. If you instead point your _own_ `tailscale serve` route at the ordinary Gateway listener, OpenClaw treats it as a generic trusted proxy: you'd need to configure `gateway.trustedProxies` narrowly, make sure the proxy overwrites `X-Forwarded-For`, and keep token or password auth. Tailscale identity sign-in doesn't apply there. Unless you have a reason, let OpenClaw do it.

Two more things worth knowing:

- **`mode: "off"` doesn't turn Tailscale off.** It only means OpenClaw isn't managing Serve or Funnel. The daemon, and any route you created yourself, keep running. Check `tailscale serve status` rather than trusting the config.
- **Boot order.** If the Gateway starts before the Tailscale daemon has connected, it waits up to 90 seconds before giving up.

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8`. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai/gateway/tailscale).
