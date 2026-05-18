import fs from 'fs';
import path from 'path';

function searchForIssue() {
    const data = fs.readFileSync('dashboard/src/v2/pages/settings/SettingsPage.tsx', 'utf8');
    console.log(data);
}

try {
    searchForIssue();
} catch (e) {
    console.log(e);
}
