import type { InvocationRoutingProfile, FeaturePrAutoMergeMode, CliExecutionMode, WorkerExecutionMode, AgentRoutingMode } from "./execution-enums-types.js";
import type { ProviderStrategy, ProviderConfigId, InvocationProviderOverrideSettings, ProviderId, AiProviderSettings } from "./provider-types.js";
import type { InstructionTemplateId } from "../instructions/instruction-template-catalog.js";
import type { GitSettings } from "./git-tracking-types.js";
import type { SprintPreviewSettings } from "./sprint-preview-types.js";
import type { MemorySettings } from "./memory-types.js";

export interface Settings {
  maxFailures?: number;
  [key: string]: unknown;
}

export type AutomationLevel = "FULL" | "SEMI_AUTO" | "ALWAYS_ASK";

export type InterventionOwner = "HUMAN" | "AGENT";

export interface AutomationInterventionsSettings {
  autoApprovePlan: boolean;
  autoAnswerClarification: boolean;
  autoAnswerClarificationMode: "TEMPLATE" | "WORKER";
  autoResumePaused: boolean;
  clarificationAnswerTemplate: string;
  clarificationCooldownSeconds: number;
}

export interface InvocationRoutingSettings {
  profile: InvocationRoutingProfile;
  strategy: ProviderStrategy;
  provider: ProviderConfigId | null;
  allowedProviders: ProviderConfigId[];
  providers: Record<ProviderConfigId, InvocationProviderOverrideSettings>;
}

export interface JiraSettings {
  host: string;               // e.g. "https://company.atlassian.net"
  email: string;              // used for Basic Auth on Jira Cloud
  apiToken: string;
  autoCloseLinkedIssues: boolean;
  defaultProject: string;     // default project key shown in import modal
  closeTransitionName: string; // transition name for closing, default "Done"
}

export interface CiIntelligenceSettings {
  enabled: boolean;
  enableLivePrMonitoring: boolean;
  resolveAllCommentsBeforeMainMerge: boolean;
  resolveMainMergeConflicts: boolean;
  resolveAllCommentsBeforeFeatureMerge: boolean;
  resolveMergeConflicts: boolean;
  waitForJulesCiAutofix: boolean;
  julesCiAutofixMaxRetries: number;
  featurePrAutoMergeMode: FeaturePrAutoMergeMode;
  mainBranchAutoMergeMode: FeaturePrAutoMergeMode;
}

export type GuardrailJobType =
  | "task_coding"
  | "ci_fix"
  | "merge_conflict"
  | "clarification_reply"
  | "planning";

export type GuardrailOnLimitAction =
  | "BLOCK_AND_ESCALATE" // block the task, hand to human, open an attention item
  | "STOP_AND_WAIT" // stop auto-handling this job type, leave the attention item open
  | "WARN_ONLY";

export interface GuardrailJobConfig {
  /** Max invocations of this job type per task. 0 = unlimited. */
  cap: number;
  onLimit: GuardrailOnLimitAction;
}

export interface GuardrailSettings {
  enabled: boolean;
  /** Optional hard cap on total agent invocations per task across all job types. 0 = unlimited. */
  perTaskTotalCeiling: number;
  jobs: Record<GuardrailJobType, GuardrailJobConfig>;
  /** Separate per-task QA-review cap. Distinct from agents.qualityAssurance.maxTaskReviewRuns. 0 = unlimited. */
  qaRunsCap: number;
  qaRunsOnLimit: GuardrailOnLimitAction;
}

export interface SprintLoopStepSettings {
  branchPreflight: boolean;
  planningPreflight: boolean;
  loadSubtasks: boolean;
  sessionSync: boolean;
  statusDerivation: boolean;
  startReadyTasks: boolean;
  mergeProtocol: boolean;
  actionRequiredProtocol: boolean;
  statusTable: boolean;
  watchLoop: boolean;
  watchLoopIntervalSeconds: number;
  watchLoopOutputIntervalSeconds: number;
}

export interface CliWorkflowSettings {
  cleanupWorktreeOnSuccess: boolean;
  cleanupWorktreeOnFailure: boolean;
  retryOnReadFileNotFound: boolean;
  retryOnQuotaReset: boolean;
  retryOnRateLimit: boolean;
  rateLimitRetryDelaySeconds: number;
  maxRateLimitRetries: number;
  maxParsingRetries: number;
  resumeFailedTaskInSameWorkspace: boolean;
  gitMode: "remote" | "local";
  executionMode: CliExecutionMode;
  containerImage: string;
  containerSetupScriptPath: string;
  containerCacheSetupScriptImage: boolean;
  containerMountGitConfig: boolean;
  containerGitUserName: string;
  containerGitUserEmail: string;
  containerMountGithubAuth: boolean;
  containerMountGeminiAuth: boolean;
  containerMountCodexAuth: boolean;
  containerMountClaudeCodeAuth: boolean;
  containerMountQwenCodeAuth: boolean;
  containerMountOpenCodeAuth: boolean;
  containerMountAntigravityAuth: boolean;
  containerGithubAuthPath: string;
  containerGeminiAuthPath: string;
  containerCodexAuthPath: string;
  containerClaudeCodeAuthPath: string;
  containerQwenCodeAuthPath: string;
  containerOpenCodeAuthPath: string;
  containerAntigravityAuthPath: string;
  maxPlanningJsonRetries: number;
  maxQuotaRetriesWithoutTimer: number;
}

