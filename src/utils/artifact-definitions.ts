/**
 * Shared artifact definitions for BMAD planning phases.
 *
 * Used by both artifact-scan.ts (for file classification) and
 * status.ts (for checklist rendering). Each definition includes
 * a regex pattern for matching filenames against artifact types.
 */

export interface ArtifactDefinition {
  pattern: RegExp;
  phase: number;
  name: string;
  required: boolean;
}

export const ARTIFACT_DEFINITIONS: ArtifactDefinition[] = [
  { pattern: /\bbrief\b/i, phase: 1, name: "Product Brief", required: false },
  { pattern: /\bmarket\b/i, phase: 1, name: "Market Research", required: false },
  { pattern: /\bdomain\b/i, phase: 1, name: "Domain Research", required: false },
  { pattern: /tech.*research/i, phase: 1, name: "Technical Research", required: false },
  { pattern: /\bprd\b/i, phase: 2, name: "PRD", required: true },
  { pattern: /\bux\b/i, phase: 2, name: "UX Design", required: false },
  { pattern: /architect/i, phase: 3, name: "Architecture", required: true },
  { pattern: /\bepics?\b|\bstor(?:y|ies)\b/i, phase: 3, name: "Epics & Stories", required: true },
  { pattern: /readiness/i, phase: 3, name: "Readiness Report", required: true },
];
