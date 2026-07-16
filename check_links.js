const fs = require('fs');
const path = require('path');
const glob = require('glob');

const mdFiles = glob.sync('docs/settings/*.md');

function validateLinks(file) {
    const dir = path.dirname(file);
    const content = fs.readFileSync(file, 'utf8');
    const linkRegex = /\]\(([^)]+)\)/g;

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const link = match[1];
        if (link.startsWith('http') || link.startsWith('#')) continue;

        const absolutePath = path.resolve(dir, link);
        if (!fs.existsSync(absolutePath)) {
            console.log(`Broken link in ${file}: ${link} -> ${absolutePath}`);
        }
    }
}

mdFiles.forEach(validateLinks);
