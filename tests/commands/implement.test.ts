import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Platform } from "../../src/platform/types.js";
import type { TransitionResult } from "../../src/transition/types.js";

vi.mock("chalk");

vi.mock("../../src/transition/orchestration.js", () => ({
  runTransition: vi.fn(),
}));

vi.mock("../../src/platform/resolve.js", () => ({
  resolveProjectPlatform: vi.fn(),
}));

function mockPlatform(overrides?: Partial<Platform>): Platform {
  return {
    id: "claude-code",
    displayName: "Claude Code",
    tier: "full",
    instructionsFile: "CLAUDE.md",
    commandDelivery: { kind: "directory", dir: ".claude/commands" },
    instructionsSectionMarker: "## BMAD-METHOD Integration",
    generateInstructionsSnippet: () => "snippet",
    getDoctorChecks: () => [],
    ...overrides,
  };
}

function mockTransitionResult(overrides?: Partial<TransitionResult>): TransitionResult {
  return {
    storiesCount: 3,
    warnings: [],
    fixPlanPreserved: false,
    ...overrides,
  };
}

describe("implement command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  describe("happy path", () => {
    it("prints story count on successful transition", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult({ storiesCount: 5 }));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("5 stories");
    });
  });

  describe("preflight issues", () => {
    it("prints preflight error with red cross icon", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({
          preflightIssues: [{ id: "missing-prd", severity: "error", message: "No PRD found" }],
        })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("\u2717");
      expect(output).toContain("No PRD found");
    });

    it("prints preflight warning with yellow bang icon", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({
          preflightIssues: [{ id: "no-tests", severity: "warning", message: "No test strategy" }],
        })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("!");
      expect(output).toContain("No test strategy");
    });

    it("prints preflight info with dim i icon", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({
          preflightIssues: [
            { id: "optional-hint", severity: "info", message: "Consider adding UX spec" },
          ],
        })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("i");
      expect(output).toContain("Consider adding UX spec");
    });

    it("prints suggestion when issue has one", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({
          preflightIssues: [
            {
              id: "missing-prd",
              severity: "error",
              message: "No PRD found",
              suggestion: "Run /create-prd first",
            },
          ],
        })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Run /create-prd first");
    });

    it("omits suggestion line when issue has none", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({
          preflightIssues: [{ id: "missing-prd", severity: "error", message: "No PRD found" }],
        })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      // Should have the issue message line and an empty line after, but no suggestion
      const calls = consoleSpy.mock.calls.map((c) => c[0]);
      const issueLineIdx = calls.findIndex(
        (line) => typeof line === "string" && line.includes("No PRD found")
      );
      expect(issueLineIdx).toBeGreaterThanOrEqual(0);
      // Next line after the issue should not contain suggestion text
      const nextLine = calls[issueLineIdx + 1];
      expect(nextLine).not.toContain("/create-prd");
    });
  });

  describe("warnings", () => {
    it("prints warnings and warning count", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(
        mockTransitionResult({ warnings: ["Missing tests"] })
      );

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Missing tests");
      expect(output).toContain("1 warning(s)");
    });

    it("skips warning section when no warnings", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult({ warnings: [] }));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).not.toContain("warning(s)");
    });
  });

  describe("fix plan preserved", () => {
    it("shows progress preserved when fixPlanPreserved is true", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult({ fixPlanPreserved: true }));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("progress preserved");
    });

    it("omits preserved note when fixPlanPreserved is false", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult({ fixPlanPreserved: false }));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).not.toContain("preserved");
    });
  });

  describe("platform tier branching", () => {
    it("shows driver command for full-tier platform", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(
        mockPlatform({ id: "claude-code", tier: "full" })
      );
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult());

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("bash .ralph/drivers/claude-code.sh");
    });

    it("shows requires full-tier message for instructions-only platform", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(
        mockPlatform({ id: "cursor", displayName: "Cursor", tier: "instructions-only" })
      );
      vi.mocked(runTransition).mockResolvedValue(mockTransitionResult());

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("full-tier platform");
      expect(output).toContain("Cursor");
    });
  });

  describe("error handling", () => {
    it("sets exitCode 1 when runTransition throws", async () => {
      const { runTransition } = await import("../../src/transition/orchestration.js");
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockResolvedValue(mockPlatform());
      vi.mocked(runTransition).mockRejectedValue(new Error("Transition failed"));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Transition failed");
    });

    it("sets exitCode 1 when resolveProjectPlatform throws", async () => {
      const { resolveProjectPlatform } = await import("../../src/platform/resolve.js");
      vi.mocked(resolveProjectPlatform).mockRejectedValue(new Error("No config found"));

      const { implementCommand } = await import("../../src/commands/implement.js");
      await implementCommand({ projectDir: "/test/project" });

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("No config found");
    });
  });
});
