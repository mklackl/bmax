import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installProject, mergeInstructionsFile } from "../../src/installer.js";
import { writeConfig, readConfig, type BmaxConfig } from "../../src/utils/config.js";

describe("init flow integration", { timeout: 30000 }, () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `bmax-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  it("full init creates a working project structure", async () => {
    await installProject(testDir);

    const config: BmaxConfig = {
      name: "test-project",
      description: "Integration test project",
      createdAt: new Date().toISOString(),
    };
    await writeConfig(testDir, config);
    await mergeInstructionsFile(testDir);

    // Verify config is readable
    const readBack = await readConfig(testDir);
    expect(readBack).toEqual(config);

    // Verify CLAUDE.md was created
    const claudeMd = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("bmax");

    // Verify _bmad directory with actual BMAD agents
    await expect(access(join(testDir, "_bmad/config.yaml"))).resolves.toBeUndefined();
    await expect(access(join(testDir, "_bmad/core"))).resolves.toBeUndefined();
    await expect(access(join(testDir, "_bmad/bmm"))).resolves.toBeUndefined();

    // Verify BMAD agent files exist
    await expect(
      access(join(testDir, "_bmad/bmm/agents/researcher.agent.yaml"))
    ).resolves.toBeUndefined();
    await expect(
      access(join(testDir, "_bmad/bmm/agents/product-designer.agent.yaml"))
    ).resolves.toBeUndefined();
    await expect(
      access(join(testDir, "_bmad/bmm/agents/architect.agent.yaml"))
    ).resolves.toBeUndefined();

    // Verify .ralph directory with ralph loop
    await expect(access(join(testDir, ".ralph/ralph_loop.sh"))).resolves.toBeUndefined();
    await expect(access(join(testDir, ".ralph/lib/circuit_breaker.sh"))).resolves.toBeUndefined();
    await expect(access(join(testDir, ".ralph/lib/response_analyzer.sh"))).resolves.toBeUndefined();

    // Verify .ralph subdirectories
    await expect(access(join(testDir, ".ralph/specs"))).resolves.toBeUndefined();
    await expect(access(join(testDir, ".ralph/logs"))).resolves.toBeUndefined();

    // Verify bmax state directory
    await expect(access(join(testDir, "bmax/state"))).resolves.toBeUndefined();
  });

  it("config round-trip works with all fields", async () => {
    await installProject(testDir);

    const config: BmaxConfig = {
      name: "my-project",
      description: "A complex project",
      createdAt: "2025-06-01T00:00:00.000Z",
    };
    await writeConfig(testDir, config);

    const readBack = await readConfig(testDir);
    expect(readBack).toEqual(config);
  });

  it("mergeInstructionsFile references /bmax slash command", async () => {
    await installProject(testDir);
    await mergeInstructionsFile(testDir);

    const claudeMd = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("/bmax");
    expect(claudeMd).toContain("/bmax-implement");
    expect(claudeMd).toContain("/bmax-status");
    expect(claudeMd).not.toContain("bmax plan");
    // Expanded content: phases, agents, help command
    expect(claudeMd).toContain("Research");
    expect(claudeMd).toContain("Build");
    expect(claudeMd).toContain("/bmad-help");
    expect(claudeMd).toContain("/researcher");
  });

  it("installs slash command to .claude/commands/", async () => {
    await installProject(testDir);
    await expect(access(join(testDir, ".claude/commands/bmax.md"))).resolves.toBeUndefined();
    const content = await readFile(join(testDir, ".claude/commands/bmax.md"), "utf-8");
    expect(content).toContain("_bmad/core/skills/bmad-help/workflow.md");
  });
});
