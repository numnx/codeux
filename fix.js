import fs from 'fs';

let content = fs.readFileSync('dashboard/src/v2/components/sprints/SprintCell.tsx', 'utf-8');

// The file was modified by me previously with regex:
// content.replace(/CARD_DATE_FORMATTER\.format/g, 'getCardDateFormatter(locale).format');
// But I replaced the actual string with formatDate logic earlier or someone else did?
// Let's check `getCardDateFormatter` calls
