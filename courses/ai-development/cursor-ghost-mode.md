---
title: Cursor Privacy Mode and Data Governance
description: >-
  Replace older Ghost Mode language with Cursor Privacy Mode, indexing behavior,
  Cloud Agent storage, and model-retention governance.
modified: 2026-06-24
date: 2025-07-29
---

Older Cursor material sometimes referred to "Ghost Mode." The current product
language is [Privacy Mode](https://cursor.com/help/security-and-privacy/privacy).
Use the current term when documenting security and governance.

## What Privacy Mode Means

When Privacy Mode is enabled, Cursor says your code is not used to train Cursor
or third-party models. That is the central promise. It does not mean no data ever
leaves your machine.

Model requests still need the prompt and relevant code context. Repository
indexing can store embeddings, obfuscated paths, and line-number metadata so
Cursor can search the codebase without storing raw code. The practical security
question is not "local or remote?" It is "what data is sent, stored, retained,
and governed?"

## Cloud Agents Change the Storage Story

Cloud Agents require a remote execution environment. That means Cursor
temporarily stores enough repository data to clone, build, test, and operate in
that environment. The storage should be treated as part of your vendor risk
review.

For sensitive repositories, decide explicitly:

- Whether Cloud Agents are allowed.
- Which repositories they can access.
- Which secrets can be mounted.
- Which MCP servers can be used.
- Which model providers and retention policies are allowed.

## Model Retention Exceptions

Some models or providers can have retention behavior that differs from the
default privacy posture. Cursor's enterprise controls can require approval before
using models with retention exceptions. As of June 23, 2026, Claude Fable 5 is
called out in Cursor documentation as requiring approval in contexts where model
retention matters.

Do not write a team rule that blindly selects a model for every task. Write a
governance rule that names who can approve retention exceptions.

## Course-Level Guidance

For most teams, the working policy is:

- Enable Privacy Mode.
- Keep secrets out of prompts and rules.
- Use repository-owned rules and skills for auditable instruction.
- Require explicit approval for Cloud Agents on sensitive repositories.
- Review MCP servers like production integrations, not editor plugins.

Security is a workflow. A toggle helps, but it is not the workflow.
