/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { WaveFluid } from "../../../../../dashboard/src/v2/components/ui/WaveFluid";
import gsap from "gsap";

vi.mock("../../../../../dashboard/src/v2/hooks/use-reduced-motion.js", () => ({
  useReducedMotion: vi.fn(() => false),
}));

vi.mock("gsap", () => {
    const mockTimeline = {
        to: vi.fn().mockReturnThis(),
        fromTo: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        pause: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis(),
        reverse: vi.fn().mockReturnThis(),
    };
    return {
        default: {
            registerPlugin: vi.fn(),
            set: vi.fn(),
            fromTo: vi.fn(),
            to: vi.fn(),
            context: vi.fn((cb) => {
                if (cb) cb();
                return { revert: vi.fn() };
            }),
            timeline: vi.fn(() => mockTimeline),
            killTweensOf: vi.fn(),
        }
    };
});

describe("WaveFluid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("animates opacity when isActive is true", () => {
    render(<WaveFluid accentHex="#000000" isActive={true} />);

    expect(gsap.to).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        opacity: 0.8,
        yoyo: true,
        repeat: -1,
      })
    );
  });

  it("clears animation when isActive is false", () => {
    render(<WaveFluid accentHex="#000000" isActive={false} />);

    expect(gsap.killTweensOf).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    expect(gsap.to).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        clearProps: "opacity",
      })
    );
  });
});
