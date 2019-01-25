import { Config, makeCompleteConfiguration, ReportFileSet, SourcePath, SourcePathExplicit, SourceType } from "./model/config.model"
import { CoverageCollection, CoverageEntry, CoverageItem, CoverageModel, makeCoverageModel, meetsThreshold } from "./model/coverage.model"
import { parseJsonSummary } from "./parser/parse-json-summary"

import * as _ from "lodash"
import * as path from "path"
import { parseLcov } from "./parser/parse-lcov"
import { GitService } from "./service/git.service"
import TextReport from "./service/textReport.service"
import { getPrettyPathName } from "./utils/filename-utils"

function filterForCoveredFiles( basePath: string, files: string[], coverage: CoverageCollection ): string[] {
  return files.map( filename => path.resolve( basePath, filename ) ).filter( filename => coverage[ filename ] !== undefined )
}

function getFileSet( reportChangeType: ReportFileSet, all: string[], modified: string[], created: string[] ): string[] {
  if ( reportChangeType === "all" ) {
    return all
  }
  if ( reportChangeType === "modified" ) {
    return modified
  }
  if ( reportChangeType === "created" ) {
    return created
  }
  return _.union( created, modified )
}

function getFileGroupLongDescription( reportChangeType: ReportFileSet ) {
  if ( reportChangeType === "all" ) {
    return "the whole codebase"
  }
  if ( reportChangeType === "created" ) {
    return "the new files in this PR"
  }
  if ( reportChangeType === "modified" ) {
    return "the modified files in this PR"
  }
  return "the modified or changed files in this PR"
}

function printCoverageHealth( config: Config, results: CoverageEntry ) {
  const messageType = getFileGroupLongDescription( config.reportFileSet )
  if ( !meetsThreshold( results, config.threshold ) ) {
    console.log( `Hmmm, code coverage is looking low for ${ messageType }.` )
  } else {
    console.log( `Test coverage is looking good for ${ messageType }` )
  }
}
function formatItem( item: CoverageItem, precision: number = 0 ) {
  return `(${ item.covered }/${ item.total }) ${ item.pct.toFixed( precision ) }%`
}

function formatSourceName( source: string ): string {
  return getPrettyPathName( source, 30 )
}

function generateReport( basePath: string, coverage: CoverageModel, combinedConfig: Config ) {
  let maxFileNameLen: number = 0
  Object.keys( coverage.displayed ).forEach( ( filename ) => {
    const name = formatSourceName( path.relative( basePath, filename ) )
    if ( name.length > maxFileNameLen ) {
      maxFileNameLen = name.length
    }
  } )
  const header = TextReport.tableHeader( maxFileNameLen + 5 )
  const lines = Object.keys( coverage.displayed ).map( filename => {
    const e = coverage.displayed[ filename ]
    e.name = formatSourceName( path.relative( basePath, filename ) )
    return TextReport.tableRow( e, maxFileNameLen + 5, 1, combinedConfig.skipEmpty, combinedConfig.skipFull )
  } )

  const ellided =
    coverage.elidedCount === 0
      ? undefined
      : [
        `Other (${ coverage.elidedCount } more)`,
        formatItem( coverage.elided.lines ),
        formatItem( coverage.elided.statements ),
        formatItem( coverage.elided.functions ),
        formatItem( coverage.elided.branches ),
      ].join( " | " )

  const total = [
    "Total",
    formatItem( coverage.total.lines, 2 ),
    formatItem( coverage.total.statements, 2 ),
    formatItem( coverage.total.functions, 2 ),
    formatItem( coverage.total.branches, 2 ),
  ].join( " | " )
  return console.log( [ header, ...lines, ellided, total, "" ].filter( part => part !== undefined ).join( "\n" ) )
}

function getCoveragePaths( coveragePaths: SourcePath[] ): SourcePathExplicit[] {
  return coveragePaths.map( singleCoveragePath => {
    let originalPath: string
    let type: SourceType
    if ( typeof singleCoveragePath === "string" ) {
      originalPath = singleCoveragePath
      type = singleCoveragePath.match( /(lcov\.info)$/ ) ? "lcov" : "json-summary"
    } else {
      originalPath = singleCoveragePath.path
      type = singleCoveragePath.type
    }
    if ( !process.mainModule ) {
      return { path: originalPath, type }
    }
    const appDir = `${ process.mainModule.paths[ 0 ].split( "node_modules" )[ 0 ].slice( 0, -1 ) }/`
    originalPath = path.resolve( appDir, originalPath )
    const output: SourcePathExplicit = { path: originalPath, type }
    return output
  } )
}

function parseSourcePath( sourcePath: SourcePathExplicit ): CoverageCollection {
  if ( sourcePath.type === "json-summary" ) {
    return parseJsonSummary( sourcePath.path )
  } else {
    return parseLcov( sourcePath.path )
  }
}

function getCombinedCoverageCollection( coveragePaths: SourcePathExplicit[] ): CoverageCollection {
  return coveragePaths
    .map( coveragePath => parseSourcePath( coveragePath ) )
    .reduce( ( previous, current ) => ( { ...previous, ...current } ), {} )
}

/**
 * LCOV Parser to read LCOV file and print in the console.
 */
export function reportCoverage( config?: Partial<Config> ): Promise<void> {
  const combinedConfig = makeCompleteConfiguration( config )
  const coveragePaths = getCoveragePaths( combinedConfig.coveragePaths )
  let coverage: CoverageCollection
  try {
    const parsedCoverage = getCombinedCoverageCollection( coveragePaths )
    if ( !parsedCoverage ) {
      return Promise.resolve()
    }
    coverage = parsedCoverage
  } catch ( error ) {
    console.warn( error.message )
    return Promise.resolve()
  }
  const gitService = new GitService()

  const gitProperties = Promise.all( [ gitService.getRootDirectory(), gitService.getCurrentCommit() ] )

  return gitProperties
    .then( values => {
      const gitRoot = values[ 0 ]
      const modifiedFiles = filterForCoveredFiles( gitRoot, gitService.getModifiedFiles(), coverage )
      const createdFiles = filterForCoveredFiles( gitRoot, gitService.getCreatedFiles(), coverage )
      const allFiles = Object.keys( coverage ).filter( filename => filename !== "total" )

      const files = getFileSet( combinedConfig.reportFileSet, allFiles, modifiedFiles, createdFiles )

      if ( files.length === 0 ) {
        return
      }

      const coverageModel = makeCoverageModel(
        files,
        coverage,
        combinedConfig.entrySortMethod
      )

      generateReport( gitRoot, coverageModel, combinedConfig )
      if ( combinedConfig.threshold ) {
        printCoverageHealth( combinedConfig, coverageModel.total )
      }
    } )
    .catch( ( reason: string ) => {
      console.error( reason )
    } )
}
