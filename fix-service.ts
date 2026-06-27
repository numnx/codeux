import fs from 'fs';

let content = fs.readFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', 'utf8');

// We need to keep finalizeSprintRun, cleanupTerminalSprintCliWorkspaces, resolveWorkspaceReferenceFromTaskRunEvents, triggerAutoPromote, renderInstruction

content = content.replace(/async run\([^]*?private triggerAutoPromote/m, 'private triggerAutoPromote');
content = content.replace(/private triggerAutoPromote\([^]*?private async handleCycleTransition/m, 'private async handleCycleTransition');
content = content.replace(/private evaluateControlIntervention\([^]*?private async finalizeSprintRun/m, 'private async finalizeSprintRun');
content = content.replace(/private async handleCycleTransition\([^]*?private async finalizeSprintRun/m, 'private async finalizeSprintRun');

fs.writeFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', content);
