## stevekinney.net

This repository is a Bun workspace monorepo powered by Turborepo.

### Developing

Start a development server:

```bash
bun dev

# or start the server and open the app in a new browser tab
bun dev --open
```

The website application lives in `applications/website`.

### Building

To create a production version of your app:

```bash
bun build
```

### Git LFS

This repo tracks large binary assets with Git LFS (images, audio, video, archives, and PDFs). Install it once:

```bash
git lfs install
```

New assets matching the patterns in `.gitattributes` will be stored in LFS automatically. If you need to migrate existing assets into LFS, use `git lfs migrate import --include="*.png,*.jpg,*.jpeg,*.gif,*.webp,*.avif,*.mp4,*.mov,*.mp3,*.wav,*.zip,*.pdf"` and coordinate before rewriting history.
