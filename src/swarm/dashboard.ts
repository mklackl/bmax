import chalk from "chalk";
import {
  renderHeader,
  renderLoopPanel,
  renderCircuitBreakerPanel,
  renderStoriesPanel,
  renderSideBySide,
  renderAnalysisPanel,
  renderReviewPanel,
  renderLogsPanel,
  renderLiveLogPanel,
  renderFooterLine,
  progressBar,
  formatCBState,
} from "../watch/renderer.js";
import { readDashboardState } from "../watch/state-reader.js";
import { FileWatcher } from "../watch/file-watcher.js";
import { createTerminalFrameWriter } from "../watch/frame-writer.js";
import type { DashboardState } from "../watch/types.js";
import type { SwarmWorker, SwarmWorkerStatus } from "./types.js";

// =============================================================================
// Types
// =============================================================================

export interface SwarmWorkerSnapshot {
  id: number;
  assignedEpics: string[];
  status: SwarmWorkerStatus;
  dashboardState: DashboardState;
}

export interface SwarmDashboardOptions {
  workers: SwarmWorker[];
  interval: number;
  onQuit: (action: "stop" | "detach") => void;
}

// =============================================================================
// State reading
// =============================================================================

export async function readSwarmState(workers: SwarmWorker[]): Promise<SwarmWorkerSnapshot[]> {
  const states = await Promise.all(workers.map((w) => readDashboardState(w.worktreePath)));
  return workers.map((w, i) => ({
    id: w.id,
    assignedEpics: w.assignedEpics,
    status: w.status,
    dashboardState: states[i]!,
  }));
}

// =============================================================================
// Rendering
// =============================================================================

const STATUS_ICONS: Record<SwarmWorkerStatus, string> = {
  pending: chalk.dim("◼"),
  installing: chalk.yellow("⟳"),
  running: chalk.green("▶"),
  done: chalk.green("✓"),
  error: chalk.red("✗"),
};

const STATUS_LABELS: Record<SwarmWorkerStatus, string> = {
  pending: "WAIT",
  installing: "INST",
  running: "",
  done: "DONE",
  error: "ERR",
};

export function renderWorkerSummaryRow(
  snapshot: SwarmWorkerSnapshot,
  focused: boolean,
  cols: number
): string {
  const { id, status, assignedEpics, dashboardState } = snapshot;
  const icon = STATUS_ICONS[status];
  const label = STATUS_LABELS[status];

  const loopCount = dashboardState.loop?.loopCount ?? 0;
  const completed = dashboardState.stories?.completed ?? 0;
  const total = dashboardState.stories?.total ?? 0;
  const cbState = dashboardState.circuitBreaker?.state ?? "CLOSED";

  const prefix = focused ? chalk.cyan(`▸ #${id}`) : `  #${id}`;
  const loopStr = `Loop ${loopCount}`;
  const countStr = `${completed}/${total}`;

  // Build right side — drop components at narrow widths
  const cbStr = cols > 55 ? ` ${label || formatCBState(cbState)}` : label ? ` ${label}` : "";
  const barStr = cols > 40 ? ` ${progressBar(completed, total, 6)}` : "";
  const rightSide = ` ${loopStr} ${barStr} ${countStr}${cbStr}`;

  // Epic names fill remaining space
  const fixedWidth = 7 + rightSide.length;
  const epicSpace = Math.max(0, cols - fixedWidth);
  const epicNames = assignedEpics.join(", ");
  const epicStr =
    epicSpace > 5
      ? ` [${epicNames.length > epicSpace - 3 ? epicNames.slice(0, epicSpace - 6) + "..." : epicNames}]`
      : "";

  const epicPad = Math.max(0, epicSpace - epicStr.length);
  return `${prefix} ${icon}${epicStr}${" ".repeat(epicPad)}${rightSide}`;
}

