// @vitest-environment jsdom
import { expect, test, vi } from "vitest";
import { render } from "@testing-library/preact";
import { NotificationPanel } from "../NotificationPanel.js";
import * as matchers from "@testing-library/jest-dom/matchers";
import { CheckCheck } from "lucide-preact";
import type { DashboardNotification } from "../../hooks/use-notifications.js";

expect.extend(matchers);

vi.mock("gsap", () => ({
    default: {
        context: vi.fn((cb) => { cb(); return { revert: vi.fn() }; }),
        fromTo: vi.fn(),
    },
}));

vi.mock("../../hooks/use-reduced-motion.js", () => ({
    useReducedMotion: vi.fn(() => false),
}));

vi.mock("../../lib/motion/constants.js", () => ({
    useGsapDurations: vi.fn(() => ({ base: 0 })),
    GSAP_INTERACTION_TOKENS: { enterExit: { ease: "none" } },
}));

const mockNotification: DashboardNotification = {
    id: "1",
    type: "intervention",
    title: "Test Notification",
    severity: "warning",
    time: "Just now",
    unread: true,
    icon: CheckCheck,
    dismissible: true,
    actionLabel: "Fix",
    onAction: vi.fn(),
};

test("NotificationPanel accessibility properties", () => {
    const { getByRole, getByText, getByLabelText } = render(
        <NotificationPanel
            notifications={[mockNotification]}
            unreadCount={1}
            onMarkAllRead={vi.fn()}
            onMarkRead={vi.fn()}
            onDismiss={vi.fn()}
            onRefresh={vi.fn()}
        />
    );

    const dialog = getByRole("dialog");
    expect(dialog).toHaveAttribute("id", "notification-panel");

    // Check visually hidden state text
    expect(getByText("Severity: warning, Unread")).toBeInTheDocument();

    // Check action button
    const actionBtn = getByRole("button", { name: "Fix for Test Notification" });
    expect(actionBtn).toBeInTheDocument();

    // Check mark read button
    const readBtn = getByLabelText("Mark read Test Notification");
    expect(readBtn).toBeInTheDocument();
});
