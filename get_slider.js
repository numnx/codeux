const fs = require('fs');
const content = fs.readFileSync('dashboard/src/v2/components/browser/PreviewSessionSlider.tsx', 'utf8');
console.log(content.substring(content.indexOf('w-full relative group'), content.indexOf('w-full relative group') + 2000));
