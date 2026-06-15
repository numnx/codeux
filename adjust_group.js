import fs from 'fs';

const groups = {
    "activity": ["ActivitySummary"],
    "git-tracking": ["GitSettings", "GitStatusCheck", "GitPullRequestStatus", "GitCiRunStatus", "GitCiFailedJob", "GitMergeStatus", "GitTrackingScope", "GitTrackingTarget", "GitTrackingStatus", "GetCiStatusForScopeArgs", "AutoMergeFeaturePrArgs", "AutoMergeFeaturePrResult"],
    "realtime": ["DashboardRealtimeScopeType", "DashboardRealtimeEvent", "DashboardRealtimeSetSubscriptionsMessage", "DashboardRealtimeReadyMessage", "DashboardRealtimeSubscribedMessage", "DashboardRealtimeEventMessage", "DashboardRealtimeSnapshotRequiredMessage", "DashboardRealtimeServerMessage", "DashboardRealtimeClientMessage"],
    "subtask": ["SubtaskStatus", "SubtaskMergeIndicator", "Subtask", "PersistTaskMergedFlagArgs"],
    "provider": ["ProviderId", "ProviderConfigId", "ProviderStrategy", "ProviderSettings", "QwenModelProviderSettings", "AiProviderSettings", "VirtualWorkerProvider", "InvocationProviderOverrideSettings"],
    "dashboard-settings": ["Settings", "AutomationLevel", "InterventionOwner", "AutomationInterventionsSettings", "InvocationRoutingSettings", "JiraSettings", "CiIntelligenceSettings", "GuardrailJobType", "GuardrailOnLimitAction", "GuardrailJobConfig", "GuardrailSettings", "SprintLoopStepSettings", "CliWorkflowSettings", "WorkerSettings", "QualityAssuranceTriggerSettings", "QualityAssuranceSettings", "CodingAgentRoutingSettings", "ManualAgentRoutingSettings", "AgentRoutingSettings", "AgentSettings", "BackgroundPattern", "AppearanceSettings", "SkillToggle", "McpToolToggle", "CustomMcpTransport", "CustomMcpServer", "RuntimeLogLevel", "ConsoleLogMode", "DashboardSettings", "DashboardSettingsScope", "ExternalSettingsHints"],
    "dashboard": ["DashboardStatus", "DashboardStats", "DashboardStatusSnapshot", "ProjectLiveDashboardSnapshot"],
    "onboarding": ["OnboardingCheckStatus", "OnboardingClusterStatus", "OnboardingDependencyCheck", "OnboardingProviderCredentialStatus", "OnboardingRuntimeReadiness", "UserOnboardingState"],
    "sprint-preview": ["SprintPreviewSettings", "SprintPreviewSessionStatus", "SprintPreviewHealthStatus", "SprintPreviewStartupMode", "SprintPreviewSession", "SprintPreviewScript"],
    "file-browser": ["FileBrowserSessionStatus", "FileBrowserSession", "FileBrowserTreeNode", "FileBrowserTree", "FileBrowserFileContent", "FileBrowserChangeStatus", "FileBrowserChange", "FileBrowserChangeSet", "FileBrowserDiff", "LocalDirectoryBrowserEntry", "LocalDirectoryBrowserResponse"],
    "jules": ["JulesSource", "JulesSession", "JulesActivityArtifact", "JulesActivity", "PullRequestOutput", "SessionOutput"],
    "telemetry": ["OverviewTelemetryProjectSummary", "OverviewTelemetrySnapshot"],
    "execution-stats": ["ExecutionSprintRunSummary", "ExecutionHumanInterventionSummary", "ExecutionTaskDispatchSummary", "ExecutionRuntimeEventSummary", "ExecutionTaskRunEventSummary", "ExecutionConnectionSummary", "ExecutionAssignedWorkerSummary", "ExecutionAttentionItemSummary", "ExecutionUsageTotals", "ExecutionInvocationStatusCounts", "ExecutionDurationStats", "ExecutionModelStatsSummary", "ExecutionGitMetrics", "ExecutionGitStatsEntitySummary", "ExecutionGitStatsBucketSummary", "ExecutionGitStatsSummary", "ExecutionUsageBucketSummary", "ExecutionStatsEntitySummary"],
    "project-stats": ["ProjectStatsWindow", "ProjectStatsResolution", "ProjectStatsQuery", "ProjectStatsRangeSummary", "ProjectExecutionStatsChartSeries", "ProjectExecutionStatsSnapshot"],
    // Rename to avoid collision with existing execution-types.ts
    "execution-enums": ["ExecutionDashboardSnapshot", "ThinkingMode", "InvocationRoutingProfile", "InvocationRoutingId", "CliExecutionMode", "FeaturePrAutoMergeMode", "WorkerExecutionMode", "AgentRoutingMode"],
    "system": ["ReadinessProbeStatus", "DockerContainer", "LiveActivitiesResponse"]
};

