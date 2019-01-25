import { makeCompleteConfiguration } from "../../model/config.model"

describe( "makeCompleteConfiguration", () => {
  const base = {
    coveragePaths: [ "./coverage/coverage-summary.json" ],
    reportFileSet: "all",
    entrySortMethod: "alphabetically",
    threshold: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  }

  it( "returns a default configuration when sent undefined", () => {
    const output = makeCompleteConfiguration()
    expect( output ).toEqual( base )
  } )

  it( "overrides coveragePaths with the value from coveragePath", () => {
    const output = makeCompleteConfiguration( {
      coveragePath: "some-other-path",
    } )
    expect( output ).toEqual( { ...base, coveragePaths: [ "some-other-path" ] } )
  } )

} )
