/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
import { TruncatedSystemBubble } from "../../../../../dashboard/src/v2/components/chat/TruncatedSystemBubble.js";

// Mock markdown renderer since we don't need to test actual markdown parsing here
vi.mock("../../../../../dashboard/src/lib/markdown.js", () => ({
  renderMarkdown: (content: string) => `<p>${content}</p>`,
}));

describe("TruncatedSystemBubble", () => {
  const mockContent = "This is a long system prompt\\nWith multiple lines\\nTo test truncation\\nAnd expansion.";

  afterEach(() => {
    cleanup();
  });

  it("renders correctly in the default collapsed state", () => {
    const { container } = render(<TruncatedSystemBubble content={mockContent} />);

    // Check avatar
    expect(screen.getByRole("img", { name: "System" })).toBeInTheDocument();

    // Check markdown content
    const contentDiv = container.querySelector(".prose");
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv?.innerHTML).toBe("<p>This is a long system prompt\\nWith multiple lines\\nTo test truncation\\nAnd expansion.</p>");

    // Check collapsed specific classes
    expect(contentDiv?.className).toContain("max-h-[4.5rem]");
    expect(contentDiv?.className).not.toContain("max-h-[5000px]");

    // Check gradient overlay is present
    const gradient = container.querySelector(".bg-gradient-to-t");
    expect(gradient).toBeInTheDocument();

    // Check toggle button
    const button = screen.getByText("Show full message").closest("button");
    expect(button).toBeInTheDocument();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles to expanded state when button is clicked", () => {
    const { container } = render(<TruncatedSystemBubble content={mockContent} />);

    const button = screen.getByText("Show full message").closest("button");
    fireEvent.click(button!);

    // Check expanded specific classes
    const contentDiv = container.querySelector(".prose");
    expect(contentDiv?.className).toContain("max-h-[5000px]");
    expect(contentDiv?.className).not.toContain("max-h-[4.5rem]");

    // Check gradient overlay is removed
    const gradient = container.querySelector(".bg-gradient-to-t");
    expect(gradient).not.toBeInTheDocument();

    // Check toggle button updated
    const expandedButton = screen.getByText("Show less").closest("button");
    expect(expandedButton).toBeInTheDocument();
    expect(expandedButton?.getAttribute("aria-expanded")).toBe("true");
  });

  it("toggles back to collapsed state when button is clicked again", () => {
    const { container } = render(<TruncatedSystemBubble content={mockContent} />);

    const button = screen.getByText("Show full message").closest("button");

    // Expand
    fireEvent.click(button!);
    expect(screen.getByText("Show less").closest("button")).toBeInTheDocument();

    // Collapse
    const expandedButton = screen.getByText("Show less").closest("button");
    fireEvent.click(expandedButton!);
    expect(screen.getByText("Show full message").closest("button")).toBeInTheDocument();

    // Check collapsed classes restored
    const contentDiv = container.querySelector(".prose");
    expect(contentDiv?.className).toContain("max-h-[4.5rem]");
  });
});
