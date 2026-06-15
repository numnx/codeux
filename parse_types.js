import fs from 'fs';

const content = fs.readFileSync('src/contracts/app-types.ts', 'utf8');

// Use typescript parser or just simple regex block extraction
// A block starts with `export interface` or `export type` and ends when curly braces are balanced or newline if type.

let isBlock = false;
let blockStr = '';
const blocks = [];

for (const line of content.split('\n')) {
  if (!isBlock && line.match(/^export (interface|type) /)) {
    isBlock = true;
    blockStr = line + '\n';
  } else if (isBlock) {
    blockStr += line + '\n';
  }
}
