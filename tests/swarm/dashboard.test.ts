import { describe, it, expect } from "vitest";
import {
  renderWorkerSummaryRow,
  renderSwarmDashboard,
  type SwarmWorkerSnapshot,
} from "../../src/swarm/dashboard.js";
import type { DashboardState } from "../../src/watch/types.js";

function makeDashboardState(overrides: Partial<DashboardState> = {}): DashboardState {
  return {
    loop: {
      loopCount: 5,
      status: "running",
      lastAction: "executing",
      callsMadeThisHour: 10,
      maxCallsPerHour: 50,
    },
    circuitBreaker: { state: "CLOSED", consecutiveNoProgress: 0, totalOpens: 0 },
    stories: { completed: 3, total: 6, nextStory: "Story 1.4: Payment flow" },
    analysis: null,
    execution: null,
    session: null,
    review: null,
    recentLogs: [],
    liveLog: [],
    ralphCompleted: false,
    lastUpdated: new Date(),
    ...overrides,
  };
}

function makeSnapshot(
  id: number,
  status: SwarmWorkerSnapshot["status"] = "running",
  overrides: Partial<DashboardState> = {}
): SwarmWorkerSnapshot {
  return {
    id,
    assignedEpics: [`Epic ${id}`],
    status,
    dashboardState: makeDashboardState(overrides),
  };
}

describe("swarm dashboard", () => {
  describe("renderWorkerSummaryRow", () => {
    it("renders a running worker with status icon, loop count, and progress", () => {
      const snapshot = makeSnapshot(1);
      const row = renderWorkerSummaryRow(snapshot, false, 80);

      expect(row).toContain("#1");
      expect(row).toContain("Loop 5");
      expect(row).toContain("3/6");
    });

    it("shows check mark for done workers", () => {
      const snapshot = makeSnapshot(1, "done", {
        stories: { completed: 6, total: 6, nextStory: null },
      });
      const row = renderWorkerSummaryRow(snapshot, false, 80);

      expect(row).toContain("DONE");
    });

    it("shows error indicator for failed workers", () => {
      const snapshot = makeSnapshot(1, "error");
      const row = renderWorkerSummaryRow(snapshot, false, 80);

      expect(row).toContain("ERR");
    });

    it("includes epic names", () => {
      const snapshot = makeSnapshot(1);
      snapshot.assignedEpics = ["Auth", "Payments"];
      const row = renderWorkerSummaryRow(snapshot, false, 80);

      expect(row).toContain("Auth");
      expect(row).toContain("Payments");
    });

    it("includes circuit breaker state", () => {
      const snapshot = makeSnapshot(1, "running", {
        circuitBreaker: { state: "OPEN", consecutiveNoProgress: 3, totalOpens: 1, reason: "stuck" },
      });
      const row = renderWorkerSummaryRow(snapshot, false, 80);

      expect(row).toContain("OPEN");
    });

    it("degrades gracefully at narrow widths", () => {
      const snapshot = makeSnapshot(1);
      const row = renderWorkerSummaryRow(snapshot, false, 35);

      // Should still contain essential info
      expect(row).toContain("#1");
      expect(row).toContain("3/6");
      // Should not overflow
      expect(row.length).toBeLessThanOrEqual(40);
    });

    it("marks focused worker", () => {
      const snapshot = makeSnapshot(1);
      const focused = renderWorkerSummaryRow(snapshot, true, 80);
      const unfocused = renderWorkerSummaryRow(snapshot, false, 80);

      expect(focused).not.toBe(unfocused);
    });
  });

  describe("renderSwarmDashboard", () => {
    it("includes header with worker count and total stories", () => {
      const snapshots = [makeSnapshot(1), makeSnapshot(2)];
      const frame = renderSwarmDashboard(snapshots, 1, 80);

      expect(frame).toContain("RALPH SWARM");
      expect(frame).toContain("2 workers");
    });

    it("includes a summary row for each worker", () => {
      const snapshots = [makeSnapshot(1), makeSnapshot(2), makeSnapshot(3)];
      const frame = renderSwarmDashboard(snapshots, 1, 80);

      expect(frame).toContain("#1");
      expect(frame).toContain("#2");
      expect(frame).toContain("#3");
    });

    it("includes detail panels for the focused worker only", () => {
      const snapshots = [
        makeSnapshot(1, "running", {
          loop: {
            loopCount: 7,
            status: "running",
            lastAction: "executing",
            callsMadeThisHour: 10,
            maxCallsPerHour: 50,
          },
        }),
        makeSnapshot(2, "running", {
          loop: {
            loopCount: 3,
            status: "running",
            lastAction: "executing",
            callsMadeThisHour: 5,
            maxCallsPerHour: 50,
          },
        }),
      ];
      const frame = renderSwarmDashboard(snapshots, 1, 80);

      // Detail section should show focused worker's loop count
      expect(frame).toContain("Loop: #7");
    });

    it("renders empty state when no snapshots", () => {
      const frame = renderSwarmDashboard([], 1, 80);

      expect(frame).toContain("RALPH SWARM");
      expect(frame).toContain("0 workers");
    });
  });
});
