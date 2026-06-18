// @vitest-environment jsdom
import { render, screen } from "@testing-library/preact";
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../Table";

describe("Table component", () => {
  it("renders a hidden desktop header properly", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableCell isHeader>Hidden</TableCell>
        </TableHeader>
      </Table>
    );
    const thead = container.querySelector("thead");
    expect(thead).toBeInTheDocument();
    expect(thead).toHaveClass("sr-only");
    expect(thead).toHaveClass("lg:not-sr-only");
    expect(thead).toHaveClass("lg:table-header-group");
  });
  it("supports sortable headers and ids/headers attributes", () => {
    render(
      <Table>
        <TableHeader>
          <TableCell isHeader id="col1" ariaSort="ascending">Sortable</TableCell>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell headers="col1">Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    const th = screen.getByRole("columnheader");
    expect(th).toHaveAttribute("aria-sort", "ascending");
    expect(th).toHaveAttribute("id", "col1");

    const td = screen.getByRole("cell");
    expect(td).toHaveAttribute("headers", "col1");
  });

  it("makes row interactive and keyboard accessible only when onClick is provided", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Table>
        <TableBody>
          <TableRow onClick={handleClick}>Clickable</TableRow>
        </TableBody>
      </Table>
    );
    const clickableRow = screen.getByRole("row");
    expect(clickableRow).toHaveAttribute("tabindex", "0");

    clickableRow.focus();
    expect(document.activeElement).toBe(clickableRow);

    // Check click
    clickableRow.click();
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Check keydown
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
    clickableRow.dispatchEvent(enterEvent);
    expect(handleClick).toHaveBeenCalledTimes(2);

    rerender(
      <Table>
        <TableBody>
          <TableRow>Not Clickable</TableRow>
        </TableBody>
      </Table>
    );
    const unclickableRow = screen.getByRole("row");
    expect(unclickableRow).not.toHaveAttribute("tabindex");
  });
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
    expect(mobileLabel).toHaveAttribute("aria-hidden", "true");
    expect(cells[0]).toHaveTextContent("Data 1");
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
});
