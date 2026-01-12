---
paths:
  - 'vercel.json'
  - '**/vercel*'
---

# Vercel Configuration

When working with `vercel.json` and Vercel deployment settings:

## Environment Variables for Fork Detection

- **`VERCEL_GIT_REPO_OWNER`**: Always the owner of the connected Vercel project repository, NOT the fork author. Do not use this to detect fork PRs.

- **`VERCEL_GIT_COMMIT_AUTHOR_LOGIN`**: The GitHub username of the commit author. Use this to detect fork PRs by comparing against the repo owner.

- **`VERCEL_GIT_PULL_REQUEST_ID`**: Set when the deployment is triggered by a PR. Use this to detect PR builds.

## Skipping Fork PR Builds

Fork PRs cannot access Vercel secrets, causing builds to fail. To skip fork PR preview builds:

```json
{
  "ignoreCommand": "if [ -n \"$VERCEL_GIT_PULL_REQUEST_ID\" ] && [ \"$VERCEL_GIT_COMMIT_AUTHOR_LOGIN\" != \"your-username\" ]; then echo \"Skipping fork PR\"; exit 0; fi; exit 1"
}
```

The `ignoreCommand` exits with:

- `0` to skip the build
- `1` to proceed with the build
