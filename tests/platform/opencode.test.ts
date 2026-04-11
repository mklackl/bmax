import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { opencodePlatform } from "../../src/platform/opencode.js";

describe("opencodePlatform", () => {
  it("has correct id, displayName, and tier", () => {
    expect(opencodePlatform.id).toBe("opencode");
    expect(opencodePlatform.displayName).toBe("OpenCode");
    expect(opencodePlatform.tier).toBe("full");
  });

  it("instructionsFile is AGENTS.md", () => {
    expect(opencodePlatform.instructionsFile).toBe("AGENTS.md");
  });

  it("commandDelivery is skills kind with native OpenCode skills root", () => {
    expect(opencodePlatform.commandDelivery).toEqual({
      kind: "skills",
      dir: ".opencode/skills",
      frontmatterName: "directory",
    });
  });

  it("generateInstructionsSnippet contains OpenCode-native skill guidance", () => {
    const snippet = opencodePlatform.generateInstructionsSnippet();
    expect(snippet).toContain(".opencode/skills");
    expect(snippet).toContain("bmad-researcher");
    expect(snippet).toContain("question tool");
    expect(snippet).not.toContain("$command-name");
  });

  it("getDoctorChecks returns 4 checks", () => {
    const checks = opencodePlatform.getDoctorChecks();
    expect(checks).toHaveLength(4);
    expect(checks.map((c) => c.id)).toEqual([
      "command-index",
      "skills",
      "lite-workflow",
      "instructions-file",
    ]);
  });

  describe("doctor checks", () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = join(
        tmpdir(),
        `bmax-opencode-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch {
        // Windows file locking
      }
    });

    it("instructions-file check passes when AGENTS.md has marker", async () => {
      await writeFile(join(testDir, "AGENTS.md"), "## bmax\nContent here");
      const checks = opencodePlatform.getDoctorChecks();
      const instrCheck = checks.find((c) => c.id === "instructions-file")!;
      const result = await instrCheck.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("instructions-file check fails when AGENTS.md missing", async () => {
      const checks = opencodePlatform.getDoctorChecks();
      const instrCheck = checks.find((c) => c.id === "instructions-file")!;
      const result = await instrCheck.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("not found");
    });
  });
});
