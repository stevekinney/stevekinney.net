---
title: 'Setting Up the AWS CLI'
description: >-
  Install the AWS CLI v2, configure it with named profiles and access keys, and
  verify that your credentials work.
date: 2026-03-18
modified: 2026-04-15
tags:
  - aws
  - cli
  - setup
  - credentials
---

The AWS Management Console is fine for clicking around and exploring, but you're not going to deploy a frontend by clicking buttons. The **AWS CLI (Command Line Interface)** is how you'll interact with AWS from your terminal—syncing files to S3, creating CloudFront invalidations, invoking Lambda functions, and everything else you'll do in this course. It's also what your CI/CD pipeline will use under the hood.

If you want AWS's canonical version of the profile and credential file setup, the [AWS CLI configuration file guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) is the official reference.

If you've used tools like `vercel` or `netlify` CLI, the AWS CLI serves a similar purpose. The difference is that it covers every AWS service, so the surface area is much larger. You won't need to memorize it all—just the commands for the services you're using.

## Installing AWS CLI v2

AWS CLI v2 is the current version. Don't install v1—it's effectively deprecated and missing features you'll want.

### macOS

The simplest path is the official `.pkg` installer:

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

If you prefer Homebrew:

```bash
brew install awscli
```

### Linux

Download, unzip, and run the installer:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

For ARM-based Linux (like Graviton instances):

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Verify the Installation

```bash
aws --version
```

You should see something like `aws-cli/2.x.x Python/3.x.x` followed by your platform info. If you get "command not found," the install didn't add `aws` to your PATH—check that `/usr/local/bin` is in your `$PATH`.

## Creating Access Keys

> [!NOTE] 2026 Recommendation
> The course uses IAM user access keys because they're the shortest path to a working CLI. In a real production setup, the 2026 recommendation is to run `aws configure sso` and log in through **IAM Identity Center**, which hands the CLI short-lived credentials scoped to an SSO session. No long-lived secret access key ever touches your disk. Every `aws` command in this course works identically against either credential source—the difference is only in how the CLI gets its token. Treat the access-key approach below as a course simplification and plan to migrate once you're comfortable.

Before you can configure the CLI, you need **access keys** for your IAM user. Access keys are a pair of credentials—an **Access Key ID** and a **Secret Access Key**—that let the CLI authenticate as your IAM user.

1. Sign into the AWS Console as your `admin` user (not root—remember, root stays locked away).
2. Navigate to **IAM** > **Users** > **admin**.
3. Click the **Security credentials** tab.
4. Scroll to **Access keys** and click **Create access key**.
5. Select **Command Line Interface (CLI)** as the use case.
6. Acknowledge the recommendation about alternatives (AWS wants you to know that short-lived credentials via IAM Identity Center are more secure—true, but access keys are simpler for learning).
7. Click **Create access key**.

![Security credentials tab for an IAM user showing the Access keys section and the Create access key button.](assets/access-keys.png)

You'll see your **Access Key ID** and **Secret Access Key**. This is the only time the secret key is shown. Copy both values and store them in your password manager.

> [!WARNING]
> If you lose the secret access key, you can't retrieve it. You'll have to delete the key pair and create a new one. Treat these credentials like passwords—they grant the same level of access as logging into the console as that user.

## Configuring the CLI

Run `aws configure` to set up your default profile:

```bash
aws configure
```

It prompts for four values:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Enter your access key ID, secret access key, `us-east-1` as the region, and `json` as the output format. These values get written to two files in your home directory:

- `~/.aws/credentials`—stores your access keys
- `~/.aws/config`—stores region and output preferences

> [!TIP]
> We use `us-east-1` throughout this course because it's the region where CloudFront certificates and Lambda@Edge functions must be created. Using a single region for everything keeps things simple while you're learning.

Once you've set a default region with `aws configure`, the `--region` flag becomes optional: if you leave it off, the CLI uses whatever you configured. For the rest of the course, I'll still pass `--region us-east-1` explicitly on every command. It's redundant when your default is already `us-east-1`, but it makes the examples reproducible if you ever change your default and copy a command into a different shell. If you want to drop the flag once you're comfortable, that's fine—just remember which region your default points at.

