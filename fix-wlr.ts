import fs from 'fs';
let content = fs.readFileSync('src/domain/sprint/orchestrator/watch-loop-runner.ts', 'utf8');

// Replace finalizeSprintRun body
content = content.replace(
  /private async finalizeSprintRun\([^]*?private async cleanupTerminalSprintCliWorkspaces/m,
  `private async finalizeSprintRun(params: any): Promise<{ status: "continue" | "exit" | "wait"; report: string }> {\n    return this.sprintFinalizationService.finalize(params);\n  }\n\n  private async cleanupTerminalSprintCliWorkspaces`
);

// Remove cleanupTerminalSprintCliWorkspaces and resolveWorkspaceReferenceFromTaskRunEvents
content = content.replace(
  /private async cleanupTerminalSprintCliWorkspaces\([^]*?\}\n\n  private resolveWorkspaceReferenceFromTaskRunEvents\([^]*?\}\n    return undefined;\n  \}\n/m,
  ''
);

// Add import and constructor injection
content = content.replace(
  /import { WorkspaceManager } from "\.\.\/\.\.\/\.\.\/infrastructure\/providers\/cli\/workspace-manager\.js";/,
  `import { WorkspaceManager } from "../../../infrastructure/providers/cli/workspace-manager.js";\nimport { SprintFinalizationService } from "./sprint-finalization-service.js";`
);

content = content.replace(
  /export class WatchLoopRunner \{/,
  `export class WatchLoopRunner {\n  private readonly sprintFinalizationService: SprintFinalizationService;`
);

content = content.replace(
  /constructor\([\s\S]*?\) \{/,
  `$&
    this.sprintFinalizationService = new SprintFinalizationService(
      this.deps,
      this.renderMainMergeCiFeedback,
      this.triggerAutoPromote.bind(this)
    );`
);

// We need to fix the params type for finalizeSprintRun
content = content.replace(
  /private async finalizeSprintRun\(params: any\)/,
  `private async finalizeSprintRun(params: {
    scopedExecutionContext: SprintExecutionContext & { sprintNumber: number };
    sprintRunId: string;
    repoPath: string;
    defaultFeatureBranch: string;
    defaultBranch: string;
    featureBranchPrefix: string;
    githubMode: "REMOTE" | "LOCAL";
    ciIntelligence: CiIntelligenceSettings;
    subtasks: Subtask[];
    runningTasks: Subtask[];
    readyTasks: Subtask[];
    manualMergeTasks: Subtask[];
    needsManualMerge: boolean;
    allTerminal: boolean;
    noMoreActionPossible: boolean;
    activeMainMergeAttentionItems: Array<{ id: string; sprintRunId: string | null; attentionType: string; ownerType?: string; status?: string; summaryMarkdown: string; payload: Record<string, unknown> | null }>;
  })`
);

fs.writeFileSync('src/domain/sprint/orchestrator/watch-loop-runner.ts', content);
