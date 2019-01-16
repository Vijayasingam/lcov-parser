# lcov-parser
To Parse LCOV file and print in the console

[![Build Status](https://travis-ci.org/Vijayasingam/lcov-parser.svg?branch=master)](https://travis-ci.org/Vijayasingam/lcov-parser)
[![codecov](https://codecov.io/gh/Vijayasingam/lcov-parser/branch/master/graph/badge.svg)](https://codecov.io/gh/Vijayasingam/lcov-parser)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/Vijayasingam/lcov-parser/issues)

> LCOV Parser for monitoring code coverage on changed files.

## Usage

Install:
```sh
yarn add lcov-parser --dev
```
At a glance:
```js
// Post-Test script
import { reportCoverage } from "lcov-parser"

reportCoverage({
  // Set a custom success message
  customSuccessMessage: "Congrats, coverage is good",

  // Set a custom failure message
  customFailureMessage: "Coverage is a little low, take a look",

  // How to sort the entries in the table
  entrySortMethod: "alphabetical" // || "least-coverage" || "most-coverage" || "largest-file-size" ||"smallest-file-size" || "uncovered-lines"

  // Add a maximum number of entries to display
  numberOfEntries: 10,

  // The location of the istanbul coverage file.
  coveragePath: "./coverage/coverage-summary.json",
  // Alternatively, if you have multiple coverage summaries, you can merge them into one report
  coveragePaths: ["./dir1/coverage-summary.json", "./dir2/coverage-summary.json"]
  // You can also specify the format, instead of letting it be inferred from the file name
  coveragePath: { path: "./coverage/lcov.info", type: "lcov" /* ||  "json-summary" */}

  // Which set of files to summarise from the coverage file.
  reportFileSet: "all", // || "modified" || "created" || "createdOrModified"

  // What to do when the PR doesn't meet the minimum code coverage threshold
  reportMode: "log", // || "warn" || "error"

  // Minimum coverage threshold percentages. Compared against the cumulative coverage of the reportFileSet.
  threshold: {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  }
})
```

## Inspiration
Inspired by [danger-plugin-istanbul-coverage](https://github.com/darcy-rayner/danger-plugin-istanbul-coverage)
