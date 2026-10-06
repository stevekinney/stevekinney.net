---
type: pattern
category: verification
maturity: emerging
confidence: Emerging
---

## TL;DR

Click [the safe link](https://example.com/docs) or [the unsafe one](javascript:window.__injected=true). <script>window.__injected = true</script>

## When To Use It

Never <img src=x onerror="window.__injected=true"> in a real note.

## When Not To Use It

Always, because [a data link](data:text/html,<script>window.__injected=true</script>) is not a document.

## Drawbacks and Failure Modes

An <a href="javascript:window.__injected=true">inline HTML link</a> stays text.
