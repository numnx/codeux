/**
 * Codex container smoketest.
 *
 * Drives the real ProviderRunner + DockerRunner code path exactly like a sprint
 * task coding invocation would: DOCKER execution mode, the cached setup image,
 * the saved codex credentials mounted in, and a trivial "report ok" prompt.
 *
 * Run:  npm run smoketest:codex
 *   or: node --import ./scripts/tsnode-register.mjs tests/smoketest/codex.smoketest.ts
 *
 * This is an opt-in, environment-dependent smoketest (needs Docker + real saved
 * codex credentials), so it lives outside the vitest suite and is never run in CI.
 *
 * Optional env:
 *   CODEX_AUTH_PATH   credential dir to mount (default ~/.code-ux/credentials/codex)
 *   CODEX_MODEL       model id (default gpt-5.3-codex; use "default" for codex's own default)
 *   CODEX_PROMPT      prompt (default "Report ok and nothing else.")
 */
import { randomUUID } from "crypto";
import { DockerRunner } from "../../src/infrastructure/providers/cli/docker-runner.js";
import { ProviderRunner } from "../../src/infrastructure/providers/cli/provider-runner.js";
import { DEFAULT_DASHBOARD_SETTINGS } from "../../src/repositories/settings-defaults.js";
import { classifyProviderError } from "../../src/shared/providers/provider-error-classifier.js";

async function main(): Promise<void> {
  const repoPath = process.cwd();
  const sessionId = `codex-smoketest-${randomUUID().slice(0, 8)}`;
  const authPath = process.env.CODEX_AUTH_PATH || "~/.code-ux/credentials/codex";
  const model = process.env.CODEX_MODEL || "gpt-5.3-codex";
  const prompt = process.env.CODEX_PROMPT || "Report ok and nothing else. Do not edit any files.";

  const workflowSettings = {
    ...DEFAULT_DASHBOARD_SETTINGS.cliWorkflow,
    executionMode: "DOCKER" as const,
  };

  console.log("=== Codex smoketest ===");
  console.log(JSON.stringify({ repoPath, sessionId, authPath, model, prompt, image: workflowSettings.containerImage, cacheSetupImage: workflowSettings.containerCacheSetupScriptImage }, null, 2));

  const dockerRunner = new DockerRunner();
  const providerRunner = new ProviderRunner(dockerRunner);

  const activity: string[] = [];
  const onActivity = (desc: string, originator?: string): void => {
    const line = `[${originator || "agent"}] ${desc}`;
    activity.push(line);
    console.log(line);
  };

  const startedMs = Date.now();
  let result;
  try {
    result = await providerRunner.runProvider({
      provider: "codex",
      prompt,
      cwd: repoPath,
      model,
      apiKey: "",
      providerMountAuth: true,
      providerAuthPath: authPath,
      sessionId,
      workspaceSessionId: sessionId,
      workflowSettings,
      repoPath,
      onActivity,
    });
  } catch (error) {
    console.error("\n!!! runProvider threw:");
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const durationMs = Date.now() - startedMs;
  console.log("\n=== RESULT ===");
  console.log(JSON.stringify({
    ok: result.ok,
    exitCode: (result as { exitCode?: number }).exitCode,
    durationMs,
    nativeSessionId: result.nativeSessionId,
    stdoutLen: result.stdout.length,
    stderrLen: result.stderr.length,
    usageSource: result.usageTelemetry.usageSource,
    totalTokens: result.usageTelemetry.totalTokens,
  }, null, 2));

  console.log("\n--- STDOUT (tail 4000) ---");
  console.log(result.stdout.slice(-4000));
  console.log("\n--- STDERR (tail 4000) ---");
  console.log(result.stderr.slice(-4000));

  if (!result.ok) {
    const classification = classifyProviderError("codex", result);
    console.log("\n--- CLASSIFICATION ---");
    console.log(JSON.stringify(classification, null, 2));
  }

  process.exitCode = result.ok ? 0 : 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
