import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildPlatformDoctorChecks,
  createInstructionsFileCheck,
} from "../../src/platform/doctor-checks.js";
import { claudeCodePlatform } from "../../src/platform/claude-code.js";
import { codexPlatform } from "../../src/platform/codex.js";
import { opencodePlatform } from "../../src/platform/opencode.js";
import { aiderPlatform } from "../../src/platform/aider.js";

describe("doctor-checks", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `bmax-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("createInstructionsFileCheck", () => {
    it("passes when instructions file contains BMAD snippet", async () => {
      await writeFile(join(testDir, "CONVENTIONS.md"), "## bmax\n\nContent.");
      const check = createInstructionsFileCheck(aiderPlatform);
      const result = await check.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("fails when instructions file is missing the snippet", async () => {
      await writeFile(join(testDir, "CONVENTIONS.md"), "# Some other content");
      const check = createInstructionsFileCheck(aiderPlatform);
      const result = await check.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("missing");
    });

    it("fails when instructions file does not exist", async () => {
      const check = createInstructionsFileCheck(aiderPlatform);
      const result = await check.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("not found");
    });
  });

  describe("buildPlatformDoctorChecks", () => {
    it("includes slash-command and lite-workflow checks for directory delivery platforms", () => {
      const checks = buildPlatformDoctorChecks(claudeCodePlatform);
      const ids = checks.map((c) => c.id);
      expect(ids).toContain("slash-command");
      expect(ids).toContain("lite-workflow");
      expect(ids).toContain("instructions-file");
    });

    it("includes command-index and lite-workflow checks for index delivery platforms", () => {
      const checks = buildPlatformDoctorChecks(aiderPlatform);
      const ids = checks.map((c) => c.id);
      expect(ids).not.toContain("slash-command");
      expect(ids).toContain("command-index");
      expect(ids).toContain("lite-workflow");
      expect(ids).toContain("instructions-file");
    });

    it("command-index check passes when COMMANDS.md exists", async () => {
      await mkdir(join(testDir, "_bmad"), { recursive: true });
      await writeFile(join(testDir, "_bmad/COMMANDS.md"), "# BMAD Commands");
      const checks = buildPlatformDoctorChecks(aiderPlatform);
      const indexCheck = checks.find((c) => c.id === "command-index")!;
      const result = await indexCheck.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("command-index check fails when COMMANDS.md missing", async () => {
      const checks = buildPlatformDoctorChecks(aiderPlatform);
      const indexCheck = checks.find((c) => c.id === "command-index")!;
      const result = await indexCheck.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("not found");
    });

    it("lite-workflow check passes when create-prd.md exists", async () => {
      await mkdir(join(testDir, "_bmad/lite"), { recursive: true });
      await writeFile(join(testDir, "_bmad/lite/create-prd.md"), "# PRD Generator");
      const checks = buildPlatformDoctorChecks(aiderPlatform);
      const liteCheck = checks.find((c) => c.id === "lite-workflow")!;
      const result = await liteCheck.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("lite-workflow check fails when create-prd.md missing", async () => {
      const checks = buildPlatformDoctorChecks(aiderPlatform);
      const liteCheck = checks.find((c) => c.id === "lite-workflow")!;
      const result = await liteCheck.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("not found");
    });

    it("slash-command check passes when file exists", async () => {
      await mkdir(join(testDir, ".claude/commands"), { recursive: true });
      await writeFile(join(testDir, ".claude/commands/bmax.md"), "content");
      const checks = buildPlatformDoctorChecks(claudeCodePlatform);
      const slashCheck = checks.find((c) => c.id === "slash-command")!;
      const result = await slashCheck.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("slash-command check fails when file missing", async () => {
      const checks = buildPlatformDoctorChecks(claudeCodePlatform);
      const slashCheck = checks.find((c) => c.id === "slash-command")!;
      const result = await slashCheck.check(testDir);
      expect(result.passed).toBe(false);
    });

    it("includes command-index and skills checks for skills delivery platforms", () => {
      const checks = buildPlatformDoctorChecks(codexPlatform);
      const ids = checks.map((c) => c.id);
      expect(ids).toContain("command-index");
      expect(ids).toContain("skills");
      expect(ids).toContain("lite-workflow");
      expect(ids).toContain("instructions-file");
    });

    it("skills check passes when skill directory exists", async () => {
      await mkdir(join(testDir, ".agents/skills/bmad-researcher"), { recursive: true });
      await writeFile(
        join(testDir, ".agents/skills/bmad-researcher/SKILL.md"),
        "---\nname: analyst\n---\nContent"
      );
      const checks = buildPlatformDoctorChecks(codexPlatform);
      const skillsCheck = checks.find((c) => c.id === "skills")!;
      const result = await skillsCheck.check(testDir);
      expect(result.passed).toBe(true);
    });

    it("skills check fails when skill directory missing", async () => {
      const checks = buildPlatformDoctorChecks(codexPlatform);
      const skillsCheck = checks.find((c) => c.id === "skills")!;
      const result = await skillsCheck.check(testDir);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("not found");
    });

    it("skills check uses the OpenCode skills root for opencode", async () => {
      await mkdir(join(testDir, ".opencode/skills/bmad-researcher"), { recursive: true });
      await writeFile(
        join(testDir, ".opencode/skills/bmad-researcher/SKILL.md"),
        "---\nname: bmad-researcher\n---\nContent"
      );
      const checks = buildPlatformDoctorChecks(opencodePlatform);
      const skillsCheck = checks.find((c) => c.id === "skills")!;
      const result = await skillsCheck.check(testDir);
      expect(result.passed).toBe(true);
    });
  });
});
