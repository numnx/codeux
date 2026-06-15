import { Project } from "ts-morph";
import fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths("src/contracts/**/*.ts");

const appTypesFile = project.getSourceFileOrThrow("src/contracts/app-types.ts");

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
    "execution": ["ExecutionDashboardSnapshot", "ThinkingMode", "InvocationRoutingProfile", "InvocationRoutingId", "CliExecutionMode", "FeaturePrAutoMergeMode", "WorkerExecutionMode", "AgentRoutingMode"],
    "system": ["ReadinessProbeStatus", "DockerContainer", "LiveActivitiesResponse"]
};

const importDeclarationsMap = new Map();
appTypesFile.getImportDeclarations().forEach(i => {
    importDeclarationsMap.set(i.getModuleSpecifierValue(), {
        names: i.getNamedImports().map(ni => ni.getName()),
        defaultImport: i.getDefaultImport()?.getText()
    });
});


for (const [groupName, types] of Object.entries(groups)) {
    if (types.length === 0) continue;

    console.log(`Processing group ${groupName}...`);

    // Create new file
    const newFileName = `src/contracts/${groupName}-types.ts`;
    let newFile = project.getSourceFile(newFileName);
    if (!newFile) {
        newFile = project.createSourceFile(newFileName, "", { overwrite: true });
    }

    // To handle dependencies, we will just move them and then fix missing imports
    for (const typeName of types) {
        const typeDecl = appTypesFile.getTypeAlias(typeName);
        const intDecl = appTypesFile.getInterface(typeName);

        if (typeDecl) {
            newFile.addStatements(typeDecl.getText());
            typeDecl.remove();
        } else if (intDecl) {
            newFile.addStatements(intDecl.getText());
            intDecl.remove();
        } else {
            console.log(`Warning: Could not find type ${typeName}`);
        }
    }
}

// Add re-exports to app-types.ts
for (const [groupName, types] of Object.entries(groups)) {
    if (types.length > 0) {
        appTypesFile.addExportDeclaration({
            namedExports: types,
            moduleSpecifier: `./${groupName}-types.js`
        });
    }
}

appTypesFile.saveSync();
for (const [groupName, types] of Object.entries(groups)) {
     if (types.length > 0) {
          project.getSourceFile(`src/contracts/${groupName}-types.ts`).saveSync();
     }
}

console.log("Initial move complete. Need to fix imports.");
