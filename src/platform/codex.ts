import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";
import { generateSkillsTierSnippet } from "./instructions-snippet.js";

export const codexPlatform: Platform = {
  id: "codex",
  displayName: "OpenAI Codex",
  tier: "full",
  instructionsFile: "AGENTS.md",
  commandDelivery: { kind: "skills" },
  instructionsSectionMarker: "## BMAD-METHOD Integration",
  generateInstructionsSnippet: () => generateSkillsTierSnippet(),
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