## Named Profiles

The default profile works fine when you have one AWS account. But if you ever have a personal account and a work account—or a staging environment and a production environment—you'll want **named profiles**.

Create a named profile by adding `--profile` to the configure command:

```bash
aws configure --profile personal
```

This creates a separate set of credentials stored under the `personal` profile name. To use it, add `--profile personal` to any CLI command:

```bash
aws s3 ls \
  --profile personal \
  --region us-east-1
```

The underlying file structure looks like this:

**`~/.aws/credentials`**

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[personal]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

**`~/.aws/config`**

```ini
[default]
region = us-east-1
output = json

[profile personal]
region = us-east-1
output = json
```

Notice the asymmetry: in the credentials file, the section header is just `[personal]`. In the config file, it's `[profile personal]`. This inconsistency is annoying, but it's how AWS designed it. (Honestly, I don't know why. It trips everyone up at least once.) The `[default]` profile doesn't use the `profile` prefix in either file.

You can also set the `AWS_PROFILE` environment variable to avoid typing `--profile` on every command:

```bash
export AWS_PROFILE=personal
```

## Verifying Your Credentials

The best way to confirm your CLI is properly configured is the `get-caller-identity` command:

```bash
aws sts get-caller-identity \
  --region us-east-1 \
  --output json
```

This returns the identity associated with your credentials:

```json
{
  "UserId": "AIDAIOSFODNN7EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/admin"
}
```

If you see your account ID and the ARN of your `admin` user, everything is working. This command requires no special permissions—it works even if the user has no policies attached. It's the AWS equivalent of `whoami`.

If you get an error like `The security token included in the request is invalid`, your access keys are wrong. Double-check what you entered, or delete the key pair in the console and create a new one.

> [!TIP]
> Run `aws sts get-caller-identity` any time you're unsure which credentials the CLI is using. It's especially useful when you have multiple profiles and want to confirm you're not accidentally running commands against your production account.

## A Quick Test: List S3 Buckets

Let's make sure the CLI can actually talk to a service. Run:

```bash
aws s3 ls \
  --region us-east-1
```

> [!NOTE]
> The high-level `aws s3` commands (`ls`, `sync`, `cp`, `rm`) are convenience wrappers that don't produce JSON output — `--output json` is silently ignored on these commands. Use `--output json` with `aws s3api` commands instead, which map directly to the S3 API and respect the output format flag.

If you haven't created any buckets yet, you'll get an empty response. That's fine—it means the CLI authenticated successfully and S3 responded. If you get an access denied error, your `admin` user's permissions might not be set up correctly—revisit the user setup in [Creating and Securing an AWS Account](creating-and-securing-an-aws-account.md).

## Security Hygiene for Access Keys

A few rules to keep your credentials safe:

- **Never commit access keys to version control.** Add `~/.aws/` to your global `.gitignore`. If a key ends up in a public GitHub repo, bots will find it within minutes and start spinning up resources.
- **Don't put access keys in environment variables in CI/CD unless you're using secrets management.** GitHub Actions has encrypted secrets. Use them.
- **Rotate keys periodically.** You can have two active access keys per IAM user, which means you can create a new key, update your configuration, verify it works, and then deactivate the old key without downtime.
- **Delete keys you're not using.** If you created a key for testing and no longer need it, delete it. An unused key is an attack surface with no benefit.

> [!WARNING]
> If you ever suspect a key has been compromised—you accidentally logged it, it appeared in a build output, anything—deactivate it immediately in the IAM console. Don't wait to create a replacement first. Deactivate, then create a new one. Minutes matter.

You now have a working AWS CLI installation connected to your IAM user. Every CLI command in the rest of this course assumes this setup. When we create S3 buckets, configure CloudFront, or deploy Lambda functions, we'll be using these same credentials from the same terminal.