export interface WorkerSettings {
  executionMode: WorkerExecutionMode;
  virtualWorkerProvider: ProviderConfigId;
  model: string;
  maxConcurrency: number;
  timeoutSeconds: number;
}

export interface QualityAssuranceTriggerSettings {
  enabled: boolean;
  agentPresetId: string | null;
}

export interface QualityAssuranceSettings {
  enabled: boolean;
  maxTaskReviewRuns: number;
  taskCompletion: QualityAssuranceTriggerSettings;
  sprintCompletion: QualityAssuranceTriggerSettings;
  completedTaskWithoutPr: QualityAssuranceTriggerSettings;
}

export interface CodingAgentRoutingSettings {
  mode: AgentRoutingMode;
  agentPresetId: string | null;
  orchestratorAgentPresetIds: string[];
}

export interface ManualAgentRoutingSettings {
  agentPresetId: string | null;
}

export interface AgentRoutingSettings {
  planning: ManualAgentRoutingSettings;
  taskCoding: CodingAgentRoutingSettings;
  ciFix: ManualAgentRoutingSettings;
  mergeConflict: ManualAgentRoutingSettings;
  dashboardReply: ManualAgentRoutingSettings;
  clarificationReply: ManualAgentRoutingSettings;
}

export interface AgentSettings {
  saveToProjectDirectory: boolean;
  routing: AgentRoutingSettings;
  instructionTemplates: Record<InstructionTemplateId, string>;
  qualityAssurance: QualityAssuranceSettings;
}

export type BackgroundPattern = "NONE" | "DIAGONAL_LINES" | "HORIZONTAL_LINES" | "VERTICAL_LINES" | "CROSSHATCH" | "DOTS" | "DIAMONDS" | "HEXAGONS" | "TRIANGLES" | "WAVES" | "NOISE";

export interface AppearanceSettings {
  navigationMode: "DOCK" | "SIDEBAR";
  theme: "LIGHT" | "DARK" | "SYSTEM";
  reducedMotion: "AUTO" | "REDUCE" | "NONE";
  backgroundMode: "ANIMATED" | "STATIC";
  animatedBackground: string;
  staticBackgroundColor: string;
  backgroundImage?: string | null;
  backgroundPattern?: BackgroundPattern | null;
  zoomLevel: number;
}

export interface SkillToggle {
  name: string;
  enabled: boolean;
  isInternal: boolean;
}

export interface McpToolToggle {
  name: string;
  enabled: boolean;
  isInternal: boolean;
}

export type CustomMcpTransport = "http" | "stdio";

export interface CustomMcpServer {
  id: string;
  name: string;
  label?: string;
  description?: string;
  enabled: boolean;
  transport: CustomMcpTransport;
  // http transport
  url?: string;
  headers?: Record<string, string>;
  // stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  providers?: ProviderId[];
}

export type RuntimeLogLevel = "off" | "debug" | "info" | "warn" | "error";

export type ConsoleLogMode = "standard" | "full";

export interface DashboardSettings {
  dashboardPort: number;
  consoleLogLevel: RuntimeLogLevel;
  debugLogFileLevel: RuntimeLogLevel;
  consoleLogMode: ConsoleLogMode;
  dbAutoVacuumOnStartup: boolean;
  dbPruningEnabled: boolean;
  dbRetentionDays: number;
  appearance: AppearanceSettings;
  automationLevel: AutomationLevel;
  automationInterventions: AutomationInterventionsSettings;
  aiProvider: AiProviderSettings;
  git: GitSettings;
  jira: JiraSettings;
  ciIntelligence: CiIntelligenceSettings;
  guardrails: GuardrailSettings;
  sprintLoopSteps: SprintLoopStepSettings;
  cliWorkflow: CliWorkflowSettings;
  sprintPreview: SprintPreviewSettings;
  workers: WorkerSettings;
  agents: AgentSettings;
  skills: SkillToggle[];
  mcpTools: McpToolToggle[];
  customMcpServers: CustomMcpServer[];
  memory: MemorySettings;
}

export interface DashboardSettingsScope {
  projectId?: string;
  sprintId?: string | null;
}

export interface ExternalSettingsHints {
  env: {
    julesApiKey: string;
    geminiApiKey: string;
    codexApiKey: string;
    claudeCodeApiKey: string;
    qwenCodeApiKey: string;
    openCodeApiKey: string;
    antigravityApiKey: string;
    githubToken: string;
    gitlabToken?: string;
    jiraToken?: string;
  };
  settingsJson: {
    julesApiKey: string;
    geminiApiKey: string;
    codexApiKey: string;
    claudeCodeApiKey: string;
    qwenCodeApiKey: string;
    openCodeApiKey: string;
    antigravityApiKey: string;
    githubToken: string;
    gitlabToken?: string;
    jiraToken?: string;
  };
  resolved: {
    julesApiKey: string;
    geminiApiKey: string;
    codexApiKey: string;
    claudeCodeApiKey: string;
    qwenCodeApiKey: string;
    openCodeApiKey: string;
    antigravityApiKey: string;
    githubToken: string;
    gitlabToken?: string;
    jiraToken?: string;
  };
  providerAvailability: {
    jules: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    gemini: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    codex: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    claudeCode: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    qwenCode: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    openCode: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
    antigravity: { hasApiKey: boolean; hasLocalAuth: boolean; hasDashboardAuth: boolean };
  };
}
