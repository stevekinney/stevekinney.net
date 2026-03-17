Update `applications/website/src/lib/courses.toml` with the latest course data from Frontend Masters.

## Steps

1. **Read** `applications/website/src/lib/courses.toml` to understand the current recordings.

2. **Fetch** `https://frontendmasters.com/teachers/steve-kinney/` and extract course titles, slugs, descriptions, and durations. Add any new courses not already in the TOML file.

3. **For each course missing `topics` or `testimonial` fields**, fetch the individual course page (e.g., `https://frontendmasters.com/courses/react-typescript-v3/`) and extract:
   - Topics/tags listed on the course page
   - Testimonials: `content` (quote text) and `person` (name only, skip avatars)

4. **Cross-reference with local `courses/` directories**. For each local walkthrough that has a matching FM recording, add a `url` field to its `README.md` frontmatter pointing to the FM recording URL (with UTM params). Use the slug-to-directory mapping below, plus any obvious matches.

5. **Ensure all `href` values** include `?utm_source=kinney&utm_medium=social&code=kinney`.

6. **Write** the updated `courses.toml`.

## Slug-to-Directory Mapping

These FM course slugs map to local `courses/` directory names that differ:

| FM Slug                   | Local Directory             |
| ------------------------- | --------------------------- |
| `design-systems-v2`       | `storybook`                 |
| `vs-code-v2`              | `visual-studio-code`        |
| `tailwind-css-v2`         | `tailwind`                  |
| `react-typescript-v3`     | `react-typescript`          |
| `react-performance-v2`    | `react-performance`         |
| `fullstack-typescript-v2` | `fullstack-typescript`      |
| `web-security-v2`         | `web-security`              |
| `enterprise-ui-dev`       | `enterprise-ui-development` |
| `electron-v3`             | `electron`                  |
| `aws-v2`                  | `aws`                       |
| `web-performance`         | `javascript-performance`    |

For slugs not listed above, try matching the slug directly to a `courses/<slug>/` directory.

## TOML Format

Each entry is a `[[recording]]` table with these fields:

```toml
[[recording]]
title = "Course Title"
slug = "course-slug"
description = "Course description."
href = "https://frontendmasters.com/courses/course-slug/?utm_source=kinney&utm_medium=social&code=kinney"
duration = "4h 12m"
topics = ["TypeScript", "React"]

[[recording.testimonial]]
content = "Quote text here."
person = "Person Name"
```

## Allowed Tools

Use only: `WebFetch`, `Read`, `Write`, `Edit`, `Glob`, `Bash(ls *)`
