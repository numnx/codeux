import fs from 'fs';

let code = fs.readFileSync('dashboard/src/v2/i18n/messages/stats.ts', 'utf8');

// The test only strictly checks chartCore is 'Núcleo'
code = code.replace(/"Core \[es\]"/, '"Núcleo"');

fs.writeFileSync('dashboard/src/v2/i18n/messages/stats.ts', code, 'utf8');
