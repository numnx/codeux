import { describe, expect, it } from "vitest";
import { buildTaskBundle, parseTaskBundle } from "../../../dashboard/src/v2/lib/markdown-transfer.js";

describe("markdown-transfer", () => {
  it("builds a deterministic task bundle with file markers", () => {
    const bundle = buildTaskBundle([
      { fileName: "T01.md", markdown: "title: One\nprompt:\nDo one" },
      { fileName: "T02.md", markdown: "title: Two\nprompt:\nDo two" },
    ]);

    expect(bundle).toContain("--- FILE: T01.md ---");
    expect(bundle).toContain("--- FILE: T02.md ---");
  });

  it("parses task bundles split by file markers", () => {
    const tasks = parseTaskBundle([
      "--- FILE: T01.md ---",
      "title: One",
      "prompt:",
      "Do one",
      "",
      "--- FILE: T02.md ---",
      "title: Two",
      "depends_on: [\"T01\"]",
      "prompt:",
      "Do two",
    ].join("\n"));

    expect(tasks).toEqual([
      { taskKey: "T01", markdown: "title: One\nprompt:\nDo one" },
      { taskKey: "T02", markdown: "title: Two\ndepends_on: [\"T01\"]\nprompt:\nDo two" },
    ]);
  });
});
