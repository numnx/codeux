import { CommandResult } from "../../shared/subprocess/command-runner.js";
import { GitProvider } from "./repository-host-resolver.js";
import { CommandRunner } from "./git-status-query-client.js";

export interface GitHostCli {
  version(hostToken?: string): Promise<CommandResult>;
  authStatus(hostToken?: string): Promise<CommandResult>;
  prListOpen(hostToken?: string): Promise<CommandResult>;
  prListOpenMatching(baseBranch: string, headBranch: string, hostToken?: string): Promise<CommandResult>;
  prCreate(baseBranch: string, headBranch: string, title: string, body: string, hostToken?: string): Promise<CommandResult>;
  runList(hostToken?: string): Promise<CommandResult>;
  prListMerged(hostToken?: string): Promise<CommandResult>;
  runViewJobs(runId: number, hostToken?: string): Promise<CommandResult>;
  runViewLogFailed(runId: number, jobId: number, hostToken?: string): Promise<CommandResult>;
  prMerge(prNumber: number, hostToken?: string): Promise<CommandResult>;
}

export class GithubHostCli implements GitHostCli {
  constructor(private readonly repoPath: string, private readonly runner: CommandRunner) {}

  private async run(args: string[], hostToken?: string): Promise<CommandResult> {
    return this.runner("gh", args, { cwd: this.repoPath, hostToken });
  }

  version(hostToken?: string) { return this.run(["--version"], hostToken); }
  authStatus(hostToken?: string) { return this.run(["auth", "status"], hostToken); }

  prListOpen(hostToken?: string) {
    return this.run([
      "pr", "list", "--state", "open", "--limit", "50", "--json",
      "number,title,url,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision,updatedAt,comments,statusCheckRollup"
    ], hostToken);
  }

  prListOpenMatching(baseBranch: string, headBranch: string, hostToken?: string) {
    return this.run([
      "pr", "list", "--state", "open", "--base", baseBranch, "--head", headBranch, "--limit", "1", "--json", "number,url"
    ], hostToken);
  }

  prCreate(baseBranch: string, headBranch: string, title: string, body: string, hostToken?: string) {
    return this.run([
      "pr", "create", "--base", baseBranch, "--head", headBranch, "--title", title, "--body", body
    ], hostToken);
  }

  runList(hostToken?: string) {
    return this.run([
      "run", "list", "--limit", "50", "--json",
      "databaseId,name,workflowName,status,conclusion,event,headBranch,url,updatedAt"
    ], hostToken);
  }

  prListMerged(hostToken?: string) {
    return this.run([
      "pr", "list", "--state", "merged", "--limit", "100", "--json",
      "number,title,url,headRefName,baseRefName,mergedAt,mergedBy"
    ], hostToken);
  }

  runViewJobs(runId: number, hostToken?: string) {
    return this.run(["run", "view", String(runId), "--json", "jobs"], hostToken);
  }

  runViewLogFailed(runId: number, jobId: number, hostToken?: string) {
    return this.run(["run", "view", String(runId), "--job", String(jobId), "--log-failed"], hostToken);
  }

  prMerge(prNumber: number, hostToken?: string) {
    return this.run(["pr", "merge", String(prNumber), "--merge", "--delete-branch"], hostToken);
  }
}

export class GitlabHostCli implements GitHostCli {
  constructor(
    private readonly repoPath: string,
    private readonly runner: CommandRunner,
    private readonly hostDomain: string | null,
    private readonly repoTarget: string | null
  ) {}

  private async run(args: string[], hostToken?: string): Promise<CommandResult> {
    const extraArgs = [];
    if (this.hostDomain) extraArgs.push("--hostname", this.hostDomain);
    if (this.repoTarget) extraArgs.push("-R", this.repoTarget);
    return this.runner("glab", [...args, ...extraArgs], { cwd: this.repoPath, hostToken });
  }

  version(hostToken?: string) { return this.run(["--version"], hostToken); }
  authStatus(hostToken?: string) { return this.run(["auth", "status"], hostToken); }

  async prListOpen(hostToken?: string): Promise<CommandResult> {
    const res = await this.run(["mr", "list", "--state", "opened", "--per-page", "50", "--output", "json"], hostToken);
    if (!res.ok) return res;

    try {
      const parsed = JSON.parse(res.stdout);
      const mapped = parsed.map((item: any) => ({
        number: item.iid,
        title: item.title,
        url: item.web_url,
        state: "OPEN",
        isDraft: item.draft,
        headRefName: item.source_branch,
        baseRefName: item.target_branch,
        mergeStateStatus: item.has_conflicts ? "DIRTY" : (item.detailed_merge_status === "mergeable" ? "CLEAN" : "UNKNOWN"),
        reviewDecision: null,
        updatedAt: item.updated_at,
        comments: item.user_notes_count,
        statusCheckRollup: []
      }));
      return { ...res, stdout: JSON.stringify(mapped) };
    } catch {
      return res;
    }
  }

