import express from "express";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { registerLocalDirectoryRoutes } from "../../../src/server/local-directory-routes.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const createApp = () => {
  const app = express();
  registerLocalDirectoryRoutes(app);
  return app;
};

describe("local directory routes", () => {
  it("lists child directories and parent navigation metadata", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "code-ux-local-directories-"));
    tempDirs.push(dir);
    await fs.mkdir(path.join(dir, "src"));
    await fs.mkdir(path.join(dir, "docs"));
    await fs.writeFile(path.join(dir, "README.md"), "# test");

    const response = await request(createApp()).get("/api/local-directories").query({ path: dir });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      currentPath: dir,
      parentPath: path.dirname(dir),
      rootPath: path.parse(dir).root,
      homePath: os.homedir(),
    });
    expect(response.body.directories).toEqual([
      { name: "docs", path: path.join(dir, "docs") },
      { name: "src", path: path.join(dir, "src") },
    ]);
  });

  it("rejects file paths", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "code-ux-local-directories-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "file.txt");
    await fs.writeFile(filePath, "not a directory");

    const response = await request(createApp()).get("/api/local-directories").query({ path: filePath });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Path is not a directory");
  });
});
