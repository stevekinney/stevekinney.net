---
title: 'Quick Checklists — Pipelines, Attention, Generation'
description: >-
  Compact, practical checklists to configure pipelines, reason about attention,
  and choose text generation settings.
modified: '2025-09-14T23:11:40.817Z'
date: '2025-09-14T19:16:10.021Z'
---

## Pipeline Setup Checklist

- Pick task and model ID; pin a revision for reproducibility.
- Move compute to GPU if available; consider 8-bit/4-bit for memory limits.
- Batch inputs and enable fast tokenizers.
- Configure truncation, padding, and max length to match task.
- Log model name, revision, seeds, and decoding parameters for audits.

## Attention Sanity Checks

- Confirm correct masks (padding vs causal) for your use case.
- Inspect sequence lengths; avoid quadratic blow-ups when unnecessary.
- Prefer optimized attention kernels (e.g., FlashAttention where supported).
- Verify positional settings for long-context workflows.

## Text Generation Defaults

- Deterministic baseline: greedy or low-temp beam (2–4 beams).
- Balanced creativity: top-p 0.9–0.95, temperature 0.7–0.9.
- Reduce loops: small repetition penalty or no-repeat n-gram 2–3.
- Use stop sequences and max tokens appropriate to the task.
