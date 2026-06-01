import { describe, expect, it } from "vitest";
import { resolveRepositoryHost, selectHostToken, isGithubHost } from "../../../../src/infrastructure/git/repository-host-resolver.js";

describe("RepositoryHostResolver", () => {
  it("resolves null to local", () => {
    expect(resolveRepositoryHost(null)).toEqual({ provider: "local", hostDomain: null, repoTarget: null });
  });

  it("resolves empty string to local", () => {
    expect(resolveRepositoryHost("")).toEqual({ provider: "local", hostDomain: null, repoTarget: null });
  });

  it("resolves standard github.com SSH URL", () => {
    expect(resolveRepositoryHost("git@github.com:owner/repo.git")).toEqual({
      provider: "github",
      hostDomain: "github.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves standard github.com HTTPS URL", () => {
    expect(resolveRepositoryHost("https://github.com/owner/repo.git")).toEqual({
      provider: "github",
      hostDomain: "github.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves standard gitlab.com SSH URL", () => {
    expect(resolveRepositoryHost("git@gitlab.com:group/subgroup/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "gitlab.com",
      repoTarget: "group/subgroup/repo",
    });
  });

  it("resolves self-hosted gitlab HTTPS URL by domain name", () => {
    expect(resolveRepositoryHost("https://gitlab.example.com/group/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "gitlab.example.com",
      repoTarget: "group/repo",
    });
  });

  it("resolves self-hosted gitlab SSH URL by subgroup path depth", () => {
    expect(resolveRepositoryHost("git@git.mycompany.com:group/subgroup/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "git.mycompany.com",
      repoTarget: "group/subgroup/repo",
    });
  });

  it("resolves any non-github SSH domain with a standard path to gitlab", () => {
    expect(resolveRepositoryHost("git@git.mycompany.com:owner/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "git.mycompany.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves any non-github HTTPS domain with a standard path to gitlab", () => {
    expect(resolveRepositoryHost("https://git.mycompany.com/owner/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "git.mycompany.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves third-party hosts (e.g. bitbucket) to gitlab so the gitlab token is used", () => {
    expect(resolveRepositoryHost("git@bitbucket.org:owner/repo.git")).toEqual({
      provider: "gitlab",
      hostDomain: "bitbucket.org",
      repoTarget: "owner/repo",
    });
  });

  it("resolves github.com subdomains to github", () => {
    expect(resolveRepositoryHost("https://api.github.com/owner/repo.git")).toEqual({
      provider: "github",
      hostDomain: "api.github.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves GitHub Enterprise Cloud (*.ghe.com) to github", () => {
    expect(resolveRepositoryHost("git@acme.ghe.com:owner/repo.git")).toEqual({
      provider: "github",
      hostDomain: "acme.ghe.com",
      repoTarget: "owner/repo",
    });
  });

  it("resolves local file path to local", () => {
    expect(resolveRepositoryHost("/Users/jules/code/my-repo")).toEqual({
      provider: "local",
      hostDomain: null,
      repoTarget: null,
    });
  });

  it("resolves Windows local file path to local", () => {
    expect(resolveRepositoryHost("C:\\Users\\jules\\code\\my-repo")).toEqual({
      provider: "local",
      hostDomain: null,
      repoTarget: null,
    });
  });

  it("resolves file:// protocol to local", () => {
    expect(resolveRepositoryHost("file:///path/to/repo")).toEqual({
      provider: "local",
      hostDomain: null,
      repoTarget: null,
    });
  });
});

describe("isGithubHost", () => {
  it("matches github.com and its subdomains and GHE Cloud", () => {
    expect(isGithubHost("github.com")).toBe(true);
    expect(isGithubHost("api.github.com")).toBe(true);
    expect(isGithubHost("acme.ghe.com")).toBe(true);
  });

  it("does not match non-github hosts", () => {
    expect(isGithubHost("gitlab.com")).toBe(false);
    expect(isGithubHost("github.mycorp.com")).toBe(false);
    expect(isGithubHost("notgithub.com")).toBe(false);
    expect(isGithubHost(null)).toBe(false);
  });
});

describe("selectHostToken", () => {
  const tokens = { githubToken: "gh-secret", gitlabToken: "gl-secret" };

  it("returns the github token for github repos and never the gitlab token", () => {
    expect(selectHostToken("github", tokens)).toBe("gh-secret");
  });

  it("returns the gitlab token for gitlab repos and never the github token", () => {
    expect(selectHostToken("gitlab", tokens)).toBe("gl-secret");
  });

  it("returns undefined for local repos", () => {
    expect(selectHostToken("local", tokens)).toBeUndefined();
  });

  it("treats blank/whitespace tokens as absent", () => {
    expect(selectHostToken("github", { githubToken: "   ", gitlabToken: "gl" })).toBeUndefined();
    expect(selectHostToken("gitlab", { githubToken: "gh" })).toBeUndefined();
  });

  it("does not leak the gitlab token to a github repo when github token is missing", () => {
    expect(selectHostToken("github", { gitlabToken: "gl-secret" })).toBeUndefined();
  });
});
