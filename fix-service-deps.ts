import fs from 'fs';
let content = fs.readFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', 'utf8');

// Remove cycleRunner parameter from constructor
content = content.replace(
  /private readonly cycleRunner: CycleRunner,\n    private readonly renderMainMergeCiFeedback:/,
  `private readonly renderMainMergeCiFeedback:`
);

fs.writeFileSync('src/domain/sprint/orchestrator/sprint-finalization-service.ts', content);
