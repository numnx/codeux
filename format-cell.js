import fs from 'fs';

let content = fs.readFileSync('dashboard/src/v2/components/sprints/SprintCell.tsx', 'utf-8');
content = content.replace(
    /const getCardDateFormatter = \(locale: string\) => new Intl\.DateTimeFormat\(locale, \{ month: "short", day: "numeric" \}\);/,
    ''
);
// I removed this earlier properly, but it seems there's another occurrence.
// Wait, I didn't remove it properly. I'll just remove it if it's there. Let's see what's actually in SprintCell.tsx
fs.writeFileSync('dashboard/src/v2/components/sprints/SprintCell.tsx', content);
