// @vitest-environment jsdom
import { render } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sparkline } from "../Sparkline.js";
import { WaveFluid } from "../WaveFluid.js";
import { BorderTrace } from "../BorderTrace.js";
import { ContainerShip } from "../PlanningShip.js";
import { BackgroundManager } from "../../backgrounds/BackgroundManager.js";
import { SprintBoatRace } from "../../SprintBoatRace.js";
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

vi.mock("../../../hooks/use-reduced-motion.js", () => ({
    useReducedMotion: vi.fn().mockReturnValue(true)
}));

import { useReducedMotion } from "../../../hooks/use-reduced-motion.js";

describe("Reduced Motion Visuals", () => {
    beforeEach(() => {
        vi.mocked(useReducedMotion).mockReturnValue(true);
    });

it("BackgroundManager uses static fallback with reduced motion", () => {
        const { container } = render(<BackgroundManager mode="ANIMATED" animation="neon-dreams" staticColor="#123" isDark={false} />);
        const div = container.querySelector('div');
        expect(div).toHaveStyle({ backgroundColor: '#123' });
    });

    it("SprintBoatRace disables idle pulse animations", () => {
        const { container } = render(<SprintBoatRace tasks={[]} dispatches={[]} hasSprintContext={true} />);
        expect(container.querySelector('.animate-pulse')).toBeNull();
        expect(container.querySelector('.animate-\\[spin_30s_linear_infinite\\]')).toBeNull();
    });

    it("WaveFluid disables inline animation", () => {
        const { container } = render(<WaveFluid accentHex="#000" />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveStyle({ animation: "none" });
    });

    it("BorderTrace has motion-safe classes", () => {
        const { container } = render(<BorderTrace accentHex="#000" />);
        const trace = container.querySelector(".origin-center");
        expect(trace).toHaveClass("motion-safe:transition-transform");
    });

    it("Sparkline renders path", () => {
        const { container } = render(<Sparkline points={[1, 2, 3]} color="#000" />);
        const path = container.querySelector("path[d]");
        expect(path).toBeInTheDocument();
    });

    it("PlanningShip does not render animate when reduced motion", () => {
        const { container } = render(<ContainerShip accentColor="#000" isMoving={true} isDark={false} />);
        const animate = container.querySelector("animate");
        expect(animate).toBeNull();
    });
});
