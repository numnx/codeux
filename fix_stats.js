const fs = require('fs');
let content = fs.readFileSync('dashboard/src/v2/i18n/messages/stats.ts', 'utf8');

const enM = content.match(/en:\s*\{([\s\S]*?)\s*\},\s*de:\s*\{/);
const deM = content.match(/de:\s*\{([\s\S]*?)\s*\},\s*es:\s*\{/);
const esM = content.match(/es:\s*\{([\s\S]*?)\s*\}\s*,?\s*\}\);/);

function groupLines(block) {
    const lines = block.split('\n');
    let result = '';
    let currentLine = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (currentLine.length > 200 || i % 5 === 0) {
            result += '    ' + currentLine.trim() + '\n';
            currentLine = '';
        }
        currentLine += (currentLine ? ' ' : '') + line;
    }
    if (currentLine) {
        result += '    ' + currentLine.trim() + '\n';
    }
    return result;
}

const newEn = groupLines(enM[1]);
const newDe = groupLines(deM[1]);
const newEs = groupLines(esM[1]);

const finalContent = `import { defineDashboardMessages } from "../locales.js";

export const statsMessages = defineDashboardMessages({
  en: {
${newEn}
  },
  de: {
${newDe}
  },
  es: {
${newEs}
  },
});
`;

fs.writeFileSync('dashboard/src/v2/i18n/messages/stats.ts', finalContent);
