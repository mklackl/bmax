import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";
import { generateSkillsTierSnippet } from "./instructions-snippet.js";
import { CODEX_SKILLS_DIR } from "../utils/constants.js";

export const codexPlatform: Platform = {
  id: "codex",
  displayName: "OpenAI Codex",
  tier: "full",
  instructionsFile: "AGENTS.md",
  commandDelivery: {
    kind: "skills",
    dir: CODEX_SKILLS_DIR,
    frontmatterName: "command",
  },
  instructionsSectionMarker: "## BMAD-METHOD Integration",
  generateInstructionsSnippet: () => generateSkillsTierSnippet(),
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
