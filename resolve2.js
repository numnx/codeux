import fs from "fs";
const blocks = JSON.parse(fs.readFileSync('blocks.json', 'utf8'));

// Manually extract GuardrailOnLimitAction and any other missing blocks
// GuardrailOnLimitAction was probably split across lines but didn't match the regex right.

const content = fs.readFileSync("src/contracts/app-types.ts", "utf8");
let inBlock = false;
let blockLines = [];
let blockName = null;
let allTypes = [];

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!inBlock) {
     const match = line.match(/^export (?:type|interface) ([A-Za-z0-9_]+)/);
     if (match) {
         inBlock = true;
         blockName = match[1];
         blockLines = [line];

         if (line.includes(';') && !line.includes('{')) {
             allTypes.push({ name: blockName, lines: blockLines });
             inBlock = false;
         }
     }
  } else {
      blockLines.push(line);
      // Wait for the closing '}' or ';' if type
      let openBraces = 0;
      let closedBraces = 0;
      for (const l of blockLines) {
          openBraces += (l.match(/\{/g) || []).length;
          closedBraces += (l.match(/\}/g) || []).length;
      }

      // it could be a type definition `export type X = \n "a" | "b";`
      if (blockLines[0].startsWith('export type')) {
          if (line.trim().endsWith(';')) {
              allTypes.push({ name: blockName, lines: blockLines });
              inBlock = false;
          }
      } else {
          if (openBraces > 0 && openBraces === closedBraces) {
              allTypes.push({ name: blockName, lines: blockLines });
              inBlock = false;
          }
      }
  }
}

console.log("Total extracted:", allTypes.length);
fs.writeFileSync('blocks2.json', JSON.stringify(allTypes, null, 2));
