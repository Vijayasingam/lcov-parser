import FilesystemService from "../service/filesystem.service"
import { GitService } from "../service/git.service"
import { reportCoverage } from "../index"
jest.mock( "../service/filesystem.service" )
jest.mock( "../service/git.service" )

// @ts-ignore
const basePath = "/some/random/path/to/repo"

//@ts-ignore
function makeCoverageEntry ( coverage: number )
{
  return `{
      "0": ${coverage < 25 ? 0 : 1 },
      "1": ${coverage < 50 ? 0 : 1 },
      "2": ${coverage < 75 ? 0 : 1 },
      "3":  ${coverage < 100 ? 0 : 1 }
    }`
}

function makeEntry (
  fileName: string,
  lineCoverage = 100,
  statementCoverage = 100,
  functionCoverage = 100,
  branchCoverage = 100
)
{
  return `
    "${fileName }": {
      "lines": { "total": 100, "covered": ${lineCoverage }, "skipped": 0, "pct": ${ lineCoverage } },
      "functions": { "total": 100, "covered": ${functionCoverage }, "skipped": 0, "pct": ${ functionCoverage } },
      "statements": { "total": 100, "covered": ${statementCoverage }, "skipped": 0, "pct": ${ statementCoverage } },
      "branches": { "total": 100, "covered": ${branchCoverage }, "skipped": 0, "pct": ${ branchCoverage } }
    }
  `
}

function setupGitService ( clearGit?: boolean )
{
  ; ( GitService as any ).mockImplementation( () =>
  {
    return {
      getRootDirectory: () => Promise.resolve( __dirname ),
      getCurrentCommit: () => Promise.resolve( "master" ),
      getModifiedFiles: () => clearGit ? [] : [ "src/modified-file1.ts", "src/modified-file2.ts" ],
      getCreatedFiles: () => clearGit ? [] : [ "src/created-file1.ts", "src/created-file2.ts" ],
    }
  } )
}

function setupCoverageFile ( coverages: string[] = [] )
{
  ; ( FilesystemService as any ).mockImplementation( () =>
  {
    return {
      exists: () => coverages.length !== 0,
      read: () =>
      {
        const coverage = coverages.pop()
        return coverage !== undefined ? coverage : undefined
      },
    }
  } )
}

