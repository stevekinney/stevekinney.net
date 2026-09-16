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
              `(${orUnavailable(report.assets.largestClientChunk?.formattedGzipSize)} gzip,`,
              `${orUnavailable(report.assets.largestClientChunk?.path)})`,
            )
            .item(
              `Main stylesheet: ${orUnavailable(report.assets.mainStylesheet?.formattedSize)}`,
              `(${orUnavailable(report.assets.mainStylesheet?.formattedGzipSize)} gzip,`,
              `${orUnavailable(report.assets.mainStylesheet?.path)})`,
            )
            .item(
              `Largest enhancement chunk: ${orUnavailable(report.assets.largestEnhancementChunk?.formattedSize)}`,
              `(${orUnavailable(report.assets.largestEnhancementChunk?.formattedGzipSize)} gzip,`,
              `${orUnavailable(report.assets.largestEnhancementChunk?.path)})`,
            );
        });
      if (report.playgrounds) {
        const playgrounds = report.playgrounds;
        writer.heading(2, 'Playgrounds').unorderedList((list) => {
          list
            .item(`Documents: ${playgrounds.documentCount}`)
            .item(`CSS configurations: ${playgrounds.configurationCount}`)
            .item(`CSS bytes: ${playgrounds.cssBytes} (${playgrounds.cssGzipBytes} gzip)`);
          if (playgrounds.lastLocalInvocation) {
            const run = playgrounds.lastLocalInvocation;
            list.item(
              `Last local invocation: ${run.compilations} compilations, ${run.writes} artifact writes, ${Math.round(run.durationMilliseconds)}ms`,
            );
          }
        });
        if (playgrounds.benchmark) {
          const comparison = playgrounds.benchmark;
          writer.heading(2, 'Playground migration benchmark');
          writer.write(
            `Node ${comparison.node}, Bun ${comparison.bun}. Base: ${comparison.baseCommit}. Replacement: ${comparison.replacementRevision}.`,
          );
          writer.write(comparison.procedure);
          writer.write(
            [
              '| Build | Cold wall / CPU (ms) | Warm wall / CPU (ms) | Playground compilations | Enhancement bundles | Generated writes | Site CSS / gzip | Playground CSS / gzip |',
              '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
              ...(['baseline', 'replacement'] as const).map((name) => {
                const run = comparison[name];
                return `| ${name} | ${Math.round(run.coldMilliseconds)} / ${Math.round(run.coldCpuMilliseconds)} | ${Math.round(run.warmMilliseconds)} / ${Math.round(run.warmCpuMilliseconds)} | ${run.tailwindCompilations} | ${run.enhancementBundles} | ${run.artifactWrites} | ${run.websiteCssBytes} / ${run.websiteCssGzipBytes} | ${run.playgroundCssBytes} / ${run.playgroundCssGzipBytes} |`;
              }),
            ].join('\n'),
          );
          const warm = comparison.replacement;
          writer.write(
            `Replacement unchanged run: ${warm.warmWebsiteBuilds} website builds, ${warm.warmPlaygroundCompilations} playground compilations, ${warm.warmEnhancementBundles} enhancement bundles, and ${warm.warmGeneratedWrites} generated writes.`,
          );
        }
      }
    })
    .toString();
