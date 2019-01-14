import * as fs from "fs"

export default class FilesystemService
{
  exists ( path: string )
  {
    return fs.existsSync( path )
  }

  read ( path: string )
  {
    return fs.readFileSync( path, "utf8" )
  }
}
