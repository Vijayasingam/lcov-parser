import { exec } from "child_process"
import { parseGitRootPathOutput, trimLineEnding } from "../utils/filename-utils"

export class GitService {
  /**
   * Finds the path of the local git directory.
   * @returns A promise with the directory path
   */
  getRootDirectory(): Promise<string> {
    return new Promise( resolve => {
      exec( "git rev-parse --show-toplevel", ( error, stdout, stderr ) => {
        const failed = error || stderr !== ""
        resolve( failed ? __dirname : parseGitRootPathOutput( stdout ) )
      } )
    } )
  }

  /**
   * Finds the current git commit.
   * @returns A promise with the current git commit
   */
  getCurrentCommit(): Promise<string> {
    return new Promise( resolve => {
      exec( "git rev-list --no-merges --abbrev-commit -n 1 HEAD", ( error, stdout, stderr ) => {
        const failed = error || stderr !== ""
        resolve( failed ? "HEAD" : trimLineEnding( stdout ) )
      } )
    } )
  }
  getModifiedFiles(): Promise<string[]> {
    return new Promise( resolve => {
      exec( "git diff --name-only && git diff --name-only --cached", ( error, stdout, stderr ) => {
        const failed = error || stderr !== ""
        resolve( failed ? [] : stdout.split("\n"))
      } )
    } )
  }
  getCreatedFiles(): Promise<string[]> {
    return new Promise( resolve => {
      exec( "git ls-files --exclude-standard --others && git diff --name-only --cached", ( error, stdout, stderr ) => {
        const failed = error || stderr !== ""
        resolve( failed ? [] : stdout.split("\n"))
      } )
    } )
  }
}
