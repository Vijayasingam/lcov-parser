export type ReportFileSet = "created" | "modified" | "createdOrModified" | "all"
export type SortMethod =
  | "alphabetically"
  | "least-coverage"
  | "most-coverage"
  | "largest-file-size"
  | "smallest-file-size"
  | "uncovered-lines"

export type SourceType = "json-summary" | "lcov"
export interface SourcePathExplicit {
  path: string
  type: SourceType
}
export type SourcePath = string | SourcePathExplicit

export interface CoverageThreshold {
  statements: number
  branches: number
  functions: number
  lines: number
}

export interface Config {
  entrySortMethod: SortMethod
  coveragePath?: SourcePath
  coveragePaths: SourcePath[]
  reportFileSet: ReportFileSet
  threshold: CoverageThreshold
  skipEmpty?: boolean
  skipFull?: boolean
}

/**
 * Completes a partial configuration with default values.
 * @param config The configuration to complete
 * @returns A complete configuration
 */
export function makeCompleteConfiguration(config?: Partial<Config>): Config {
  const defaults: Config = {
    coveragePaths: [],
    reportFileSet: "all",
    entrySortMethod: "alphabetically",
    threshold: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  }

  const combined = config ? { ...defaults, ...config } : defaults
  const coveragePath = combined.coveragePath ? combined.coveragePath : "./coverage/coverage-summary.json"
  const coveragePaths = combined.coveragePaths.length === 0 ? [coveragePath] : combined.coveragePaths
  delete combined.coveragePath
  return { ...combined, coveragePaths }
}