describe( "reportCoverage()", () =>
{
  beforeEach( () =>
  {
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

  afterEach( () =>
  {
    jest.resetAllMocks()
  } )

  it( 'will only report on new files when reportFileSet is set to "created"', async () =>
  {
    await reportCoverage( {
      reportFileSet: "created",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in New Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
Total | (165/200) 83% | (175/200) 88% | (75/200) 38% | (75/200) 38%
`
    )
  } )

  it( "will find a coverage file when using an explict source type", async () =>
  {
    await reportCoverage( {
      coveragePath: { path: "coverage-summary.json", type: "json-summary" },
      reportFileSet: "created",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in New Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
Total | (165/200) 83% | (175/200) 88% | (75/200) 38% | (75/200) 38%
`
    )
  } )

  it( "can combine multiple coverage files", async () =>
  {
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
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in Created or Modified Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
[src/modified\\-file1.ts](../blob/master/src/modified\\-file1.ts) | (66/100) 66% | (25/100) 25% | (25/100) 25% | (25/100) 25%
[src/modified\\-file2.ts](../blob/master/src/modified\\-file2.ts) | (99/100) 99% | (50/100) 50% | (75/100) 75% | (50/100) 50%
Total | (330/400) 83% | (250/400) 63% | (175/400) 44% | (150/400) 38%
`
    )
  } )
  it( "will automatically infer the lcov source type", async () =>
  {
    setupCoverageFile( [
      `TN:
SF: ${__dirname }/src/created-file1.ts
FN: 1, func1
FNDA: 1, func1
FNH: 1
FNF: 1
BRF: 8
BRH: 4
LH: 15
LF: 20
end_of_record`,
    ] )
    await reportCoverage( {
      coveragePath: "lcov.info",
      reportFileSet: "created",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in New Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (15/20) 75% | (15/20) 75% | (1/1) 100% | (4/8) 50%
Total | (15/20) 75% | (15/20) 75% | (1/1) 100% | (4/8) 50%
`
    )
  } )

  it( "will use the lcov source type when specified explicitly", async () =>
  {
    setupCoverageFile( [
      `TN:
SF: ${__dirname }/src/created-file1.ts
FN: 1, func1
FNDA: 1, func1
FNH: 1
FNF: 1
BRF: 8
BRH: 4
LH: 15
LF: 20
end_of_record`,
    ] )
    await reportCoverage( {
      coveragePath: { path: "some.path", type: "lcov" },
      reportFileSet: "created",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in New Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (15/20) 75% | (15/20) 75% | (1/1) 100% | (4/8) 50%
Total | (15/20) 75% | (15/20) 75% | (1/1) 100% | (4/8) 50%
`
    )
  } )

  it( 'will only report on modified files when reportFileSet is set to "modified"', async () =>
  {
    await reportCoverage( {
      reportFileSet: "modified",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in Modified Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/modified\\-file1.ts](../blob/master/src/modified\\-file1.ts) | (66/100) 66% | (25/100) 25% | (25/100) 25% | (25/100) 25%
[src/modified\\-file2.ts](../blob/master/src/modified\\-file2.ts) | (99/100) 99% | (50/100) 50% | (75/100) 75% | (50/100) 50%
Total | (165/200) 83% | (75/200) 38% | (100/200) 50% | (75/200) 38%
`
    )
  } )
  it( 'will only report on created and modified files when reportFileSet is set to "createdOrModified"', async () =>
  {
    await reportCoverage( {
      reportFileSet: "createdOrModified",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in Created or Modified Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
[src/modified\\-file1.ts](../blob/master/src/modified\\-file1.ts) | (66/100) 66% | (25/100) 25% | (25/100) 25% | (25/100) 25%
[src/modified\\-file2.ts](../blob/master/src/modified\\-file2.ts) | (99/100) 99% | (50/100) 50% | (75/100) 75% | (50/100) 50%
Total | (330/400) 83% | (250/400) 63% | (175/400) 44% | (150/400) 38%
`
    )
  } )

  it( 'will report all files when reportFileSet is set to "all"', async () =>
  {
    await reportCoverage( {
      reportFileSet: "all",
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in All Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
[src/modified\\-file1.ts](../blob/master/src/modified\\-file1.ts) | (66/100) 66% | (25/100) 25% | (25/100) 25% | (25/100) 25%
[src/modified\\-file2.ts](../blob/master/src/modified\\-file2.ts) | (99/100) 99% | (50/100) 50% | (75/100) 75% | (50/100) 50%
[src/unmodified\\-field.ts](../blob/master/src/unmodified\\-field.ts) | (25/100) 25% | (25/100) 25% | (25/100) 25% | (25/100) 25%
Total | (355/500) 71% | (275/500) 55% | (200/500) 40% | (175/500) 35%
`
    )
  } )

  it( "will only show the maximum number of entries", async () =>
  {
    await reportCoverage( {
      reportFileSet: "all",
      numberOfEntries: 3,
    } )
    expect( console.table ).toHaveBeenCalledWith(
      `## Coverage in All Files
File | Line Coverage | Statement Coverage | Function Coverage | Branch Coverage
---- | ------------: | -----------------: | ----------------: | --------------:
[src/created\\-file1.ts](../blob/master/src/created\\-file1.ts) | (66/100) 66% | (100/100) 100% | (25/100) 25% | (50/100) 50%
[src/created\\-file2.ts](../blob/master/src/created\\-file2.ts) | (99/100) 99% | (75/100) 75% | (50/100) 50% | (25/100) 25%
[src/modified\\-file1.ts](../blob/master/src/modified\\-file1.ts) | (66/100) 66% | (25/100) 25% | (25/100) 25% | (25/100) 25%
Other (2 more) | (124/200) 62% | (75/200) 38% | (100/200) 50% | (75/200) 38%
Total | (355/500) 71% | (275/500) 55% | (200/500) 40% | (175/500) 35%
`
    )
  } )

  it( "fails the build when reportMode is set to FAIL and coverage is below threshold", async () =>
  {
    await reportCoverage( {
      reportMode: "fail",
    } )
    expect( console.error ).toBeCalled()
  } )

  it( "passes the build when reportMode is set to FAIL and coverage is above threshold", async () =>
  {
    await reportCoverage( {
      reportMode: "fail",
      threshold: {
        lines: 25,
        statements: 25,
        functions: 25,
        branches: 25,
      },
    } )
    expect( console.error ).not.toBeCalled()
  } )

  it( "warns the build when reportMode is set to WARN and coverage is below threshold", async () =>
  {
    await reportCoverage( {
      reportMode: "warn",
    } )
    expect( console.warn ).toBeCalled()
  } )

  it( "passes the build when reportMode is set to WARN and coverage is above threshold", async () =>
  {
    await reportCoverage( {
      reportMode: "warn",
      threshold: {
        lines: 25,
        statements: 25,
        functions: 25,
        branches: 25,
      },
    } )
    expect( console.warn ).not.toBeCalled()
  } )

  it( "logs the custom success message if one is specified and coverage is above threshold", async () =>
  {
    const customMessage = "This is the custom message"
    await reportCoverage( {
      reportMode: "message",
      customSuccessMessage: customMessage,
      threshold: {
        lines: 25,
        statements: 25,
        functions: 25,
        branches: 25,
      },
    } )
    expect( console.log ).toBeCalledWith( customMessage )
  } )

  it( "logs the custom failure message if one is specified and coverage is below threshold", async () =>
  {
    const customMessage = "This is the custom message"
    await reportCoverage( {
      reportMode: "message",
      customFailureMessage: customMessage,
    } )
    expect( console.log ).toBeCalledWith( customMessage )
  } )

  it( 'doesn\'t output anything when reportFileSet is set to "created" and there are no created files ', async () =>
  {
    setupGitService( true );
    await reportCoverage( {
      reportMode: "fail",
      reportFileSet: "created",
    } )
    expect( console.error ).not.toBeCalled()
    expect( console.warn ).not.toBeCalled()
    expect( console.log ).not.toBeCalled()
  } )

  it( 'doesn\'t output anything when reportFileSet is set to "modified" and there are no modified files ', async () =>
  {
    setupGitService( true );
    await reportCoverage( {
      reportMode: "fail",
      reportFileSet: "modified",
    } )
    expect( console.error ).not.toBeCalled()
    expect( console.warn ).not.toBeCalled()
    expect( console.log ).not.toBeCalled()
  } )
  it( "doesn't output anything when the coverage data is empty", async () =>
  {
    setupCoverageFile( [ "{}" ] )
    await reportCoverage( {
      reportMode: "fail",
    } )
    expect( console.error ).not.toBeCalled()
    expect( console.warn ).not.toBeCalled()
    expect( console.log ).not.toBeCalled()
  } )
  it( "outputs a warning when it can't find the coverage file", async () =>
  {
    setupCoverageFile( [] )
    await reportCoverage( {
      reportMode: "warn",
    } )
    expect( console.warn ).toBeCalled()
  } )
  it( "outputs a warning when coverage file is invalidly formatted", async () =>
  {
    setupCoverageFile( [ "{" ] )
    await reportCoverage( {
      reportMode: "fail",
    } )
    expect( console.warn ).toBeCalled()
  } )
} )
