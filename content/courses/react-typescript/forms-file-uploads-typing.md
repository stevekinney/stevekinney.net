---
title: Forms File Uploads Typing
description: >-
  Handle files with confidence across client and server boundaries—typed File,
  Blob, and FormData, plus guardrails for size, type, and count.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:35:29.238Z'
---

Handle files with confidence across client and server boundaries—typed `File`, `Blob`, and `FormData`, plus guardrails for size, type, and count.

## Typing File Inputs

```tsx
function FilePicker({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <input
      type="file"
      multiple
      accept="image/png,image/jpeg"
      onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
    />
  );
}
```

## Validation Helpers

```ts
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(['image/png', 'image/jpeg']);

export function validateFiles(files: File[]) {
  return files.filter((f) => f.size <= MAX_SIZE && ALLOWED.has(f.type));
}
```

## Drag-and-Drop Typing

```tsx
function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      Drop files
    </div>
  );
}
```

## FormData and Server Actions

```ts
// Client
const fd = new FormData();
files.forEach((f) => fd.append('images', f));

// Server (Node/RSC)
export async function uploadAction(formData: FormData) {
  const images = formData.getAll('images') as File[];
  // Validate size/type again server-side
}
```

## Previews with Object URLs (Cleanup!)

```tsx
function PreviewList({ files }: { files: File[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return (
    <div>
      {urls.map((u) => (
        <img key={u} src={u} alt="preview" />
      ))}
    </div>
  );
}
```

## Multiple Accept Profiles and Errors

```ts
type AcceptProfile = { mime: string; maxSize: number };
const PROFILES: AcceptProfile[] = [
  { mime: 'image/png', maxSize: 2 * 1024 * 1024 },
  { mime: 'image/jpeg', maxSize: 5 * 1024 * 1024 },
];

export function validateWithProfiles(files: File[]) {
  const accepted = [] as File[];
  const errors: { file: string; reason: string }[] = [];
  for (const f of files) {
    const profile = PROFILES.find((p) => p.mime === f.type);
    if (!profile) {
      errors.push({ file: f.name, reason: 'unsupported type' });
      continue;
    }
    if (f.size > profile.maxSize) {
      errors.push({ file: f.name, reason: 'too large' });
      continue;
    }
    accepted.push(f);
  }
  return { accepted, errors } as const;
}
```

## Chunked Uploads (Sketch)

```ts
async function uploadInChunks(file: File, chunkSize = 1_000_000) {
  let offset = 0;
  let index = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    await fetch('/upload/chunk', {
      method: 'POST',
      body: (() => {
        const fd = new FormData();
        fd.append('index', String(index));
        fd.append('file', chunk, file.name);
        return fd;
      })(),
    });
    offset += chunkSize;
    index += 1;
  }
  await fetch('/upload/complete', { method: 'POST', body: JSON.stringify({ name: file.name }) });
}
```

## Next.js/Server Action Boundaries

- In RSC/server actions, `File` is available in Node 20+ and edge runtimes; validate again server‑side.
- Never trust client‑side checks alone; re‑enforce limits on the server.

## See Also

- [React Hook Form with Zod Types](react-hook-form-with-zod-types.md)
- [Forms, Actions, and useActionState](forms-actions-and-useactionstate.md)
- [Typed Env and Config Boundaries](typed-environment-and-configuration-boundaries.md)
- [Edge, SSR, and Hydration Payload Types](edge-ssr-hydration.md)
