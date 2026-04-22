export type TurboTaskCache = {
  status?: string;
  source?: string;
  timeSaved?: number;
};

export type TurboTaskSummary = {
  taskId: string;
  hash: string;
  cache?: TurboTaskCache;
};

export type TurboExecutionSummary = {
  cached: number;
  attempted: number;
  startTime: number;
  endTime: number;
};

export type TurboRunSummary = {
  id: string;
  execution: TurboExecutionSummary;
  tasks: TurboTaskSummary[];
};

export type SizedFile = {
  path: string;
  bytes: number;
};

export type WebsiteBuildTaskReport = {
  hash: string;
  cacheStatus: string;
  cacheSource: string;
  timeSavedMilliseconds: number | null;
};

export type TurboReport = {
  summaryPath: string | null;
  execution: TurboExecutionSummary | null;
  websiteBuild: WebsiteBuildTaskReport | null;
};

export type ContentReport = {
  sourceFileCount: number;
  routeCount: number;
  playgroundCount: number;
  writingPostCount: number;
  courseCount: number;
  lessonCount: number;
  prerenderEntryCount: number;
};

export type PrerenderReport = {
  buildOutputRoot: string | null;
  buildHtmlPageCount: number;
  prerenderedHtmlPageCount: number;
};

export type SizedFileReport = {
  path: string;
  bytes: number;
  formattedSize: string;
};

export type AssetsReport = {
  largestClientChunk: SizedFileReport | null;
  mainStylesheet: SizedFileReport | null;
};

export type BuildReport = {
  generatedAt: string;
  turbo: TurboReport;
  content: ContentReport;
  prerender: PrerenderReport;
  assets: AssetsReport;
};
