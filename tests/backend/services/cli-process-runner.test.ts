import { describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { runCommandStrict } from "../../../src/services/cli-process-runner.js";

describe("runCommandStrict", () => {
  it("forwards stdin files to the shared command runner", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "code-ux-process-runner-"));
    const inputPath = path.join(tempDir, "input.txt");
    try {
      await fs.writeFile(inputPath, "forwarded-stdin", "utf8");

      const result = await runCommandStrict(
        "node",
        ["-e", "process.stdin.pipe(process.stdout)"],
        tempDir,
        process.env,
        { stdinFile: inputPath },
      );

      expect(result.stdout).toBe("forwarded-stdin");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
