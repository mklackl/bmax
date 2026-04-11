import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";
import { generateOpencodeSkillsTierSnippet } from "./instructions-snippet.js";
import { OPENCODE_SKILLS_DIR } from "../utils/constants.js";

export const opencodePlatform: Platform = {
  id: "opencode",
  displayName: "OpenCode",
  tier: "full",
  instructionsFile: "AGENTS.md",
  commandDelivery: {
    kind: "skills",
    dir: OPENCODE_SKILLS_DIR,
    frontmatterName: "directory",
  },
  instructionsSectionMarker: "## bmax",
  generateInstructionsSnippet: () => generateOpencodeSkillsTierSnippet(),
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
