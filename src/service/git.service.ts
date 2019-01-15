import { exec } from "child_process"
import { parseGitRootPathOutput, trimLineEnding } from "../utils/filename-utils"

export class GitService
{
  /**
   * Finds the path of the local git directory.
   * @returns A promise with the directory path
   */
  getRootDirectory (): Promise<string>
  {
    return new Promise( resolve =>
    {
      exec( "git rev-parse --show-toplevel", ( error, stdout, stderr ) =>
      {
        const failed = error || stderr !== ""
        resolve( failed ? __dirname : parseGitRootPathOutput( stdout ) )
      } )
    } )
  }

  /**
   * Finds the current git commit.
   * @returns A promise with the current git commit
   */
  getCurrentCommit (): Promise<string>
  {
    return new Promise( resolve =>
    {
      exec( "git rev-list --no-merges --abbrev-commit -n 1 HEAD", ( error, stdout, stderr ) =>
      {
        const failed = error || stderr !== ""
        resolve( failed ? "HEAD" : trimLineEnding( stdout ) )
      } )
    } )
  }
  getModifiedFiles (): string[]
  {
    new Promise( resolve =>
    {
      exec( "git rev-list --no-merges --abbrev-commit -n 1 HEAD", ( error, stdout, stderr ) =>
      {
        const failed = error || stderr !== ""
        resolve( failed ? "HEAD" : trimLineEnding( stdout ) )
      } )
    } )
    return [];
  }
  getCreatedFiles (): string[]
  {
    new Promise( resolve =>
    {
      exec( "git rev-list --no-merges --abbrev-commit -n 1 HEAD", ( error, stdout, stderr ) =>
      {
        const failed = error || stderr !== ""
        resolve( failed ? "HEAD" : trimLineEnding( stdout ) )
      } )
    } )
    return [];
  }
}
