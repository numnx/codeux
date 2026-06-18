/** @vitest-environment happy-dom */
import { render, screen, act } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { expect, test, vi, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);
import { cleanup } from "@testing-library/preact";

afterEach(() => {
  cleanup();
});
import { NotificationPanel } from "../NotificationPanel.jsx";
import { Bell } from "lucide-preact";
import type { DashboardNotification } from "../../hooks/use-notifications.js";

// Mock gsap
vi.mock("gsap", () => ({
  default: {
    context: (cb: any) => {
      cb();
      return { revert: () => {} };
    },
    fromTo: () => {},
  },
}));

// Mock ResizeObserver for happy-dom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockNotifications: DashboardNotification[] = [
  {
    id: "notif-1",
    title: "Critical error",
    subtitle: "System is down",
    severity: "critical",
    type: "intervention",
    unread: true,
    time: "2m ago",
    icon: Bell as any,
    dismissible: true,
  },
  {
    id: "notif-2",
    title: "Info message",
    subtitle: "Update available",
    severity: "info",
    type: "intervention",
    unread: false,
    time: "5m ago",
    icon: Bell as any,
    dismissible: false,
    actionLabel: "View update",
    onAction: vi.fn(),
  },
];

test("announces notification region, unread count, and empty state", () => {
  const { rerender } = render(
    <NotificationPanel
      notifications={[]}
      unreadCount={0}
      onMarkAllRead={() => {}}
      onMarkRead={() => {}}
      onDismiss={() => {}}
      onRefresh={() => {}}
    />
  );

  const region = screen.getByRole("region", { name: "Notifications Panel" });
  expect(region).toBeInTheDocument();

  // Test empty state
  expect(screen.getByText("No notifications")).toBeInTheDocument();

  // Re-render with notifications and unread count
  rerender(
    <NotificationPanel
      notifications={mockNotifications}
      unreadCount={1}
      onMarkAllRead={() => {}}
      onMarkRead={() => {}}
      onDismiss={() => {}}
      onRefresh={() => {}}
    />
  );

  // Check live region for unread count
  const liveRegion = document.querySelector('[aria-live="polite"]');
  expect(liveRegion).toHaveTextContent("1 unread notification");
});

test("notification actions have semantic labels including titles and severities", async () => {
  const { unmount } = render(
    <NotificationPanel
      notifications={mockNotifications}
      unreadCount={1}
      onMarkAllRead={() => {}}
      onMarkRead={() => {}}
      onDismiss={() => {}}
      onRefresh={() => {}}
    />
  );

  // Severity labels
  expect(screen.getByText("critical notification")).toBeInTheDocument();
  expect(screen.getByText("info notification")).toBeInTheDocument();

  unmount();

  const onMarkRead = vi.fn();
  const onDismiss = vi.fn();
  const onAction = mockNotifications[1].onAction;

  render(
    <NotificationPanel
      notifications={mockNotifications}
      unreadCount={1}
      onMarkAllRead={() => {}}
      onMarkRead={onMarkRead}
      onDismiss={onDismiss}
      onRefresh={() => {}}
    />
  );

  // Mark all read label
  const markAllReadBtn = screen.getByRole("button", { name: "Mark all 1 notifications read" });
  expect(markAllReadBtn).toBeInTheDocument();

  // Mark read label with title
  const markReadBtn1 = screen.getByRole("button", { name: 'Mark "Critical error" as read' });
  expect(markReadBtn1).toBeInTheDocument();

  // Read label with title
  const readBtn2 = screen.getByRole("button", { name: '"Info message" is read' });
  expect(readBtn2).toBeInTheDocument();

  // Action label with title
  const actionBtn = screen.getByRole("button", { name: 'View update for "Info message"' });
  expect(actionBtn).toBeInTheDocument();

  // Dismiss label with title
  const dismissBtn = screen.getByRole("button", { name: 'Dismiss "Critical error"' });
  expect(dismissBtn).toBeInTheDocument();
});

test("keyboard navigation focuses actionable controls inside the region", async () => {
  const user = userEvent.setup();

  render(
    <NotificationPanel
      notifications={mockNotifications}
      unreadCount={1}
      onMarkAllRead={() => {}}
      onMarkRead={() => {}}
      onDismiss={() => {}}
      onRefresh={() => {}}
    />
  );

  // Focus traversal should be inside actionable buttons.
  // We remove tabIndex from the list item so it shouldn't be focused unless it has focusable elements.
  // By default focus is on document.body. We just press tab and it should go to the first focusable element.

  const refreshBtn = screen.getByRole("button", { name: "Refresh notifications" });
  const markAllBtn = screen.getByRole("button", { name: "Mark all 1 notifications read" });

  await user.tab();
  expect(refreshBtn).toHaveFocus();

  await user.tab();
  expect(markAllBtn).toHaveFocus();

  await user.tab();
  const markReadBtn1 = screen.getByRole("button", { name: 'Mark "Critical error" as read' });
  expect(markReadBtn1).toHaveFocus();

  await user.tab();
  const dismissBtn = screen.getByRole("button", { name: 'Dismiss "Critical error"' });
  expect(dismissBtn).toHaveFocus();

  await user.tab();
  const readBtn2 = screen.getByRole("button", { name: '"Info message" is read' });
  expect(readBtn2).toHaveFocus();

  await user.tab();
  const actionBtn = screen.getByRole("button", { name: 'View update for "Info message"' });
  expect(actionBtn).toHaveFocus();
});
