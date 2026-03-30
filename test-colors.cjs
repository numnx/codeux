const fs = require('fs');
const path = require('path');

const tailwindConfigPath = path.join(__dirname, 'tailwind.config.ts');
let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');

tailwindConfig = tailwindConfig.replace(/red: "#D9000E",/, 'red: "#E42A2B",');
tailwindConfig = tailwindConfig.replace(/amber: "#A66200",/, 'amber: "#AD6500",');

fs.writeFileSync(tailwindConfigPath, tailwindConfig);
console.log('Done');
