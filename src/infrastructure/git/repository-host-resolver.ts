export type GitProvider = "github" | "gitlab" | "local";

export interface RepositoryHostMetadata {
  provider: GitProvider;
  hostDomain: string | null;
  repoTarget: string | null;
}

/** Tokens for the supported git hosts. */
export interface GitHostTokens {
  githubToken?: string | null;
  gitlabToken?: string | null;
}

/**
 * GitHub is github.com, any github.com subdomain, and GitHub Enterprise Cloud
 * (*.ghe.com). Every other remote host is treated as GitLab so a single GitLab
 * token covers gitlab.com and all self-hosted / third-party origins.
 */
export function isGithubHost(hostDomain: string | null | undefined): boolean {
  if (!hostDomain) {
    return false;
  }
  const domain = hostDomain.toLowerCase();
  return domain === "github.com" || domain.endsWith(".github.com") || domain.endsWith(".ghe.com");
}

/** Pick the token that matches the resolved provider; trims and drops empties. */
export function selectHostToken(provider: GitProvider, tokens: GitHostTokens): string | undefined {
  const candidate = provider === "github"
    ? tokens.githubToken
    : provider === "gitlab"
      ? tokens.gitlabToken
      : null;
  if (typeof candidate !== "string") {
    return undefined;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveRepositoryHost(remoteUrl: string | null): RepositoryHostMetadata {
  if (!remoteUrl) {
    return { provider: "local", hostDomain: null, repoTarget: null };
  }

  let hostDomain: string | null = null;
  let path: string | null = null;

  // Reject local file paths and Windows drive letters masquerading as remotes
  if (remoteUrl.startsWith("file://") || /^[a-zA-Z]:[/\\]/.test(remoteUrl) || remoteUrl.startsWith("/")) {
    return { provider: "local", hostDomain: null, repoTarget: null };
  }

  // Match SSH and HTTPS URLs
  const sshMatch = remoteUrl.match(/^(?:ssh:\/\/)?(?:[^@]+@)([^:/]+)(?::\d+)?[:/](.+)$/) || remoteUrl.match(/^(?:ssh:\/\/)([^:/]+)(?::\d+)?[:/](.+)$/);
  const httpMatch = remoteUrl.match(/^(?:https?:\/\/)([^/]+)\/(.+)$/);

  if (httpMatch && remoteUrl.startsWith("http")) {
    hostDomain = httpMatch[1];
    path = httpMatch[2];
  } else if (sshMatch && !remoteUrl.startsWith("http") && !remoteUrl.startsWith("file://")) {
    hostDomain = sshMatch[1];
    path = sshMatch[2];
  } else {
    return { provider: "local", hostDomain: null, repoTarget: null };
  }

  // Remove .git extension from the repo target
  path = path.replace(/\.git$/i, "");

  // github.com (and its subdomains / GHE Cloud) use the GitHub token; every other
  // remote host uses the GitLab token.
  const provider: GitProvider = isGithubHost(hostDomain) ? "github" : "gitlab";

  return { provider, hostDomain, repoTarget: path };
}
