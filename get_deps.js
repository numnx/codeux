import fs from "fs";

const content = fs.readFileSync("src/contracts/app-types.ts", "utf8");

// A simple block extractor
const blocks = [];
let currentBlock = [];
let currentName = null;

const lines = content.split('\n');
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (line.startsWith('export interface ') || line.startsWith('export type ')) {
    const match = line.match(/^export (?:interface|type) ([A-Za-z0-9_]+)/);
    if (match) {
      currentName = match[1];
      currentBlock = [line];
      // if it's a one-line type
      if (line.includes(';') && !line.includes('{')) {
          blocks.push({ name: currentName, lines: currentBlock });
          currentName = null;
      }
    }
  } else if (currentName) {
    currentBlock.push(line);
    if (line.startsWith('}') || (currentBlock[0].startsWith('export type') && line.endsWith(';'))) {
        // wait, type might be multi-line
        // let's just do a basic brace counter
        let openBraces = 0;
        let closedBraces = 0;
        for (const l of currentBlock) {
            openBraces += (l.match(/\{/g) || []).length;
            closedBraces += (l.match(/\}/g) || []).length;
        }
        if (openBraces === closedBraces) {
            // also for `export type X = A | B;`
            if (openBraces > 0 || line.endsWith(';')) {
                blocks.push({ name: currentName, lines: currentBlock });
                currentName = null;
            }
        }
    }
  }
  i++;
}

console.log(`Found ${blocks.length} blocks`);
fs.writeFileSync('blocks.json', JSON.stringify(blocks, null, 2));
