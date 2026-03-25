import { describe, expect, it } from "vitest";
import { extractJsonLikeBlock } from "../../../src/services/planning-agent-service.js";

describe("extractJsonLikeBlock", () => {
  it("extracts plain JSON object", () => {
    const result = extractJsonLikeBlock('{"goal":"test","tasks":[]}');
    expect(JSON.parse(result)).toEqual({ goal: "test", tasks: [] });
  });

  it("extracts JSON from a fenced code block", () => {
    const input = "Here is the plan:\n```json\n{\"goal\":\"test\",\"tasks\":[]}\n```\nDone.";
    expect(JSON.parse(extractJsonLikeBlock(input))).toEqual({ goal: "test", tasks: [] });
  });

  it("extracts JSON buried after installation logs", () => {
    const input = [
      "Setting up Claude Code... ✔ Successfully installed!",
      "Version: 2.1.81",
      "Now I have a thorough understanding of the codebase.",
      "",
      '{"goal":"Add feature","tasks":[{"key":"T01","title":"First task","description":"desc","promptMarkdown":"## Objective\\nDo stuff","priority":"high","executorType":"auto","dependsOn":[]}]}',
    ].join("\n");
    const parsed = JSON.parse(extractJsonLikeBlock(input));
    expect(parsed.goal).toBe("Add feature");
    expect(parsed.tasks).toHaveLength(1);
  });

  it("skips fenced code blocks containing non-JSON (e.g. TypeScript with backticks in promptMarkdown)", () => {
    // Simulates the real bug: promptMarkdown contains ```ts ... ``` which
    // tricks the fenced-block regex into extracting TypeScript code instead of JSON.
    const input = [
      "Let me produce the plan.",
      "",
      '{',
      '  "goal": "Add types",',
      '  "tasks": [',
      '    {',
      '      "key": "T01",',
      '      "title": "Define types",',
      '      "description": "Create type definitions.",',
      '      "promptMarkdown": "## Objective\\nCreate types.\\n\\n## Implementation\\n\\n```ts\\nexport interface Foo {\\n  id: string;\\n}\\n```\\n\\n## Verification\\n- typecheck passes",',
      '      "priority": "high",',
      '      "executorType": "auto",',
      '      "dependsOn": []',
      '    }',
      '  ]',
      '}',
    ].join("\n");
    const parsed = JSON.parse(extractJsonLikeBlock(input));
    expect(parsed.goal).toBe("Add types");
    expect(parsed.tasks[0].key).toBe("T01");
  });

  it("skips stray brace objects in preamble and finds the valid planning JSON", () => {
    const input = [
      'Error: { errno: -2, code: "ENOENT" }',
      "Some other log output",
      '{"goal":"Real plan","tasks":[{"key":"T01","title":"Task","description":"d","promptMarkdown":"p","priority":"medium","executorType":"auto","dependsOn":[]}]}',
    ].join("\n");
    const parsed = JSON.parse(extractJsonLikeBlock(input));
    expect(parsed.goal).toBe("Real plan");
  });

  it("handles JSON array at top level", () => {
    const input = 'Some preamble\n["item1","item2"]';
    expect(JSON.parse(extractJsonLikeBlock(input))).toEqual(["item1", "item2"]);
  });

  it("returns the full input when no JSON is found", () => {
    const input = "No JSON here at all.";
    expect(extractJsonLikeBlock(input)).toBe(input);
  });
});
