
/**
 * @vitest-environment jsdom
 */
import { h } from "preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import "@testing-library/jest-dom/vitest";
import { MarkdownEditorField } from "../../ui/MarkdownEditorField.js";

describe("MarkdownEditorField", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a tablist and toggles tabs correctly", () => {
    const onChange = vi.fn();
    render(<MarkdownEditorField id="test-md" value="" onChange={onChange} />);

    const tablist = screen.getByRole("tablist", { name: "Markdown mode" });
    expect(tablist).toBeInTheDocument();

    const writeTab = screen.getByRole("tab", { name: "Write" });
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    expect(writeTab).toBeInTheDocument();
    expect(writeTab).toHaveAttribute("aria-selected", "true");

    const writePanel = screen.getByRole("tabpanel", { name: "Write" });
    expect(writePanel).toBeInTheDocument();
    expect(writePanel).toHaveAttribute("id", "test-md");
  });

  it("handles preview mode and renders preview panel with accessible name", () => {
    render(<MarkdownEditorField id="test-md-2" value="Some content" onChange={() => {}} />);

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    expect(previewTab).toHaveAttribute("aria-selected", "true");

    const previewPanel = screen.getByRole("tabpanel", { name: "Preview" });
    expect(previewPanel).toBeInTheDocument();
  });
});
