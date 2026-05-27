import * as fs from "fs";
import * as path from "path";
import { app, screen, type BrowserWindow, type Rectangle } from "electron";

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

const MIN_WIDTH = 1100;
const MIN_HEIGHT = 720;
// Hard floor for first-launch sizing — even on a small display, we want
// enough room for the sidebar + main + inspector layout.
const DEFAULT_FLOOR_WIDTH = 1600;
const DEFAULT_FLOOR_HEIGHT = 1000;
// Soft ceiling so we don't open absurdly large on 4K/5K monitors.
const DEFAULT_CEILING_WIDTH = 2560;
const DEFAULT_CEILING_HEIGHT = 1600;
const DEFAULT_WORKAREA_FRACTION = 0.85;

const getDefaultState = (): WindowState => {
  try {
    const { workArea } = screen.getPrimaryDisplay();
    const targetWidth = Math.round(workArea.width * DEFAULT_WORKAREA_FRACTION);
    const targetHeight = Math.round(workArea.height * DEFAULT_WORKAREA_FRACTION);
    const width = Math.max(
      Math.min(workArea.width, MIN_WIDTH),
      Math.min(DEFAULT_CEILING_WIDTH, Math.max(DEFAULT_FLOOR_WIDTH, targetWidth)),
    );
    const height = Math.max(
      Math.min(workArea.height, MIN_HEIGHT),
      Math.min(DEFAULT_CEILING_HEIGHT, Math.max(DEFAULT_FLOOR_HEIGHT, targetHeight)),
    );
    return { width, height, isMaximized: false, isFullScreen: false };
  } catch {
    return {
      width: DEFAULT_FLOOR_WIDTH,
      height: DEFAULT_FLOOR_HEIGHT,
      isMaximized: false,
      isFullScreen: false,
    };
  }
};

const getStateFilePath = (): string => path.join(app.getPath("userData"), "window-state.json");

const isWithinAnyDisplay = (bounds: Rectangle): boolean => {
  const displays = screen.getAllDisplays();
  return displays.some((display) => {
    const work = display.workArea;
    // Require at least a 100x100 visible patch so windows can't be loaded
    // entirely off-screen if the user disconnected a monitor.
    const overlapX = Math.max(0, Math.min(bounds.x + bounds.width, work.x + work.width) - Math.max(bounds.x, work.x));
    const overlapY = Math.max(0, Math.min(bounds.y + bounds.height, work.y + work.height) - Math.max(bounds.y, work.y));
    return overlapX >= 100 && overlapY >= 100;
  });
};

export const loadWindowState = (): WindowState => {
  const fallback = getDefaultState();
  try {
    const raw = fs.readFileSync(getStateFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    const width = Math.max(MIN_WIDTH, Number(parsed.width) || fallback.width);
    const height = Math.max(MIN_HEIGHT, Number(parsed.height) || fallback.height);
    const hasPosition = Number.isFinite(parsed.x) && Number.isFinite(parsed.y);
    const positionValid = hasPosition && isWithinAnyDisplay({
      x: parsed.x as number,
      y: parsed.y as number,
      width,
      height,
    });
    return {
      width,
      height,
      x: positionValid ? (parsed.x as number) : undefined,
      y: positionValid ? (parsed.y as number) : undefined,
      isMaximized: Boolean(parsed.isMaximized),
      isFullScreen: Boolean(parsed.isFullScreen),
    };
  } catch {
    return fallback;
  }
};

export const saveWindowState = (window: BrowserWindow): void => {
  if (window.isDestroyed()) return;
  const isMaximized = window.isMaximized();
  const isFullScreen = window.isFullScreen();
  // Persist the normal bounds, not the maximized/fullscreen ones, so the
  // window has somewhere reasonable to land after the user unmaximizes.
  const bounds = isMaximized || isFullScreen ? window.getNormalBounds() : window.getBounds();
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(MIN_WIDTH, bounds.width),
    height: Math.max(MIN_HEIGHT, bounds.height),
    isMaximized,
    isFullScreen,
  };
  try {
    fs.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2));
  } catch {
    // Best-effort: a failure to persist size shouldn't block exit.
  }
};

/**
 * Debounce repeated save calls so we don't write to disk on every resize tick.
 */
export const createDebouncedSaver = (window: BrowserWindow, delayMs = 500): () => void => {
  let timer: NodeJS.Timeout | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      saveWindowState(window);
    }, delayMs);
  };
};
