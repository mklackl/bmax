import { describe, it, expect } from "vitest";
import {
  generateFullTierSnippet,
  generateInstructionsOnlySnippet,
} from "../../src/platform/instructions-snippet.js";

describe("generateFullTierSnippet", () => {
  it("starts the first content line with the provided verb", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("Run the BMAD master agent");
  });

  it("substitutes verb correctly for Ask", () => {
    const snippet = generateFullTierSnippet("Ask");
    expect(snippet).toContain("Ask the BMAD master agent");
    expect(snippet).not.toContain("Run the BMAD master agent");
  });

  it("includes the BMAD-METHOD Integration heading", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("## BMAD-METHOD Integration");
  });

  it("includes all four phases", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("1. Analysis");
    expect(snippet).toContain("2. Planning");
    expect(snippet).toContain("3. Solutioning");
    expect(snippet).toContain("4. Implementation");
  });

  it("includes Phase 4 Ralph reference", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("Ralph autonomous loop");
  });

  it("includes the bmalph-implement transition step", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("bmalph-implement");
  });

  it("lists all expected agents", () => {
    const snippet = generateFullTierSnippet("Run");
    const expectedAgents = [
      "Analyst",
      "Architect",
      "Product Manager",
      "Scrum Master",
      "Developer",
      "UX Designer",
      "QA Engineer",
    ];
    for (const agent of expectedAgents) {
      expect(snippet).toContain(agent);
    }
  });
});

describe("generateInstructionsOnlySnippet", () => {
  it("includes the BMAD-METHOD Integration heading", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("## BMAD-METHOD Integration");
  });

  it("uses Ask as the verb", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("Ask the BMAD master agent");
  });

  it("includes phases 1 through 3 only", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("1. Analysis");
    expect(snippet).toContain("2. Planning");
    expect(snippet).toContain("3. Solutioning");
    expect(snippet).not.toContain("4. Implementation");
  });

  it("does not mention Ralph or Phase 4", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).not.toContain("Ralph autonomous loop");
    expect(snippet).not.toContain("bmalph-implement");
  });

  it("includes the unsupported platform note", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("Ralph (Phase 4");
    expect(snippet).toContain("not supported on this platform");
  });

  it("lists all expected agents", () => {
    const snippet = generateInstructionsOnlySnippet();
    const expectedAgents = [
      "Analyst",
      "Architect",
      "Product Manager",
      "Scrum Master",
      "Developer",
      "UX Designer",
      "QA Engineer",
    ];
    for (const agent of expectedAgents) {
      expect(snippet).toContain(agent);
    }
  });
});
