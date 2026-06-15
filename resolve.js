import fs from "fs";

// Find types from original app-types.ts that didn't make it and see where they went.
const blocks = JSON.parse(fs.readFileSync('blocks.json', 'utf8'));
const allBlocks = blocks.map(b => b.name);
console.log("Total types in app-types.ts:", allBlocks.length);

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

let missing = [];
for (const [groupName, types] of Object.entries(groups)) {
   for (const t of types) {
       if (!allBlocks.includes(t)) {
           missing.push(t);
       }
   }
}

console.log("Types defined in groups but missing from app-types blocks:", missing);
