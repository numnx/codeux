import fs from 'fs';
let content = fs.readFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', 'utf8');

// Replace this.renderInstruction with this.deps.renderInstruction
content = content.replace(/this\.renderInstruction\(/g, 'this.deps.renderInstruction(');

// Add triggerAutoPromote back as a constructor parameter
content = content.replace(
  /private readonly renderMainMergeCiFeedback: \([^]*?\) => Promise<MergeFeedbackResult>/,
  `$&,\n    private readonly triggerAutoPromote: (projectId: string, sprintId: string) => void`
);

// Rename finalizeSprintRun to finalize and make it public
content = content.replace(/private async finalizeSprintRun\(/, 'async finalize(');

fs.writeFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', content);
