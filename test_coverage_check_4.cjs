const fs = require('fs');
const json = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));

for (const [file, data] of Object.entries(json)) {
  if (!file.includes('LiveSessionPage.tsx')) continue;

  const f = data.f;
  for (const [key, count] of Object.entries(f)) {
      if (count === 0) {
        const func = data.fnMap[key];
        console.log(`Uncovered function: line ${func.loc.start.line} - ${func.name}`);
      }
  }
}
