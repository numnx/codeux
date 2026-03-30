const fs = require('fs');
const path = require('path');

const tailwindConfigPath = path.join(__dirname, 'tailwind.config.ts');
let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');

tailwindConfig = tailwindConfig.replace(/green: "#008667",\s*\/\/\s*Running[^\n]*/, 'green: "#008667",');
tailwindConfig = tailwindConfig.replace(/red: "#D9000E",\s*\/\/\s*Failed[^\n]*/, 'red: "#D9000E",');
tailwindConfig = tailwindConfig.replace(/amber: "#A66200",\s*\/\/\s*Intervention[^\n]*/, 'amber: "#A66200",');

fs.writeFileSync(tailwindConfigPath, tailwindConfig);
console.log('Done');
