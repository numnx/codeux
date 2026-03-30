import fs from 'fs';

let content = fs.readFileSync('dashboard/src/v2/pages/stats/components/TelemetryLedger.tsx', 'utf-8');

const imports = `import type { FunctionComponent } from "preact";
import { useMemo, useState } from "preact/hooks";
import { ArrowDownRight, ArrowUpRight, Brain, Database } from "lucide-preact";
import { useProgressiveList } from "../../../../hooks/use-progressive-list.js";
import type { ExecutionStatsEntitySummary } from "../../../types.js";
import { formatTokens, formatDuration, formatDateTime } from "../stats-utils.js";
import {
  CHIP_CLASS,
  INPUT_CLASS,
  LEDGER_ROW_CLASS,
  PANEL_CLASS,
  SUBPANEL_CLASS,
  SortButton,
  TokenChip,
  getLedgerSortValue,
  type LedgerSortKey
} from "./StatsShared.js";

`;

content = imports + content;

// Remove tokenShare and timeShare calculation
content = content.replace(/const tokenShare = topTokens > 0 \? \(item\.usage\.totalTokens \/ topTokens\) \* 100 : 0;\n\s+const timeShare = topTime > 0 \? \(item\.usage\.activeTimeMs \/ topTime\) \* 100 : 0;/g, '');

// Remove tokenShare UI block
content = content.replace(/<div>\s*<div className="flex items-center justify-between text-\[10px\] font-bold uppercase tracking-\[0\.16em\] text-slate-400">\s*<span>Token share<\/span>\s*<span>\{formatPercent\(tokenShare\)\}<\/span>\s*<\/div>\s*<div className="mt-2 h-2\.5 rounded-full bg-black\/\[0\.05\] dark:bg-white\/\[0\.06\]">\s*<div\s*className="h-2\.5 rounded-full bg-\[linear-gradient\(90deg,rgba\(0,224,160,0\.92\),rgba\(14,165,233,0\.92\)\)\]"\s*style=\{\{ width: `\$\{Math\.max\(6, tokenShare\)\}%` \}\}\s*\/>\s*<\/div>\s*<\/div>/g, '');

// Remove timeShare UI block
content = content.replace(/<div>\s*<div className="flex items-center justify-between text-\[10px\] font-bold uppercase tracking-\[0\.16em\] text-slate-400">\s*<span>Active time share<\/span>\s*<span>\{formatPercent\(timeShare\)\}<\/span>\s*<\/div>\s*<div className="mt-2 h-2\.5 rounded-full bg-black\/\[0\.05\] dark:bg-white\/\[0\.06\]">\s*<div\s*className="h-2\.5 rounded-full bg-\[linear-gradient\(90deg,rgba\(255,184,0,0\.92\),rgba\(251,113,133,0\.92\)\)\]"\s*style=\{\{ width: `\$\{Math\.max\(6, timeShare\)\}%` \}\}\s*\/>\s*<\/div>\s*<\/div>/g, '');

// Remove formatPercent from imports if any, and topTokens / topTime logic as well
content = content.replace(/const topTokens = filteredItems\[0\]\?\.usage\.totalTokens \?\? 0;\n\s*const topTime = filteredItems\[0\]\?\.usage\.activeTimeMs \?\? 0;/g, '');


fs.writeFileSync('dashboard/src/v2/pages/stats/components/TelemetryLedger.tsx', content);
