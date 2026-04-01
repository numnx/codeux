import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ProjectAttentionRepository } from "../../../src/repositories/project-attention-repository.js";

const tempDirs: string[] = [];

async function createRepository() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-attention-extra-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  return new ProjectAttentionRepository(storage);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ProjectAttentionRepository Extra Coverage", () => {
  it("getAttentionItem returns null for non-existent", async () => {
    const repo = await createRepository();
    expect(repo.getAttentionItem("non-existent")).toBeNull();
  });

  it("claimAttentionItem throws if item not found", async () => {
    const repo = await createRepository();
    expect(() => repo.claimAttentionItem("non-existent", { claimedBy: "agent" })).toThrow();
  });

  it("resolveAttentionItem throws if item not found", async () => {
    const repo = await createRepository();
    expect(() => repo.resolveAttentionItem("non-existent", { status: "resolved" })).toThrow();
  });

  it("resolveAttentionItemsForDispatch handles non-existent dispatch (returns 0)", async () => {
    const repo = await createRepository();
    const count = repo.resolveAttentionItemsForDispatch("non-existent", { status: "resolved" });
    expect(count).toBe(0);
  });
});
