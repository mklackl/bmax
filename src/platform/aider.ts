import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";
import { generateInstructionsOnlySnippet } from "./instructions-snippet.js";

export const aiderPlatform: Platform = {
  id: "aider",
  displayName: "Aider",
  tier: "instructions-only",
  instructionsFile: "CONVENTIONS.md",
  commandDelivery: { kind: "index" },
  instructionsSectionMarker: "## bmax",
  generateInstructionsSnippet: generateInstructionsOnlySnippet,
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
