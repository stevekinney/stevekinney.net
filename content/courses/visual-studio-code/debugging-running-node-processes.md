---
title: Debugging Running Node Processes in Visual Studio Code
description: >-
  Learn how to attach Visual Studio Code's debugger to existing Node.js
  processes for better runtime troubleshooting
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

Alternatively, you can attach the debugger to an already running Node process. To do this, start your Node program with the inspector enabled (e.g. `node --inspect-brk app.js` to break on the first line, or `node --inspect app.js` to just listen). Then use a configuration with `"request": "attach"`, specifying the `"port"` (default 9229 for Node inspector) and `"address"` (e.g. `"localhost"` if running locally). For example:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Node",
  "address": "localhost",
  "port": 9229
}
```

When you start this attach config (F5), Visual Studio Code will try to attach to Node on that host/port. This is useful for debugging scenarios where the Node process is launched outside Visual Studio Code (for instance, via a terminal or a nodemon process). Visual Studio Code can also **auto-attach** to Node processes run in the integrated terminal if you enable it (more on this in _Lesser-Known Features_).
