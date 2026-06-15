import fs from 'fs';

const content = fs.readFileSync('src/contracts/app-types.ts', 'utf8');

// A simple script to list exported types/interfaces in app-types.ts
const exportsList = [];
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^export (type|interface) ([A-Za-z0-9_]+)/);
  if (match) {
    exportsList.push(match[2]);
  }
}

console.log(`Found ${exportsList.length} exports`);