const blocks = JSON.parse(fs.readFileSync('blocks3.json', 'utf8'));

const allTypes = Object.values(groups).flat();
const typeToFile = {};
for (const [groupName, types] of Object.entries(groups)) {
    for (const t of types) {
        typeToFile[t] = groupName + "-types";
    }
}

const unmapped = blocks.map(b => b.name).filter(n => !typeToFile[n]);
if (unmapped.length > 0) {
    groups["misc"] = unmapped;
    for (const t of unmapped) {
        typeToFile[t] = "misc-types";
    }
}

const externalImports = {
    "InstructionTemplateId": "../instructions/instruction-template-catalog.js",
    "ProviderInvocationPurpose": "./execution-types.js",
    "TokenUsageSource": "./execution-types.js",
    "MemorySettings": "./memory-types.js"
};

// Also read what's in execution-types.ts exactly
import { Project } from "ts-morph";
const project = new Project();
project.addSourceFilesAtPaths("src/contracts/**/*.ts");
const execTypesFile = project.getSourceFileOrThrow("src/contracts/execution-types.ts");
for (const [name, declarations] of execTypesFile.getExportedDeclarations()) {
    externalImports[name] = "./execution-types.js";
}

const regex = /\b([A-Z][a-zA-Z0-9_]+)\b/g;

function getRequiredImports(codeStr, currentFile) {
    const deps = new Set();
    let match;
    while ((match = regex.exec(codeStr)) !== null) {
        const word = match[1];
        if (typeToFile[word] && typeToFile[word] !== currentFile) {
            deps.add(word);
        } else if (externalImports[word]) {
            deps.add(word);
        }
    }
    return Array.from(deps);
}

for (const [groupName, types] of Object.entries(groups)) {
    if (types.length === 0) continue;

    const currentFile = groupName + "-types";

    const fileBlocks = [];
    const depsByFile = {};

    for (const typeName of types) {
        const block = blocks.find(b => b.name === typeName);
        if (!block) continue;

        let code = block.lines.join('\n');
        if (!code.startsWith('export')) {
             code = 'export ' + code;
        }
        fileBlocks.push(code);

        const required = getRequiredImports(code, currentFile);
        for (const req of required) {
            const reqFile = externalImports[req] || `./${typeToFile[req]}.js`;
            if (!depsByFile[reqFile]) depsByFile[reqFile] = new Set();
            depsByFile[reqFile].add(req);
        }
    }

    let content = "";
    for (const [file, imports] of Object.entries(depsByFile)) {
        content += `import type { ${Array.from(imports).join(", ")} } from "${file}";\n`;
    }
    if (Object.keys(depsByFile).length > 0) content += "\n";

    content += fileBlocks.join("\n\n") + "\n";

    fs.writeFileSync(`src/contracts/${currentFile}.ts`, content);
}

let appTypesContent = "import type { InstructionTemplateId } from \"../instructions/instruction-template-catalog.js\";\n";
appTypesContent += "import type { ProviderInvocationPurpose, TokenUsageSource } from \"./execution-types.js\";\n";
appTypesContent += "import type { MemorySettings } from \"./memory-types.js\";\n\n";

for (const [groupName, types] of Object.entries(groups)) {
    if (types.length === 0) continue;
    const currentFile = groupName + "-types";
    const existingTypes = types.filter(t => blocks.some(b => b.name === t));
    if (existingTypes.length > 0) {
        appTypesContent += `export type { ${existingTypes.join(", ")} } from "./${currentFile}.js";\n`;
    }
}

fs.writeFileSync(`src/contracts/app-types.ts`, appTypesContent);

console.log("Refactoring complete, avoided execution-types.ts collision.");
