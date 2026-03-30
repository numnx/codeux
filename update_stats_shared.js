import fs from 'fs';

let content = fs.readFileSync('dashboard/src/v2/pages/stats/components/StatsShared.tsx', 'utf-8');

// The TelemetryLedger component is between lines 1333 and 1535.
// Let's use string manipulation to remove it.
const startStr = 'export const TelemetryLedger: FunctionComponent<{';
const startIdx = content.indexOf(startStr);

if (startIdx !== -1) {
  // Let's find the end of the component. It ends with:
  //   );
  // };
  // followed by EOF. Wait, it's actually the end of the file based on grep.

  content = content.substring(0, startIdx);
  fs.writeFileSync('dashboard/src/v2/pages/stats/components/StatsShared.tsx', content);
  console.log('Removed TelemetryLedger from StatsShared.tsx');
} else {
  console.log('TelemetryLedger not found in StatsShared.tsx');
}
