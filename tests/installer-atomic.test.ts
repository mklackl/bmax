import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdir, rm, writeFile, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { mockRename, mockReadFile } = vi.hoisted(() => ({
  mockRename: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return { ...actual, rename: mockRename, readFile: mockReadFile };
});

import { copyBundledAssets } from "../src/installer.js";

function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

async function installFsMocks(options?: {
  shouldFailRename?: (src: string, dest: string) => boolean;
  shouldFailReadFile?: (path: string) => boolean;
}): Promise<void> {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");

  mockRename.mockImplementation(async (src: string, dest: string) => {
    if (options?.shouldFailRename?.(src, dest)) {
      throw new Error("Simulated rename failure");
    }

    return (actual.rename as typeof import("fs/promises").rename)(src, dest);
  });

  mockReadFile.mockImplementation(
    async (
      path: Parameters<typeof actual.readFile>[0],
      fileOptions?: Parameters<typeof actual.readFile>[1]
    ) => {
      if (options?.shouldFailReadFile?.(toPosixPath(String(path)))) {
        throw new Error("Simulated post-swap manifest failure");
      }

      return actual.readFile(path, fileOptions as never);
    }
  );
}

describe("installer atomic copy", { timeout: 30000 }, () => {
  let testDir: string;

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Windows file locking
    }
  });

  it("restores original _bmad when final rename fails", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    // Create an existing _bmad with a marker file
    const bmadDir = join(testDir, "_bmad");
    await mkdir(join(bmadDir, "core"), { recursive: true });
    await writeFile(join(bmadDir, "core", "marker.txt"), "original");

    await installFsMocks({
      shouldFailRename: (src, dest) =>
        String(src).endsWith("_bmad.new") && String(dest).endsWith("_bmad"),
    });

    await expect(copyBundledAssets(testDir)).rejects.toThrow("Simulated rename failure");

    // Original _bmad should be restored
    await expect(access(join(bmadDir, "core"))).resolves.toBeUndefined();
    const content = await readFile(join(bmadDir, "core", "marker.txt"), "utf-8");
    expect(content).toBe("original");
  });

  it("cleans up _bmad.old on success", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    // Create existing _bmad
    await mkdir(join(testDir, "_bmad", "core"), { recursive: true });
    await writeFile(join(testDir, "_bmad", "core", "marker.txt"), "will be replaced");

    await installFsMocks();

    await copyBundledAssets(testDir);

    // _bmad.old should be cleaned up
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
    // _bmad should exist with real content
    await expect(access(join(testDir, "_bmad", "core"))).resolves.toBeUndefined();
  });

  it("cleans up leftover _bmad.old from previous failed attempt", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    // Create stale _bmad.old from a previous failed run
    await mkdir(join(testDir, "_bmad.old", "stale"), { recursive: true });
    await writeFile(join(testDir, "_bmad.old", "stale", "data.txt"), "stale data");

    await installFsMocks();

    await copyBundledAssets(testDir);

    // Stale _bmad.old should be cleaned up
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
  });

  it("reuses _bmad.old as backup when retrying after a failed rollback", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    await mkdir(join(testDir, "_bmad.old", "core"), { recursive: true });
    await writeFile(join(testDir, "_bmad.old", "core", "marker.txt"), "original");

    await installFsMocks({
      shouldFailReadFile: (path) => path.endsWith("/_bmad/core/module-help.csv"),
    });

    await expect(copyBundledAssets(testDir)).rejects.toThrow(
      "previous BMAD installation was restored"
    );

    const content = await readFile(join(testDir, "_bmad", "core", "marker.txt"), "utf-8");
    expect(content).toBe("original");
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
  });

  it("treats ENOENT during rename-aside as a first-install race", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    await mkdir(join(testDir, "_bmad", "core"), { recursive: true });
    await writeFile(join(testDir, "_bmad", "core", "marker.txt"), "original");

    await installFsMocks();

    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const enoent = Object.assign(new Error("ENOENT: no such file or directory"), {
      code: "ENOENT",
    });
    mockRename.mockImplementationOnce(async (src: string, _dest: string) => {
      await actual.rm(src, { recursive: true, force: true });
      throw enoent;
    });

    await expect(copyBundledAssets(testDir)).resolves.toEqual(
      expect.objectContaining({
        updatedPaths: expect.arrayContaining(["_bmad/"]),
      })
    );
    await expect(access(join(testDir, "_bmad", "core"))).resolves.toBeUndefined();
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
  });

  it("handles first install when no _bmad exists", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    // No _bmad directory exists — first install
    await installFsMocks();

    await copyBundledAssets(testDir);

    // _bmad should be created successfully
    await expect(access(join(testDir, "_bmad", "core"))).resolves.toBeUndefined();
    // No leftover .old or .new
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
    await expect(access(join(testDir, "_bmad.new"))).rejects.toThrow();
  });

  it("restores original _bmad when post-swap finalization fails", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    const bmadDir = join(testDir, "_bmad");
    await mkdir(join(bmadDir, "core"), { recursive: true });
    await writeFile(join(bmadDir, "core", "marker.txt"), "original");

    await installFsMocks({
      shouldFailReadFile: (path) => path.endsWith("/_bmad/core/module-help.csv"),
    });

    await expect(copyBundledAssets(testDir)).rejects.toThrow(
      "previous BMAD installation was restored"
    );

    const content = await readFile(join(bmadDir, "core", "marker.txt"), "utf-8");
    expect(content).toBe("original");
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
    await expect(access(join(testDir, "_bmad", "_config", "task-manifest.csv"))).rejects.toThrow();
  });

  it("cleans up incomplete _bmad when post-swap finalization fails on first install", async () => {
    testDir = join(tmpdir(), `bmax-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });

    await installFsMocks({
      shouldFailReadFile: (path) => path.endsWith("/_bmad/core/module-help.csv"),
    });

    await expect(copyBundledAssets(testDir)).rejects.toThrow(
      "incomplete BMAD installation was cleaned up"
    );

    await expect(access(join(testDir, "_bmad"))).rejects.toThrow();
    await expect(access(join(testDir, "_bmad.old"))).rejects.toThrow();
    await expect(access(join(testDir, "_bmad.new"))).rejects.toThrow();
  });
});
