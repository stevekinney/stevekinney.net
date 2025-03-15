# SvelteKit Website Development Guide

## Build Commands

- `pnpm dev` - Start dev server on port 4444
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint and Prettier checks
- `pnpm format` - Format code with Prettier
- `pnpm test:unit` - Run Vitest tests
- `pnpm test:unit -- [test file path]` - Run specific test
- `pnpm storybook` - Run Storybook on port 6006

## Code Style

- **Formatting**: Use tabs, single quotes, 100 char line length
- **Naming**: Use kebab-case for files, camelCase for variables
- **Types**: Strict TypeScript with explicit return types
- **Imports**: Group imports (svelte/library/internal)
- **Components**: Use Svelte 5 with typed props
- **Error handling**: Use proper error types and bubbling
- **State management**: Prefer Svelte stores for shared state
- **CSS**: Use Tailwind with class-variance-authority for variants

## Architecture

- SvelteKit with file-based routing
- MDSvex for markdown content
- TypeScript for type safety
- Vitest for unit testing
- Storybook for component documentation
