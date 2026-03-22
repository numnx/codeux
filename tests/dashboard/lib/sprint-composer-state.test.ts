import { describe, expect, it } from "vitest";
import { getAvailableModes } from "../../../dashboard/src/v2/lib/sprint-composer-state.js";

describe("Sprint Composer State Helpers", () => {
  it("returns creation modes for new sprints", () => {
    const modes = getAvailableModes(false, false);
    expect(modes.map(m => m.id)).toEqual(["plan_and_start", "plan_only", "draft"]);
    expect(modes[0].label).toBe("Plan & Start");
    expect(modes[2].label).toBe("Save Draft");
  });

  it("returns planning actions for draft edit mode", () => {
    // Draft edit = isEditing(true), hasTasks(false)
    const modes = getAvailableModes(true, false);
    expect(modes.map(m => m.id)).toEqual(["plan_and_start", "plan_only", "draft"]);
    expect(modes[2].label).toBe("Save Changes");
    expect(modes[0].label).toBe("Plan & Start");
  });

  it("returns replan action for planned sprints", () => {
    // Planned edit = isEditing(true), hasTasks(true)
    const modes = getAvailableModes(true, true);
    expect(modes.map(m => m.id)).toEqual(["replan", "draft"]);
    expect(modes[0].id).toBe("replan");
    expect(modes[1].label).toBe("Save Changes");
  });
});