export function renderSwarmDashboard(
  snapshots: SwarmWorkerSnapshot[],
  focusedId: number,
  cols = 80
): string {
  const totalStories = snapshots.reduce(
    (sum, s) => sum + (s.dashboardState.stories?.total ?? 0),
    0
  );

  const lines: string[] = [];

  // Header
  lines.push(
    renderHeader(cols, `RALPH SWARM — ${snapshots.length} workers, ${totalStories} stories`)
  );

  // Summary rows
  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      lines.push(renderWorkerSummaryRow(snapshot, snapshot.id === focusedId, cols));
    }
    lines.push("");
  }

  // Detail panels for focused worker
  const focused = snapshots.find((s) => s.id === focusedId);
  if (focused) {
    const state = focused.dashboardState;
    lines.push(
      renderLoopPanel(state.loop, state.execution, state.session, cols),
      renderSideBySide(
        renderCircuitBreakerPanel(state.circuitBreaker, cols),
        renderStoriesPanel(state.stories, cols),
        cols
      ),
      renderAnalysisPanel(state.analysis, cols)
    );

    const reviewPanel = renderReviewPanel(state.review, cols);
    if (reviewPanel) lines.push(reviewPanel);

    if (state.execution?.status === "executing") {
      lines.push(renderLiveLogPanel(state.liveLog, cols));
    }

    lines.push(renderLogsPanel(state.recentLogs, cols));
  }

  return lines.join("\n");
}

// =============================================================================
// Dashboard orchestration
// =============================================================================

export async function startSwarmDashboard(options: SwarmDashboardOptions): Promise<void> {
  const { workers, interval, onQuit } = options;

  const frameWriter = createTerminalFrameWriter();
  let focusedWorker = 1;
  let showingPrompt = false;
  let stopped = false;

  // Register onExit for each worker to update status immediately
  for (const worker of workers) {
    worker.ralph!.onExit((code) => {
      worker.status = code === 0 ? "done" : "error";
      worker.completedAt = new Date();
    });
  }

  const refresh = async (): Promise<void> => {
    if (stopped) return;
    const snapshots = await readSwarmState(workers);
    const footerLeft = showingPrompt
      ? "Stop all (s) | Detach all (d) | Cancel (c)"
      : `q quit | s stop | d detach | 1-${workers.length} focus`;
    const footerRight = `Updated: ${new Date().toISOString().slice(11, 19)}`;
    const cols = process.stdout.columns || 80;
    const frame =
      renderSwarmDashboard(snapshots, focusedWorker, cols) +
      "\n" +
      renderFooterLine(footerLeft, footerRight, cols);
    frameWriter.write(frame);

    // Auto-resolve when all workers are done
    if (workers.every((w) => w.status === "done" || w.status === "error")) {
      setTimeout(() => stop(), 1000);
    }
  };

  const watcher = new FileWatcher(refresh, interval);

  return new Promise<void>((resolve) => {
    const onResize = (): void => {
      void refresh();
    };
    process.stdout.on("resize", onResize);

    const handleKey = (data: string): void => {
      if (stopped) return;

      if (showingPrompt) {
        showingPrompt = false;
        if (data === "s") {
          onQuit("stop");
          stop();
        } else if (data === "d") {
          onQuit("detach");
          stop();
        } else {
          void refresh();
        }
        return;
      }

      if (data === "q" || data === "\x03") {
        showingPrompt = true;
        void refresh();
        return;
      }

      // Number keys for worker focus
      const num = Number(data);
      if (num >= 1 && num <= workers.length) {
        focusedWorker = num;
        void refresh();
      }
    };

    const stop = (): void => {
      if (stopped) return;
      stopped = true;
      watcher.stop();
      frameWriter.cleanup();
      process.stdout.removeListener("resize", onResize);
      if (process.stdin.isTTY) {
        process.stdin.removeListener("data", handleKey);
      }
      resolve();
    };

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- setRawMode absent in pseudo-TTY
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", handleKey);
    } else {
      // No TTY — resolve when all workers exit
      const checkDone = (): void => {
        if (workers.every((w) => w.status === "done" || w.status === "error")) {
          stop();
        }
      };
      for (const worker of workers) {
        worker.ralph!.onExit(() => checkDone());
      }
    }

    watcher.start();
  });
}
