import { CoverageCollection, CoverageItem } from "../model/coverage.model"
import FilesystemService from "../service/filesystem.service"

enum LcovToken {
  TEST_NAME = "TN",
  SOURCE_FILE = "SF",
  FUNCTION = "FN",
  FUNCTION_HITS = "FNDA",
  FUNCTIONS_FOUND = "FNF",
  FUNCTIONS_HIT = "FNH",
  BRANCH = "BRDA",
  BRANCHES_FOUND = "BRF",
  BRANCHES_HIT = "BRH",
  LINE = "DA",
  LINES_HIT = "LH",
  LINES_FOUND = "LF",
  END_OF_RECORD = "end_of_record",
}

// @ts-ignore
const reverseTokenLookup = new Map<string, LcovToken>()
// @ts-ignore
Object.keys( LcovToken ).forEach( ( token: LcovToken ) => {
  // @ts-ignore
  const tokenValue: string = LcovToken[ token ]
  reverseTokenLookup.set( tokenValue, token )
} )
Object.freeze( reverseTokenLookup )

function getTokenFromValue( tokenValue: string ): LcovToken {
  // @ts-ignore
  return LcovToken[ reverseTokenLookup.get( tokenValue ) as string ]
}

interface Line {
  token: LcovToken
  parts: string[]
}

function partsExpected( token: LcovToken ): number {
  switch ( token ) {
    case LcovToken.TEST_NAME:
      return 1
    case LcovToken.SOURCE_FILE:
      return 1
    case LcovToken.FUNCTION:
      return 2
    case LcovToken.FUNCTION_HITS:
      return 2
    case LcovToken.FUNCTIONS_FOUND:
      return 1
    case LcovToken.FUNCTIONS_HIT:
      return 1
    case LcovToken.BRANCH:
      return 4
    case LcovToken.BRANCHES_FOUND:
      return 1
    case LcovToken.BRANCHES_HIT:
      return 1
    case LcovToken.LINE:
      return 3
    case LcovToken.LINES_HIT:
      return 1
    case LcovToken.LINES_FOUND:
      return 1
    case LcovToken.END_OF_RECORD:
      return 0
  }
}

function splitLine( line: string ): Line | undefined {
  const splitIndex = line.indexOf( ":" )
  if ( line === LcovToken.END_OF_RECORD ) {
    return { token: LcovToken.END_OF_RECORD, parts: [] }
  }
  const key = line.substring( 0, splitIndex )
  const token: LcovToken | undefined = getTokenFromValue( key )
  if ( token === undefined ) {
    return undefined
  }
  const expectedParts = partsExpected( token )
  const remainder = line.slice( splitIndex + 1 )
  if ( remainder.length === 0 ) {
    return { token, parts: [] }
  }
  let parts = expectedParts > 1 ? remainder.split( "," ) : [ remainder ]
  parts = parts.map( part => part.trim() )
  return { token, parts }
}

function makeCoverageItem(currentItem: CoverageItem | undefined, total: number, covered: number, missing?: number ): CoverageItem {
  if (!currentItem) {
    currentItem = {total: 0, covered: 0, skipped: 0, pct: 0}
  }
  if (!currentItem.skippedItems) {
    currentItem.skippedItems = []
  }
  const skippedItems = currentItem.skippedItems
  if (missing) {
    skippedItems.push(missing.toString())
  }
  return { total, covered, skippedItems, skipped: total - covered, pct: ( covered / total ) * 100 }
}

function convertToCollection( lines: Line[] ): CoverageCollection {
  let file: string | undefined
  let numFunctions: number | undefined
  let numFunctionsHit: number | undefined
  let numBranches: number | undefined
  let numBranchesHit: number | undefined
  let numLines: number | undefined
  let numLinesHit: number | undefined
  let linesMissing: number | undefined
  const collection: CoverageCollection = {}

  lines.forEach( line => {
    switch ( line.token ) {
      case LcovToken.SOURCE_FILE:
        file = line.parts[ 0 ]
        break
      case LcovToken.FUNCTIONS_FOUND:
        numFunctions = Number( line.parts[ 0 ] )
        break
      case LcovToken.FUNCTIONS_HIT:
        numFunctionsHit = Number( line.parts[ 0 ] )
        break
      case LcovToken.BRANCHES_HIT:
        numBranchesHit = Number( line.parts[ 0 ] )
        break
      case LcovToken.BRANCHES_FOUND:
        numBranches = Number( line.parts[ 0 ] )
        break
      case LcovToken.LINE:
        linesMissing = Number( line.parts[ 1 ] )
        break
      case LcovToken.LINES_HIT:
        numLinesHit = Number( line.parts[ 0 ] )
        break
      case LcovToken.LINES_FOUND:
        numLines = Number( line.parts[ 0 ] )
        break
      case LcovToken.END_OF_RECORD:
        if (
          file === undefined ||
          numFunctions === undefined ||
          numFunctionsHit === undefined ||
          numBranches === undefined ||
          numBranchesHit === undefined ||
          numLines === undefined ||
          numLinesHit === undefined
        ) {
          throw Error()
        }
        const isNew = !collection[ file ]
        collection[ file ] = {
          lines: makeCoverageItem(isNew ? undefined : collection[ file ].lines, numLines, numLinesHit, linesMissing ),
          functions: makeCoverageItem(isNew ? undefined : collection[ file ].functions, numFunctions, numFunctionsHit ),
          branches: makeCoverageItem(isNew ? undefined : collection[ file ].branches, numBranches, numBranchesHit ),
          statements: makeCoverageItem(isNew ? undefined : collection[ file ].statements, numLines, numLinesHit ),
        }
        file = undefined
        numFunctions = undefined
        numFunctionsHit = undefined
        numBranches = undefined
        numBranchesHit = undefined
        numLines = undefined
        numLinesHit = undefined
        linesMissing = undefined
        break
    }
  } )
  return collection
}

export function parseLcov( coveragePath: string ): CoverageCollection {
  const filesystem = new FilesystemService()

  if ( !filesystem.exists( coveragePath ) ) {
    throw Error( `Couldn't find instanbul coverage json file at path '${ coveragePath }'.` )
  }

  let content: string
  try {
    content = filesystem.read( coveragePath )
    const lines: Line[] = content
      .split( "\n" )
      .map( splitLine )
      .filter( line => line !== undefined ) as Line[]
    return convertToCollection( lines )
  } catch ( error ) {
    throw Error( `Coverage data had invalid formatting at path '${ coveragePath }'` )
  }
}
