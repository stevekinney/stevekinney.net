import { write } from 'prose-writer';

import type { BuildReport } from './types.ts';

const orUnavailable = (value: string | null | undefined): string => value ?? 'Unavailable';

const orUnknown = (value: string | null | undefined): string => value ?? 'UNKNOWN';

/** Renders a Markdown summary of the build report for quick human review. */
export const renderMarkdownReport = (report: BuildReport): string =>
  write
    .with((writer) => {
      const { bold } = writer;

      writer
        .heading(1, 'Website Build Report')
        .write(`Generated: ${bold(report.generatedAt)}`)
        .heading(2, 'Turbo')
        .unorderedList((list) => {
          list
            .item(`Summary: ${orUnavailable(report.turbo.summaryPath)}`)
            .item(
              `Website build cache: ${orUnknown(report.turbo.websiteBuild?.cacheStatus)}`,
              `(${orUnknown(report.turbo.websiteBuild?.cacheSource)})`,
            )
            .item(`Website build hash: ${orUnavailable(report.turbo.websiteBuild?.hash)}`);
        })
        .heading(2, 'Content')
        .unorderedList((list) => {
          list
            .item(`Source files: ${report.content.sourceFileCount}`)
            .item(`Content routes: ${report.content.routeCount}`)
            .item(`Writing posts: ${report.content.writingPostCount}`)
            .item(`Courses: ${report.content.courseCount}`)
            .item(`Lessons: ${report.content.lessonCount}`)
            .item(`Tailwind playgrounds: ${report.content.playgroundCount}`)
            .item(`Generated prerender entries: ${report.content.prerenderEntryCount}`);
        })
        .heading(2, 'Prerender')
        .unorderedList((list) => {
          list
            .item(`Build output root: ${orUnavailable(report.prerender.buildOutputRoot)}`)
            .item(`Built HTML pages: ${report.prerender.buildHtmlPageCount}`)
            .item(`SvelteKit prerendered HTML pages: ${report.prerender.prerenderedHtmlPageCount}`);
        })
        .heading(2, 'Assets')
        .unorderedList((list) => {
          list
            .item(
              `Largest client chunk: ${orUnavailable(report.assets.largestClientChunk?.formattedSize)}`,
              `(${orUnavailable(report.assets.largestClientChunk?.path)})`,
            )
            .item(
              `Main stylesheet: ${orUnavailable(report.assets.mainStylesheet?.formattedSize)}`,
              `(${orUnavailable(report.assets.mainStylesheet?.path)})`,
            );
        });
    })
    .toString();
