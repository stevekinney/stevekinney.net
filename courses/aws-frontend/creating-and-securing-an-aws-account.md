---
title: 'Creating and Securing an AWS Account'
description: >-
  Create an AWS account, enable MFA on the root user, and understand why root
  should be locked away after initial setup.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - iam
  - security
  - account-setup
---

You've been deploying to Vercel with a GitHub login. You click a button, connect a repo, and your site is live. AWS gives you actual infrastructure, which means actual security responsibility. The account you're about to create controls real resources that cost real money, and if someone compromises it, they can spin up crypto miners on your credit card. So we're going to do this right from the start.

## Creating an AWS Account

Head to [https://aws.amazon.com](https://aws.amazon.com) and click "Create an AWS Account." You'll need an email address, a password, and a credit card. A few things to know before you begin:

- **Use a dedicated email address.** If you have a team email alias or a plus-addressed Gmail (`yourname+aws@gmail.com`), use that. The email tied to this account becomes the **root user** login, and you want it to be something you can recover access to years from now.
- **Choose a strong, unique password.** This is the most powerful credential in your entire AWS setup. Use a password manager.
- **The credit card is required**, but AWS has a generous free tier. You won't be charged for the things we build in this course unless you leave resources running indefinitely or go significantly over free tier limits.

AWS will ask you to choose a support plan. Select the **Basic (Free)** plan. You can upgrade later if you need it, but free tier support is fine for learning.

Once you've verified your email and entered your payment information, you'll land in the **AWS Management Console**. This is the web interface for everything in AWS. Bookmark it.

## The Root User: Handle with Care

The credentials you just created are the **root user** credentials. The root user is the god-mode account for your entire AWS environment. It can do literally anything: create and delete resources, change billing information, close the account entirely. There is no permission boundary that applies to root.

Think of it this way: if your AWS account were an apartment building, the root user holds the master key to every unit, the mailroom, the electrical panel, and the demolition switch. You don't carry that key to get your morning coffee.

Here's the rule: **use the root user to set up your account, enable MFA, create an admin IAM user, and then stop using it.** Log out. Don't save the password in your browser's autofill. Put the credentials in a password manager vault labeled "BREAK GLASS IN EMERGENCY."

> [!WARNING]
> Never create access keys for the root user. If root access keys leak — in a GitHub commit, in a `.env` file, anywhere — an attacker has unrestricted access to your entire AWS account. There is no IAM policy that can limit what root can do.

## Enabling MFA on the Root User

**Multi-factor authentication (MFA)** adds a second verification step beyond your password. Even if someone steals your root password, they can't log in without the second factor. This is non-negotiable.

Here's how to enable it:

1. Sign in to the AWS Management Console as the root user.
2. Click your account name in the top-right corner and select **Security credentials**.
3. In the **Multi-factor authentication (MFA)** section, click **Assign MFA device**.
4. Give the device a name (something like "root-authenticator").
5. Choose your MFA device type:
   - **Authenticator app** — the most common choice. Use an app like Google Authenticator, Authy, or 1Password.
   - **Security key** — a physical FIDO2 key like a YubiKey. More secure, but costs money.
   - **Passkey** — AWS now supports passkeys, which are phishing-resistant and tied to your device's biometrics.
6. Follow the on-screen prompts to scan the QR code (for an authenticator app) or tap your security key.
7. Enter two consecutive MFA codes to verify and click **Assign MFA**.

> [!TIP]
> AWS lets you register up to eight MFA devices on a single account. Consider adding a second device — a backup authenticator app on a different phone, or a security key stored in a safe place. Losing your only MFA device on the root account is a genuinely painful recovery process.

Once MFA is enabled, every root login will require both your password and the MFA code. This is exactly what you want.

## Creating Your First Admin User

The root user should now be retired from daily use. You need a separate **IAM user** with admin permissions for everyday work. We'll cover IAM in depth in [IAM Mental Model](iam-mental-model.md), but here's the short version to get you unblocked:

1. In the AWS Console, navigate to **IAM** (search for it in the top search bar).
2. In the left sidebar, click **Users**, then **Create user**.
3. Enter the username `admin`.
4. Check **Provide user access to the AWS Management Console**.
5. Select **I want to create an IAM user** (not Identity Center for now — keep it simple).
6. Set a password and decide whether the user should reset it on first login.
7. Click **Next**.
8. On the permissions page, select **Attach policies directly**.
9. Search for and check `AdministratorAccess`.
10. Click **Next**, then **Create user**.

You now have an `admin` user with full permissions. **Enable MFA on this user too** — same process as root, just navigate to the user's Security credentials tab in IAM.

> [!WARNING]
> `AdministratorAccess` is a managed policy that grants `*` on all resources. It's fine for your personal learning account, but in a team environment you'd scope this down significantly. We'll get into that in [Principle of Least Privilege](principle-of-least-privilege.md).

From this point forward, sign into the console using your IAM user credentials, not root. The sign-in URL for IAM users is different from root — it includes your account ID or alias:

```
https://123456789012.signin.aws.amazon.com/console
```

You can find this URL on the IAM dashboard page. Bookmark it.

## Verifying Your Setup

Let's confirm everything is in order. Sign out of the root user and sign back in as your new `admin` user. You should be prompted for:

1. Your account ID (or account alias)
2. Your IAM username (`admin`)
3. Your password
4. Your MFA code

If all four worked, your account is properly secured. You have a root user locked behind MFA that you'll (almost) never touch again, and an admin user for daily work.

Here's a quick checklist:

- [ ] AWS account created with a dedicated email address
- [ ] Root user password stored in a password manager
- [ ] MFA enabled on the root user
- [ ] IAM `admin` user created with `AdministratorAccess`
- [ ] MFA enabled on the `admin` user
- [ ] Signed in successfully as the `admin` user

> [!TIP]
> Set up a billing alarm before you do anything else. Navigate to **Billing and Cost Management** > **Budgets** > **Create a budget**. Create a zero-spend budget or a monthly budget of $10. AWS will email you if your charges exceed the threshold. It's free peace of mind. (Honestly, this should be the very first thing everyone does on a new AWS account.)

You now have a properly secured AWS account. The root user is locked down with MFA and gathering dust. Your `admin` user is ready for daily use. Next, we'll build a mental model of IAM so you understand what you just configured and why it matters.
