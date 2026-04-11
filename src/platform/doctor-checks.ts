import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { exists } from "../utils/file-system.js";
import { SKILLS_PREFIX } from "../utils/constants.js";
import { isEnoent, formatError } from "../utils/errors.js";
import type { Platform, PlatformDoctorCheck } from "./types.js";

/**
 * Creates the standard instructions-file doctor check for a platform.
 */
export function createInstructionsFileCheck(platform: Platform): PlatformDoctorCheck {
  const file = platform.instructionsFile;
  return {
    id: "instructions-file",
    label: `${file} contains BMAD snippet`,
    check: async (projectDir: string) => {
      try {
        const content = await readFile(join(projectDir, file), "utf-8");
        if (content.includes(platform.instructionsSectionMarker)) {
          return { passed: true };
        }
        return {
          passed: false,
          detail: `missing ${platform.instructionsSectionMarker} section`,
          hint: "Run: bmax init",
        };
      } catch (err) {
        if (isEnoent(err)) {
          return { passed: false, detail: `${file} not found`, hint: "Run: bmax init" };
        }
        return { passed: false, detail: formatError(err), hint: "Check file permissions" };
      }
    },
  };
}

/**
 * Creates a doctor check that verifies a file exists at the given path.
 */
function createFileExistsCheck(
  id: string,
  relativePath: string,
  hint: string
): PlatformDoctorCheck {
  return {
    id,
    label: `${relativePath} present`,
    check: async (projectDir: string) => {
      if (await exists(join(projectDir, relativePath))) {
        return { passed: true };
      }
      return { passed: false, detail: "not found", hint };
    },
  };
}

/**
 * Builds the standard set of doctor checks for any platform.
 * Derives checks from the platform's properties.
 */
export function buildPlatformDoctorChecks(platform: Platform): PlatformDoctorCheck[] {
  const checks: PlatformDoctorCheck[] = [];

  if (platform.commandDelivery.kind === "directory") {
    const dir = platform.commandDelivery.dir;
    checks.push(createFileExistsCheck("slash-command", `${dir}/bmax.md`, "Run: bmax init"));
  }

  if (platform.commandDelivery.kind === "index" || platform.commandDelivery.kind === "skills") {
    checks.push(createFileExistsCheck("command-index", "_bmad/COMMANDS.md", "Run: bmax upgrade"));
  }

  if (platform.commandDelivery.kind === "skills") {
    checks.push(
      createFileExistsCheck(
        "skills",
        `${platform.commandDelivery.dir}/${SKILLS_PREFIX}researcher/SKILL.md`,
        "Run: bmax upgrade"
      )
    );
  }

  checks.push(
    createFileExistsCheck("lite-workflow", "_bmad/lite/create-prd.md", "Run: bmax upgrade")
  );
  checks.push(createInstructionsFileCheck(platform));

  return checks;
}
