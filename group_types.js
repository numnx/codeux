import fs from "fs";

const declarations = JSON.parse(fs.readFileSync("declarations.json", "utf8"));

// Grouping heuristic based on prefixes and common words
const groups = {
    "activity": [],
    "git-tracking": [],
    "realtime": [],
    "subtask": [],
    "provider": [],
    "dashboard-settings": [],
    "dashboard": [],
    "onboarding": [],
    "sprint-preview": [],
    "file-browser": [],
    "jules": [],
    "telemetry": [],
    "execution-stats": [],
    "project-stats": [],
    "execution": [],
    "app": [] // default catch-all
};

function assignGroup(name) {
    if (name.startsWith("Git")) return "git-tracking";
    if (name.startsWith("DashboardRealtime")) return "realtime";
    if (name.startsWith("Subtask")) return "subtask";
    if (name.startsWith("Provider") || name === "QwenModelProviderSettings" || name.endsWith("ProviderSettings") || name.startsWith("AiProvider")) return "provider";
    if (name.startsWith("Onboarding")) return "onboarding";
    if (name.startsWith("SprintPreview")) return "sprint-preview";
    if (name.startsWith("FileBrowser")) return "file-browser";
    if (name.startsWith("Jules")) return "jules";
    if (name.includes("Activity")) return "activity";
    if (name.startsWith("OverviewTelemetry")) return "telemetry";
    if (name.startsWith("Execution")) {
        if (name.includes("Stats") || name.includes("Metrics") || name.includes("Summary") || name.includes("Totals") || name.includes("Counts")) {
            return "execution-stats";
        }
        return "execution";
    }
    if (name.startsWith("ProjectStats") || name.startsWith("ProjectExecutionStats")) return "project-stats";

    // settings related
    if (name.endsWith("Settings") || name === "SkillToggle" || name === "McpToolToggle" || name === "CustomMcpTransport" || name === "CustomMcpServer" || name === "RuntimeLogLevel" || name === "ConsoleLogMode" || name.endsWith("WorkflowSettings") || name === "DashboardSettingsScope" || name === "ExternalSettingsHints" || name === "AutomationLevel" || name === "InterventionOwner" || name === "GuardrailJobType" || name === "GuardrailOnLimitAction" || name === "GuardrailJobConfig" || name === "BackgroundPattern") {
        return "dashboard-settings";
    }

    if (name.startsWith("Dashboard")) return "dashboard";

    return "app";
}

for (const decl of declarations) {
    const groupName = assignGroup(decl.name);
    groups[groupName].push(decl.name);
}

for (const [groupName, names] of Object.entries(groups)) {
    if (names.length > 0) {
        console.log(`\n### ${groupName} ###`);
        console.log(names.join(", "));
    }
}
