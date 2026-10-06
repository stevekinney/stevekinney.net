/**
 * The skill the page opens with. It passes skillset's Claude Code checks with
 * no warnings, and it's formatted the way the YAML writer formats, so loading
 * and exporting it unchanged gives back the same text.
 */
export const sampleSkill = `---
name: release-notes
description: Drafts release notes from the commits since the last tag, grouped into features, fixes, and breaking changes. Use when preparing a release, tagging a version, or when someone asks what changed since the last release.
argument-hint: "[version]"
allowed-tools:
  - Bash(git describe *)
  - Bash(git log *)
  - Read
---

# Release notes

Draft release notes for version $ARGUMENTS. If no version was given, title them "Unreleased".

## Gather the changes

1. Find the last tag with \`git describe --tags --abbrev=0\`.
2. List the commits since it with \`git log <tag>..HEAD --no-merges --format='%h %s'\`.
3. Read \`CHANGELOG.md\` if it exists, and match its headings and tone.

## Write the entry

- Group the changes under **Features**, **Fixes**, and **Breaking changes**. Leave out empty groups.
- Write each line for someone upgrading: what changed and what they need to do, not the commit message.
- Fold dependency bumps and chores into a single **Maintenance** line.
- Put anything that changes a public API, a configuration key, or a default under **Breaking changes**, with the step to migrate.

## Boundaries

- Don't create tags, push, or edit \`CHANGELOG.md\`. Return the draft for review.
- If there are no commits since the last tag, say so and stop.
`;
