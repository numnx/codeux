// @vitest-environment jsdom
import { render, screen } from "@testing-library/preact";
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../Table";

describe("Table component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a table with appropriate roles and structure", () => {
    render(
      <Table ariaLabel="Test Table">
        <TableHeader>
          <TableCell isHeader>Header 1</TableCell>
          <TableCell isHeader>Header 2</TableCell>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Data 1</TableCell>
            <TableCell>Data 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole("table", { name: "Test Table" });
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent("Header 1");

    const rows = screen.getAllByRole("row");
    // 2 rows: one in header, one in body
    expect(rows).toHaveLength(2);

    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveTextContent("Data 1");
  });

  it("renders table caption when provided", () => {
    render(
      <Table caption="Test Caption">
        <TableBody>
          <TableRow>
            <TableCell>Data 1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const caption = screen.getByText("Test Caption");
    expect(caption).toBeInTheDocument();
    expect(caption.tagName.toLowerCase()).toBe("caption");
    expect(caption).toHaveClass("sr-only");
  });

  it("adds mobileLabel and displays it when passed to TableCell", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell mobileLabel="Mobile Label 1">Data 1</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    // Using getAllByRole because there might be multiple elements with role cell
    const cells = screen.getAllByRole("cell");
    const mobileLabel = screen.getByText("Mobile Label 1");
    expect(mobileLabel).toBeInTheDocument();
    expect(mobileLabel).toHaveClass("lg:hidden");
    expect(mobileLabel).not.toHaveAttribute("aria-hidden");
    expect(cells[0]).toHaveTextContent("Data 1");
  });

  it("renders inline mobileLabels correctly in block layout", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell mobileLabel="Label A">Data A</TableCell>
            <TableCell mobileLabel="Label B">Data B</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const labelA = screen.getByText("Label A");
    const labelB = screen.getByText("Label B");
    expect(labelA).toBeInTheDocument();
    expect(labelB).toBeInTheDocument();
    expect(labelA).toHaveClass("inline-flex", "lg:hidden");
    expect(labelB).toHaveClass("inline-flex", "lg:hidden");
  });

  it("applies aria-selected when TableRow is selected", () => {
    const { rerender } = render(
      <Table>
        <TableBody>
          <TableRow selected={true}>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const rowTrue = screen.getAllByRole("row")[0];
    expect(rowTrue).toHaveAttribute("aria-selected", "true");

    rerender(
      <Table>
        <TableBody>
          <TableRow selected={false}>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const rowFalse = screen.getAllByRole("row")[0];
    expect(rowFalse).toHaveAttribute("aria-selected", "false");
  });

  it("renders a sort button when isHeader is true and onSort is provided", () => {
    const handleSort = vi.fn();
    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableCell isHeader onSort={handleSort} ariaSort="ascending">Sortable Header</TableCell>
        </TableHeader>
      </Table>
    );

    let header = screen.getByRole("columnheader", { name: "Sortable Header (sorted ascending)" });
    expect(header).toHaveAttribute("aria-sort", "ascending");

    let button = screen.getByRole("button", { name: "Sortable Header (sorted ascending)" });
    expect(button).toBeInTheDocument();

    // Check visually hidden announcement text
    const srText = button.querySelector('.sr-only');
    expect(srText).toHaveTextContent("(sorted ascending)");

    button.click();
    expect(handleSort).toHaveBeenCalledTimes(1);

    // Rerender with 'none'
    rerender(
      <Table>
        <TableHeader>
          <TableCell isHeader onSort={handleSort} ariaSort="none">Sortable Header</TableCell>
        </TableHeader>
      </Table>
    );
    button = screen.getByRole("button", { name: "Sortable Header (click to sort)" });
    expect(button.querySelector('.sr-only')).toHaveTextContent("(click to sort)");
  });

  it("allows keyboard interaction on TableRow when onClick is provided", () => {
    const handleClick = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={handleClick}>
            <TableCell>Interactive Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const row = screen.getAllByRole("row")[0];

    // The row itself receives the tab index
    expect(row).toHaveAttribute("tabindex", "0");

    // Trigger spacebar
    row.focus();
    const spaceEvent = new KeyboardEvent("keydown", { key: " " });
    row.dispatchEvent(spaceEvent);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Trigger enter
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
    row.dispatchEvent(enterEvent);
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it("handles long continuous strings without breaking mobile layout", () => {
    const longString = "verylongstringwithoutspacesthatmightoverflowthecontainer".repeat(5);

    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell mobileLabel="Label">{longString}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByRole("cell");
    expect(cell).toHaveClass("break-words", "min-w-0");

    const innerContainer = cell.querySelector("div");
    expect(innerContainer).toHaveClass("break-words", "min-w-0", "flex-1", "lg:contents");
  });
});
