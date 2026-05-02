/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { Subtask } from "../../../src/types.js";
import { SprintDag } from "../../../src/v2/components/SprintDag.js";

expect.extend(matchers);

const baseTask = (task: Partial<Subtask> & Pick<Subtask, "id" | "title">): Subtask => ({
  prompt: `Prompt for ${task.id}`,
  depends_on: [],
  is_independent: true,
  ...task,
});

describe("SprintDag", () => {
  afterEach(() => cleanup());

  it("renders the empty DAG state while live arrays are still hydrating", () => {
    const { getByText } = render(<SprintDag hasSprintContext={true} />);

    expect(getByText("The DAG wakes up with the sprint.")).toBeInTheDocument();
  });

  it("positions nodes directly on the canvas with stable card spacing", () => {
    const tasks: Subtask[] = [
      baseTask({ id: "T1", title: "Root task one" }),
      baseTask({ id: "T2", title: "Root task two" }),
      baseTask({ id: "T3", title: "Depends on root", depends_on: ["T1"] }),
    ];

    const { container } = render(<SprintDag tasks={tasks} dispatches={[]} hasSprintContext={true} />);

    const firstRoot = container.querySelector<HTMLElement>('[aria-label="T1: Root task one"]');
    const secondRoot = container.querySelector<HTMLElement>('[aria-label="T2: Root task two"]');
    const child = container.querySelector<HTMLElement>('[aria-label="T3: Depends on root"]');

    expect(firstRoot).not.toBeNull();
    expect(secondRoot).not.toBeNull();
    expect(child).not.toBeNull();

    expect(firstRoot?.style.left).toBe("110px");
    expect(firstRoot?.style.top).toBe("110px");
    expect(secondRoot?.style.left).toBe("110px");
    expect(secondRoot?.style.top).toBe("336px");
    expect(child?.style.left).toBe("480px");
    expect(child?.style.width).toBe("280px");
    expect(child?.style.height).toBe("188px");
    expect(firstRoot?.getAttribute("title")).toBeNull();
  });
});
