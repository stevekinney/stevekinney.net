---
title: Debugging Running Node Processes in VS Code
description: Learn how to attach VS Code's debugger to existing Node.js processes for better runtime troubleshooting
modified: 2025-03-16T16:07:00-06:00
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

When you start this attach config (F5), VS Code will try to attach to Node on that host/port. This is useful for debugging scenarios where the Node process is launched outside VS Code (for instance, via a terminal or a nodemon process). VS Code can also **auto-attach** to Node processes run in the integrated terminal if you enable it (more on this in *Lesser-Known Features*).
