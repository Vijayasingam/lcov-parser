import { reportCoverage } from "../index"
import FilesystemService from "../service/filesystem.service"
import { GitService } from "../service/git.service"
jest.mock( "../service/filesystem.service" )
jest.mock( "../service/git.service" )

// @ts-ignore
const basePath = "/some/random/path/to/repo"

// @ts-ignore
function makeCoverageEntry( coverage: number ) {
  return `{
      "0": ${coverage < 25 ? 0 : 1 },
      "1": ${coverage < 50 ? 0 : 1 },
      "2": ${coverage < 75 ? 0 : 1 },
      "3":  ${coverage < 100 ? 0 : 1 }
    }`
}

function makeEntry(
  fileName: string,
  lineCoverage = 100,
  statementCoverage = 100,
  functionCoverage = 100,
  branchCoverage = 100
) {
  return `
    "${fileName }": {
      "lines": { "total": 100, "covered": ${lineCoverage }, "skipped": 0, "pct": ${ lineCoverage } },
      "functions": { "total": 100, "covered": ${functionCoverage }, "skipped": 0, "pct": ${ functionCoverage } },
      "statements": { "total": 100, "covered": ${statementCoverage }, "skipped": 0, "pct": ${ statementCoverage } },
      "branches": { "total": 100, "covered": ${branchCoverage }, "skipped": 0, "pct": ${ branchCoverage } }
    }
  `
}

function setupGitService( clearGit?: boolean ) {
  ( GitService as any ).mockImplementation( () => {
    return {
      getRootDirectory: () => Promise.resolve( __dirname ),
      getCurrentCommit: () => Promise.resolve( "master" ),
      getModifiedFiles: () => clearGit ? [] : [ "src/modified-file1.ts", "src/modified-file2.ts" ],
      getCreatedFiles: () => clearGit ? [] : [ "src/created-file1.ts", "src/created-file2.ts" ],
    }
  } )
}

function setupCoverageFile( coverages: string[] = [] ) {
  ( FilesystemService as any ).mockImplementation( () => {
    return {
      exists: () => coverages.length !== 0,
      read: () => {
        const coverage = coverages.pop()
        return coverage !== undefined ? coverage : undefined
      },
    }
  } )
}

describe( "reportCoverage()", () => {
  beforeEach( () => {
    console.warn = jest.fn()
    console.log = jest.fn()
    console.error = jest.fn()
    console.table = jest.fn()
    setupGitService()
    setupCoverageFile( [
      `{
      ${makeEntry( "total", 50, 50, 50, 50 ) },
      ${makeEntry( `${ __dirname }/src/modified-file1.ts`, 66, 25, 25, 25 ) },
      ${makeEntry( `${ __dirname }/src/modified-file2.ts`, 99, 50, 75, 50 ) },
      ${makeEntry( `${ __dirname }/src/created-file1.ts`, 66, 100, 25, 50 ) },
      ${makeEntry( `${ __dirname }/src/created-file2.ts`, 99, 75, 50, 25 ) },
      ${makeEntry( `${ __dirname }/src/unmodified-field.ts`, 25, 25, 25, 25 ) }
    }`,
    ] )
  } )

  afterEach( () => {
    jest.resetAllMocks()
  } )

  it( 'will only report on new files when reportFileSet is set to "created"', async () => {
    await reportCoverage( {
      reportFileSet: "created",
    } )
    expect( console.log ).toBeCalled()
  } )

  it( "will find a coverage file when using an explict source type", async () => {
    await reportCoverage( {
      coveragePath: { path: "coverage-summary.json", type: "json-summary" },
      reportFileSet: "created",
    } )
    expect( console.log ).toBeCalled()
  } )

  it( "can combine multiple coverage files", async () => {
    setupCoverageFile( [
      `{
        ${makeEntry( "total", 50, 50, 50, 50 ) },
        ${makeEntry( `${ __dirname }/src/modified-file1.ts`, 66, 25, 25, 25 ) },
        ${makeEntry( `${ __dirname }/src/modified-file2.ts`, 99, 50, 75, 50 ) }
      }`,
      `{
        ${makeEntry( "total", 50, 50, 50, 50 ) },
        ${makeEntry( `${ __dirname }/src/created-file1.ts`, 66, 100, 25, 50 ) },
        ${makeEntry( `${ __dirname }/src/created-file2.ts`, 99, 75, 50, 25 ) }
      }`,
    ] )
    await reportCoverage( {
      reportFileSet: "createdOrModified",
      coveragePaths: [ "coverage-path-1", "coverage-path-2" ],
    } )
    expect( console.log ).toBeCalled()
  } )

  it( 'will only report on modified files when reportFileSet is set to "modified"', async () => {
    await reportCoverage( {
      reportFileSet: "modified",
    } )
    expect( console.log ).toBeCalled()
  } )
  it( 'will only report on created and modified files when reportFileSet is set to "createdOrModified"', async () => {
    await reportCoverage( {
      reportFileSet: "createdOrModified",
    } )
    expect( console.log ).toBeCalled()
  } )

  it( 'will report all files when reportFileSet is set to "all"', async () => {
    await reportCoverage( {
      reportFileSet: "all",
    } )
    expect( console.log ).toBeCalled()
  } )
} )
