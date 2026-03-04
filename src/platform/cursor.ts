import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";
import { generateFullTierSnippet } from "./instructions-snippet.js";

export const cursorPlatform: Platform = {
  id: "cursor",
  displayName: "Cursor",
  tier: "full",
  experimental: true,
  instructionsFile: ".cursor/rules/bmad.mdc",
  commandDelivery: { kind: "index" },
  instructionsSectionMarker: "## BMAD-METHOD Integration",
  generateInstructionsSnippet: () => generateFullTierSnippet("Ask"),
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
