import { Metrics, Node } from "../model/report.model"

const PCT_COLS = 9
const MISSING_COL = 18
const TAB_SIZE = 1
const DELIM = " |"
const COL_DELIM = "-|"
export default class TextReport {
  static watermarksConfig: {[key: string]: number[]} = {
    statements: [50, 80],
    functions: [50, 80],
    branches: [50, 80],
    lines: [50, 80]
  }
  static classForPercent(type: string, value: number) {
    const watermarks: number[] = this.watermarksConfig[type]
    if (!watermarks) {
        return "unknown"
    }
    if (value < watermarks[0]) {
        return "low"
    }
    if (value >= watermarks[1]) {
        return "high"
    }
    return "medium"
  }
  static padding( num: number, ch?: string ) {
    let str = ""
    ch = ch || " "
    for ( let i = 0; i < num; i += 1 ) {
      str += ch
    }
    return str
  }

  static fill( str: string, width: number, right: boolean, tabs?: number ) {
    tabs = tabs || 0
    str = String( str )

    const leadingSpaces = tabs * TAB_SIZE
    const remaining = width - leadingSpaces
    const leader = this.padding( leadingSpaces )
    const strlen = str.length
    let fillStr
    let fmtStr = ""

    if ( remaining > 0 ) {
      if ( remaining >= strlen ) {
        fillStr = this.padding( remaining - strlen )
        fmtStr = right ? fillStr + str : str + fillStr
      } else {
        fmtStr = str.substring( strlen - remaining )
        fmtStr = "... " + fmtStr.substring( 4 )
      }
    }

    return leader + fmtStr
  }

  static formatName( name: string, maxCols: number, level: number ) {
    return this.fill( name, maxCols, false, level )
  }

  static formatPct( pct: string, width?: number ) {
    return this.fill( pct, width || PCT_COLS, true, 0 )
  }

  static  makeLine( nameWidth: number ) {
    const name = this.padding( nameWidth, "-" )
    const pct = this.padding( PCT_COLS, "-" )
    const elements = []

    elements.push( name )
    elements.push( pct )
    elements.push( pct )
    elements.push( pct )
    elements.push( pct )
    elements.push( this.padding( MISSING_COL, "-" ) )
    return elements.join( COL_DELIM ) + COL_DELIM
  }

  static tableHeader( maxNameCols: number ) {
    const elements = []
    elements.push( this.formatName( "File", maxNameCols, 0 ) )
    elements.push( this.formatPct( "% Stmts" ) )
    elements.push( this.formatPct( "% Branch" ) )
    elements.push( this.formatPct( "% Funcs" ) )
    elements.push( this.formatPct( "% Lines" ) )
    elements.push( this.formatPct( "Uncovered Line #s", MISSING_COL ) )
    return elements.join( " |" ) + " |"
  }

  static missingLines( lines: string[], colorizer: any ) {
    return colorizer( this.formatPct( lines ? lines.join( "," ) : lines, MISSING_COL ), "low" )
  }

  static missingBranches( branches: any, colorizer: any ) {
    const missingLines = Object.keys( branches ).filter( ( key ) => {
      return branches[ key ].coverage < 100
    } ).map( ( key ) => {
      return key
    } )
    return colorizer( this.formatPct( missingLines.join( "," ), MISSING_COL ), "medium" )
  }

  static isFull( metrics: any ) {
    return metrics.statements.pct === 100 &&
      metrics.branches.pct === 100 &&
      metrics.functions.pct === 100 &&
      metrics.lines.pct === 100
  }

  static tableRow( row: Node, maxNameCols: number, level: number, skipEmpty?: boolean, skipFull?: boolean ) {
    const name = row.name
    const metrics = { ...row }
    const isEmpty = metrics.statements.pct && metrics.branches.pct && metrics.functions.pct && metrics.lines.pct
    if ( skipEmpty && isEmpty ) { return "" }
    if ( skipFull && this.isFull( metrics ) ) { return "" }

    const mm: Metrics = {
      statements: isEmpty ? 0 : metrics.statements.pct,
      branches: isEmpty ? 0 : metrics.branches.pct,
      functions: isEmpty ? 0 : metrics.functions.pct,
      lines: isEmpty ? 0 : metrics.lines.pct,
    }
    const colorize = isEmpty ? ( str: string ) => str : ( str: string, key: string ) => {
      return this.colorize( str, this.classForPercent( key, Number(mm[ key ]) ) )
    }
    const elements = []

    elements.push( colorize( this.formatName( name, maxNameCols, level ), "statements" ) )
    elements.push( colorize( this.formatPct( mm.statements ), "statements" ) )
    elements.push( colorize( this.formatPct( mm.branches ), "branches" ) )
    elements.push( colorize( this.formatPct( mm.functions ), "functions" ) )
    elements.push( colorize( this.formatPct( mm.lines ), "lines" ) )
    if ( Number( mm.lines ) === 100 ) {
      elements.push( this.missingBranches( row, this.colorize ) )
    } else {
      elements.push( this.missingLines( row.lines.skipped, this.colorize ) )
    }
    return elements.join( DELIM ) + DELIM
  }
  static colorize(str: string, clazz: string) {
    const colors: {[key: string]: string} = {
        low: "31;1",
        medium: "33;1",
        high: "32;1"
    }

    if (colors[clazz]) {
        return "\u001b[" + colors[clazz] + "m" + str + "\u001b[0m"
    }
    return str
}
}
