import fs from 'fs';

let code = fs.readFileSync('dashboard/src/v2/i18n/messages/stats.ts', 'utf8');

// The test expects `chartCore` in 'es' to be 'Núcleo'
// But my generic translator output 'Core [es]' because 'Core' wasn't in the glossary.

code = code.replace(/chartCore:\s*"Core \[es\]"/, 'chartCore: "Núcleo"');

// Wait, let's check the test file to see what it specifically asserts for Spanish.
