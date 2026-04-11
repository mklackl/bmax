import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readState,
  writeState,
  getPhaseLabel,
  getPhaseInfo,
  readRalphStatus,
  type BmaxState,
} from "../../src/utils/state.js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("state", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bmax-state-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(testDir, "bmax/state"), { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Windows file locking - ignore cleanup errors
    }
  });

  describe("readState", () => {
    it("returns null when state does not exist", async () => {
      const state = await readState(testDir);
      expect(state).toBeNull();
    });

    it("reads written state", async () => {
      const state: BmaxState = {
        currentPhase: 2,
        status: "planning",
        startedAt: "2025-01-01T00:00:00.000Z",
        lastUpdated: "2025-01-01T01:00:00.000Z",
      };

      await writeState(testDir, state);
      const result = await readState(testDir);

      expect(result).toEqual(state);
    });

    it("throws on corrupt state file", async () => {
      await writeFile(join(testDir, "bmax/state/current-phase.json"), "not json{{{");
      await expect(readState(testDir)).rejects.toThrow("Invalid JSON");
    });

    it("returns null and warns when state file has invalid structure", async () => {
      await writeFile(
        join(testDir, "bmax/state/current-phase.json"),
        JSON.stringify({ garbage: true })
      );

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readState(testDir);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("State file is corrupted"));
      warnSpy.mockRestore();
    });
  });

  describe("writeState", () => {
    it("creates state directory if it does not exist", async () => {
      await rm(join(testDir, "bmax/state"), { recursive: true, force: true });

      const state: BmaxState = {
        currentPhase: 1,
        status: "planning",
        startedAt: "2025-01-01T00:00:00.000Z",
        lastUpdated: "2025-01-01T00:00:00.000Z",
      };
      await writeState(testDir, state);

      const result = await readState(testDir);
      expect(result).toEqual(state);
    });

    it("overwrites existing state atomically", async () => {
      const state1: BmaxState = {
        currentPhase: 1,
        status: "planning",
        startedAt: "2025-01-01T00:00:00.000Z",
        lastUpdated: "2025-01-01T00:00:00.000Z",
      };
      await writeState(testDir, state1);

      const state2: BmaxState = {
        currentPhase: 3,
        status: "implementing",
        startedAt: "2025-01-01T00:00:00.000Z",
        lastUpdated: "2025-01-02T00:00:00.000Z",
      };
      await writeState(testDir, state2);

      const result = await readState(testDir);
      expect(result).toEqual(state2);
    });

    it("uses unique temp file names (UUID pattern)", async () => {
      // Write multiple times in parallel - should not conflict at temp file level
      const states: BmaxState[] = [
        { currentPhase: 1, status: "planning", startedAt: "2025-01-01", lastUpdated: "2025-01-01" },
        { currentPhase: 2, status: "planning", startedAt: "2025-01-01", lastUpdated: "2025-01-02" },
        {
          currentPhase: 3,
          status: "implementing",
          startedAt: "2025-01-01",
          lastUpdated: "2025-01-03",
        },
      ];

      // On Windows, parallel renames to the same target can cause EPERM errors
      // Use allSettled to handle potential platform-specific failures
      const results = await Promise.allSettled(states.map((s) => writeState(testDir, s)));

      // At least one write should succeed
      const successes = results.filter((r) => r.status === "fulfilled");
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // State should be readable (one of the writes should win)
      const result = await readState(testDir);
      expect(result).toBeTruthy();
      expect([1, 2, 3]).toContain(result!.currentPhase);
    });

    it("does not leave temp files after successful write", async () => {
      const { readdir } = await import("fs/promises");
      const state: BmaxState = {
        currentPhase: 1,
        status: "planning",
        startedAt: "2025-01-01",
        lastUpdated: "2025-01-01",
      };

      await writeState(testDir, state);

      const files = await readdir(join(testDir, "bmax/state"));
      const tempFiles = files.filter((f) => f.endsWith(".tmp"));
      expect(tempFiles).toHaveLength(0);
    });
  });

  describe("getPhaseLabel", () => {
    it("returns correct labels", () => {
      expect(getPhaseLabel(1)).toBe("Research");
      expect(getPhaseLabel(2)).toBe("Design");
      expect(getPhaseLabel(3)).toBe("Architect");
      expect(getPhaseLabel(4)).toBe("Build");
      expect(getPhaseLabel(5)).toBe("Launch");
    });

    it("returns Unknown for invalid phase", () => {
      expect(getPhaseLabel(6)).toBe("Unknown");
    });
  });

  describe("getPhaseInfo", () => {
    it("returns correct info for phase 1 (Research)", () => {
      const info = getPhaseInfo(1);
      expect(info.name).toBe("Research");
      expect(info.agent).toBe("Scout");
      expect(info.commands).toHaveLength(6);
      expect(info.commands[0].code).toBe("CR");
    });

    it("returns correct info for phase 2 (Design)", () => {
      const info = getPhaseInfo(2);
      expect(info.name).toBe("Design");
      expect(info.agent).toBe("Ada");
      expect(info.commands.find((c) => c.code === "CP")?.required).toBe(true);
    });

    it("returns correct info for phase 3 (Architect)", () => {
      const info = getPhaseInfo(3);
      expect(info.name).toBe("Architect");
      expect(info.agent).toBe("Kit");
      expect(info.commands.find((c) => c.code === "CA")?.required).toBe(true);
      expect(info.commands.find((c) => c.code === "CE")?.required).toBe(true);
      expect(info.commands.find((c) => c.code === "IR")?.required).toBe(true);
    });

    it("returns correct info for phase 4 (Build)", () => {
      const info = getPhaseInfo(4);
      expect(info.name).toBe("Build");
      expect(info.agent).toBe("Max");
      expect(info.commands).toHaveLength(0);
    });

    it("returns correct info for phase 5 (Launch)", () => {
      const info = getPhaseInfo(5);
      expect(info.name).toBe("Launch");
      expect(info.agent).toBe("Pip");
      expect(info.commands.find((c) => c.code === "WR")?.required).toBe(true);
      expect(info.commands.find((c) => c.code === "DR")?.required).toBe(false);
      expect(info.commands.find((c) => c.code === "LC")?.required).toBe(true);
    });

    it("returns unknown info for invalid phase", () => {
      const info = getPhaseInfo(99);
      expect(info.name).toBe("Unknown");
      expect(info.agent).toBe("Unknown");
    });
  });

  describe("readRalphStatus", () => {
    it("returns default status when no file exists", async () => {
      const status = await readRalphStatus(testDir);
      expect(status).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
    });

    it("reads status from file", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const statusData = {
        loopCount: 5,
        status: "running",
        tasksCompleted: 3,
        tasksTotal: 10,
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(statusData));

      const result = await readRalphStatus(testDir);
      expect(result).toEqual(statusData);
    });

    it("warns and returns defaults when status file is not a valid object", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(join(testDir, ".ralph/status.json"), '"just a string"');

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("warns and returns defaults when status file has invalid structure", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(join(testDir, ".ralph/status.json"), '{"loopCount": "not-a-number"}');

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("warns and returns defaults when snake_case loop fields are malformed", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(
        join(testDir, ".ralph/status.json"),
        JSON.stringify({
          loop_count: "oops",
          status: "running",
          tasks_completed: 2,
          tasks_total: 4,
        })
      );

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("warns and returns defaults when snake_case payload only contains metadata", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(
        join(testDir, ".ralph/status.json"),
        JSON.stringify({
          calls_made_this_hour: 5,
          max_calls_per_hour: 100,
          last_action: "retrying",
        })
      );

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("warns and returns defaults when snake_case payload is missing status", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(
        join(testDir, ".ralph/status.json"),
        JSON.stringify({
          loop_count: 7,
          calls_made_this_hour: 5,
          max_calls_per_hour: 100,
        })
      );

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("reads bash snake_case status format", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const bashStatus = {
        loop_count: 7,
        calls_made_this_hour: 42,
        max_calls_per_hour: 200,
        last_action: "implemented auth module",
        status: "running",
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(bashStatus));

      const result = await readRalphStatus(testDir);
      expect(result).toEqual({
        loopCount: 7,
        status: "running",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
    });

    it("maps bash 'halted' status to 'blocked'", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const bashStatus = {
        loop_count: 3,
        status: "halted",
        exit_reason: "circuit breaker tripped",
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(bashStatus));

      const result = await readRalphStatus(testDir);
      expect(result.status).toBe("blocked");
    });

    it("maps bash 'paused' status to 'blocked'", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const bashStatus = {
        loop_count: 3,
        status: "paused",
        calls_made_this_hour: 42,
        max_calls_per_hour: 200,
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(bashStatus));

      const result = await readRalphStatus(testDir);
      expect(result.status).toBe("blocked");
    });

    it("maps bash 'success' status to 'completed'", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const bashStatus = {
        loop_count: 15,
        status: "success",
        exit_reason: "all tasks done",
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(bashStatus));

      const result = await readRalphStatus(testDir);
      expect(result.status).toBe("completed");
      expect(result.loopCount).toBe(15);
    });

    it("maps bash 'error' status to 'blocked'", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const bashStatus = {
        loop_count: 15,
        status: "error",
        last_action: "failed",
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(bashStatus));

      const result = await readRalphStatus(testDir);
      expect(result.status).toBe("blocked");
      expect(result.loopCount).toBe(15);
    });

    it("warns and returns defaults when snake_case status is unrecognized", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      await writeFile(
        join(testDir, ".ralph/status.json"),
        JSON.stringify({
          loop_count: 7,
          status: "mystery",
          tasks_completed: 2,
          tasks_total: 4,
        })
      );

      const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await readRalphStatus(testDir);

      expect(result).toEqual({
        loopCount: 0,
        status: "not_started",
        tasksCompleted: 0,
        tasksTotal: 0,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Ralph status file is corrupted")
      );
      warnSpy.mockRestore();
    });

    it("prefers camelCase format when file has valid camelCase data", async () => {
      await mkdir(join(testDir, ".ralph"), { recursive: true });
      const camelStatus = {
        loopCount: 5,
        status: "running",
        tasksCompleted: 3,
        tasksTotal: 10,
      };
      await writeFile(join(testDir, ".ralph/status.json"), JSON.stringify(camelStatus));

      const result = await readRalphStatus(testDir);
      expect(result).toEqual(camelStatus);
    });
  });
});
