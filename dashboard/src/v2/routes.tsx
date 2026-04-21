import { lazy } from "preact/compat";
import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { ProjectDataProvider } from "./context/project-data.js";
import { DashboardLayout } from "./layouts/DashboardLayout.js";
import { DashboardV2 } from "./DashboardV2.js";
import { LiveSessionPage } from "./LiveSessionPage.js";

// Route components — each dynamic import becomes its own chunk in the build
const SprintsPage   = lazy(() => import("./pages/sprints/SprintsPage.js").then(m => ({ default: m.SprintsPage })));
const ProjectsPage  = lazy(() => import("./ProjectsPage.js").then(m => ({ default: m.ProjectsPage })));
const ChatPage      = lazy(() => import("./ChatPage.js").then(m => ({ default: m.ChatPage })));
const TasksPage     = lazy(() => import("./TasksPage.js").then(m => ({ default: m.TasksPage })));
const AgentsPage    = lazy(() => import("./AgentsPage.js").then(m => ({ default: m.AgentsPage })));
const StatsPage     = lazy(() => import("./StatsPage.js").then(m => ({ default: m.StatsPage })));
const SettingsPage  = lazy(() => import("./SettingsPage.js").then(m => ({ default: m.SettingsPage })));
const MemoryPage    = lazy(() => import("./MemoryPage.js").then(m => ({ default: m.MemoryPage })));
const BrowserPage   = lazy(() => import("./BrowserPage.js").then(m => ({ default: m.BrowserPage })));

// 1. Root layout route
const rootRoute = createRootRoute({
  component: () => (
    <ProjectDataProvider>
      <DashboardLayout />
    </ProjectDataProvider>
  ),
});

// 2. Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardV2,
});

const sprintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sprints",
  component: SprintsPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents",
  component: AgentsPage,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: StatsPage,
});

const liveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/live",
  component: LiveSessionPage,
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/config",
  component: SettingsPage,
});

const memoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/memory",
  component: MemoryPage,
});

const browserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/browser",
  component: BrowserPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sprintsRoute,
  tasksRoute,
  projectsRoute,
  chatRoute,
  agentsRoute,
  statsRoute,
  configRoute,
  memoryRoute,
  browserRoute,
  liveRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
