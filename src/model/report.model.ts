export interface Node {
  [key: string]: any;
}
export interface Metrics {
  statements: string;
  branches: string;
  functions: string;
  lines: string;
  [key: string]: string;
}
