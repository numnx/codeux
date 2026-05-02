/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { Tooltip } from "../../../src/v2/components/ui/Tooltip.js";

expect.extend(matchers);

describe("Tooltip", () => {
  afterEach(() => cleanup());

  it("applies triggerClassName to the trigger wrapper", () => {
    const { container } = render(
      <Tooltip content="More context" triggerClassName="h-full w-full">
        <button type="button">Hover me</button>
      </Tooltip>,
    );

    expect(container.firstElementChild).toHaveClass("h-full");
    expect(container.firstElementChild).toHaveClass("w-full");
  });
});