  async prListOpenMatching(baseBranch: string, headBranch: string, hostToken?: string): Promise<CommandResult> {
    const res = await this.run(["mr", "list", "--state", "opened", "--target-branch", baseBranch, "--source-branch", headBranch, "--per-page", "1", "--output", "json"], hostToken);
    if (!res.ok) return res;

    try {
      const parsed = JSON.parse(res.stdout);
      const mapped = parsed.map((item: any) => ({
        number: item.iid,
        url: item.web_url
      }));
      return { ...res, stdout: JSON.stringify(mapped) };
    } catch {
      return res;
    }
  }

  async prCreate(baseBranch: string, headBranch: string, title: string, body: string, hostToken?: string): Promise<CommandResult> {
    return this.run([
      "mr", "create", "--target-branch", baseBranch, "--source-branch", headBranch, "--title", title, "--description", body, "--yes"
    ], hostToken);
  }

  async runList(hostToken?: string): Promise<CommandResult> {
    const res = await this.run(["ci", "list", "--per-page", "50", "--output", "json"], hostToken);
    if (!res.ok) return res;

    try {
      const parsed = JSON.parse(res.stdout);
      const mapped = parsed.map((item: any) => ({
        databaseId: item.id,
        name: item.name || "pipeline",
        workflowName: null,
        status: ["running", "pending"].includes(item.status) ? "in_progress" : "completed",
        conclusion: item.status === "success" ? "success" : item.status === "failed" ? "failure" : "neutral",
        event: item.source,
        headBranch: item.ref,
        url: item.web_url,
        updatedAt: item.updated_at
      }));
      return { ...res, stdout: JSON.stringify(mapped) };
    } catch {
      return res;
    }
  }

  async prListMerged(hostToken?: string): Promise<CommandResult> {
    const res = await this.run(["mr", "list", "--state", "merged", "--per-page", "100", "--output", "json"], hostToken);
    if (!res.ok) return res;

    try {
      const parsed = JSON.parse(res.stdout);
      const mapped = parsed.map((item: any) => ({
        number: item.iid,
        title: item.title,
        url: item.web_url,
        headRefName: item.source_branch,
        baseRefName: item.target_branch,
        mergedAt: item.merged_at,
        mergedBy: { login: item.merged_by?.username }
      }));
      return { ...res, stdout: JSON.stringify(mapped) };
    } catch {
      return res;
    }
  }

  async runViewJobs(runId: number, hostToken?: string): Promise<CommandResult> {
    const res = await this.run(["ci", "status", "--pipeline", String(runId), "--output", "json"], hostToken);
    if (!res.ok) return res;

    try {
      const parsed = JSON.parse(res.stdout);
      const jobs = parsed.jobs || [];
      const mappedJobs = jobs.map((j: any) => ({
        id: j.id,
        name: j.name,
        status: ["running", "pending"].includes(j.status) ? "in_progress" : "completed",
        conclusion: j.status === "success" ? "success" : j.status === "failed" ? "failure" : "neutral"
      }));
      return { ...res, stdout: JSON.stringify({ jobs: mappedJobs }) };
    } catch {
      return res;
    }
  }

  runViewLogFailed(runId: number, jobId: number, hostToken?: string): Promise<CommandResult> {
    return this.run(["ci", "trace", String(jobId)], hostToken); // glab uses trace <jobId>
  }

  prMerge(prNumber: number, hostToken?: string): Promise<CommandResult> {
    return this.run(["mr", "merge", String(prNumber), "--squash", "--delete-source-branch", "--yes"], hostToken);
  }
}

export class LocalHostCli implements GitHostCli {
  private failed(): Promise<CommandResult> {
    return Promise.resolve({ stdout: "", stderr: "Host CLI unavailable for local provider", code: 1, ok: false });
  }
  version() { return this.failed(); }
  authStatus() { return this.failed(); }
  prListOpen() { return this.failed(); }
  prListOpenMatching() { return this.failed(); }
  prCreate() { return this.failed(); }
  runList() { return this.failed(); }
  prListMerged() { return this.failed(); }
  runViewJobs() { return this.failed(); }
  runViewLogFailed() { return this.failed(); }
  prMerge() { return this.failed(); }
}

export function createGitHostCli(provider: GitProvider, runner: CommandRunner, repoPath: string, hostDomain: string | null = null, repoTarget: string | null = null): GitHostCli {
  switch (provider) {
    case "github":
      return new GithubHostCli(repoPath, runner);
    case "gitlab":
      return new GitlabHostCli(repoPath, runner, hostDomain, repoTarget);
    default:
      return new LocalHostCli();
  }
}
