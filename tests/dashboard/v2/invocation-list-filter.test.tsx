/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/preact";
import { h } from "preact";
import * as matchers from "@testing-library/jest-dom/matchers";
/** @jsx h */

expect.extend(matchers);

import { InvocationListCard } from "../../../dashboard/src/v2/components/chat/InvocationListCard.js";
import { resolveProviderInfo } from "../../../dashboard/src/v2/lib/settings-view-models.js";

const mockEffectiveSettings: any = {
  settings: {
    aiProvider: {
      providers: {
        "codex-primary": {
          provider: "codex",
          name: "Codex Primary",
          enabled: true,
          model: "gpt-5.3-codex",
        },
      },
    },
  },
};

const mockInvocations: any[] = [
  {
    id: "inv-1",
    type: "task_coding",
    status: "completed",
    provider: "codex-primary",
    model: "gpt-5.3-codex",
    createdAt: "2026-03-10T12:00:00.000Z",
    messageCount: 5,
  },
  {
    id: "inv-2",
    type: "planning",
    status: "running",
    provider: "gemini",
    model: "gemini-2.5-pro",
    createdAt: "2026-03-10T12:05:00.000Z",
    messageCount: 2,
  },
  {
    id: "inv-3",
    type: "ci_fix",
    status: "failed",
    provider: "qwen-code",
    model: "qwen3-coder-plus",
    createdAt: "2026-03-10T12:10:00.000Z",
    messageCount: 0,
  },
];

describe("Invocation provider resolution", () => {
  it("resolves provider information correctly from effective settings", () => {
    const info = resolveProviderInfo("codex-primary", "gpt-5.3-codex", mockEffectiveSettings);
    expect(info.providerType).toBe("codex");
    expect(info.displayName).toBe("Codex Primary");
    expect(info.model).toBe("gpt-5.3-codex");
  });

  it("falls back to raw provider and model if not found in effective settings", () => {
    const info = resolveProviderInfo("qwen-code", "qwen3-coder-plus", mockEffectiveSettings);
    expect(info.providerType).toBe("qwen-code");
    expect(info.displayName).toBe("qwen-code");
    expect(info.model).toBe("qwen3-coder-plus");
  });
});

describe("InvocationListCard filtering & identity display", () => {
  it("renders correctly with resolved provider name and logo", () => {
    const { getByText } = render(
      <InvocationListCard
        invocations={[mockInvocations[0]]}
        selectedInvocationId={null}
        onSelect={() => {}}
        effectiveSettings={mockEffectiveSettings}
      />
    );

    expect(getByText("Codex Primary")).toBeInTheDocument();
    expect(getByText("gpt-5.3-codex")).toBeInTheDocument();
    expect(getByText("Coding")).toBeInTheDocument();
  });

  it("renders correctly for a fallback raw provider string", () => {
    const { getByText } = render(
      <InvocationListCard
        invocations={[mockInvocations[2]]}
        selectedInvocationId={null}
        onSelect={() => {}}
        effectiveSettings={mockEffectiveSettings}
      />
    );

    expect(getByText("qwen-code")).toBeInTheDocument();
    expect(getByText("qwen3-coder-plus")).toBeInTheDocument();
    expect(getByText("Fix")).toBeInTheDocument();
  });
});
