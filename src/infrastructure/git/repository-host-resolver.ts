export type GitProvider = "github" | "gitlab" | "local";

export interface RepositoryHostMetadata {
  provider: GitProvider;
  hostDomain: string | null;
}

export function resolveRepositoryHost(remoteUrl: string | null): RepositoryHostMetadata {
  if (!remoteUrl) {
    return { provider: "local", hostDomain: null };
  }

  let hostDomain: string | null = null;
  let path: string | null = null;

  // Reject local file paths and Windows drive letters masquerading as remotes
  if (remoteUrl.startsWith("file://") || /^[a-zA-Z]:[/\\]/.test(remoteUrl) || remoteUrl.startsWith("/")) {
    return { provider: "local", hostDomain: null };
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
    return { provider: "local", hostDomain: null };
  }

  // Remove .git extension for segment counting
  path = path.replace(/\.git$/i, "");
  const segments = path.split("/").filter(Boolean);

  let provider: GitProvider = "local";

  if (hostDomain === "github.com") {
    provider = "github";
  } else if (hostDomain.includes("gitlab") || segments.length > 2) {
    // Treat as GitLab if domain contains gitlab or if it's a deep path (subgroups are standard in GitLab)
    // The prompt says: "detect domains with gitlab in them, or domains with a path having 3 or more segments (indicating subgroup paths), as "gitlab""
    provider = "gitlab";
  } else {
    provider = "local";
  }

  return { provider, hostDomain };
}
