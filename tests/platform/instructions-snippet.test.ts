import { describe, it, expect } from "vitest";
import {
  generateFullTierSnippet,
  generateSkillsTierSnippet,
  generateOpencodeSkillsTierSnippet,
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

  it("includes the bmax heading", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("## bmax");
  });

  it("includes all five phases", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("1. Research");
    expect(snippet).toContain("2. Design");
    expect(snippet).toContain("3. Architect");
    expect(snippet).toContain("4. Build");
    expect(snippet).toContain("5. Launch");
  });

  it("includes Phase 4 Ralph reference", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("Ralph autonomous loop");
  });

  it("includes the bmax-implement transition step", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("bmax-implement");
  });

  it("references COMMANDS.md for command discovery", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("_bmad/COMMANDS.md");
  });

  it("includes command reference section", () => {
    const snippet = generateFullTierSnippet("Run");
    expect(snippet).toContain("Command Reference");
    expect(snippet).toContain("look it up in");
  });
});

describe("generateSkillsTierSnippet", () => {
  it("includes the bmax heading", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("## bmax");
  });

  it("includes all five phases", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("1. Research");
    expect(snippet).toContain("2. Design");
    expect(snippet).toContain("3. Architect");
    expect(snippet).toContain("4. Build");
    expect(snippet).toContain("5. Launch");
  });

  it("includes Phase 4 Ralph reference", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("Ralph autonomous loop");
  });

  it("includes the bmax-implement transition step", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("bmax-implement");
  });

  it("references $command-name invocation syntax", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("$command-name");
    expect(snippet).toContain("$create-prd");
    expect(snippet).toContain("$researcher");
  });

  it("references COMMANDS.md as supplementary reference", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("_bmad/COMMANDS.md");
  });

  it("mentions Codex Skills", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).toContain("Codex Skills");
  });

  it("does not contain look-it-up-in-COMMANDS phrasing", () => {
    const snippet = generateSkillsTierSnippet();
    expect(snippet).not.toContain("look it up in");
  });
});

describe("generateOpencodeSkillsTierSnippet", () => {
  it("includes the bmax heading", () => {
    const snippet = generateOpencodeSkillsTierSnippet();
    expect(snippet).toContain("## bmax");
  });

  it("includes all five phases", () => {
    const snippet = generateOpencodeSkillsTierSnippet();
    expect(snippet).toContain("1. Research");
    expect(snippet).toContain("2. Design");
    expect(snippet).toContain("3. Architect");
    expect(snippet).toContain("4. Build");
    expect(snippet).toContain("5. Launch");
  });

  it("references native OpenCode skills without Codex dollar syntax", () => {
    const snippet = generateOpencodeSkillsTierSnippet();
    expect(snippet).toContain(".opencode/skills");
    expect(snippet).toContain("bmad-researcher");
    expect(snippet).not.toContain("$command-name");
    expect(snippet).not.toContain("Codex Skills");
  });

  it("mentions the question tool for interactive workflow prompts", () => {
    const snippet = generateOpencodeSkillsTierSnippet();
    expect(snippet).toContain("question tool");
  });
});

describe("generateInstructionsOnlySnippet", () => {
  it("includes the bmax heading", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("## bmax");
  });

  it("uses Ask as the verb", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("Ask the BMAD master agent");
  });

  it("includes phases 1 through 3 only", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("1. Research");
    expect(snippet).toContain("2. Design");
    expect(snippet).toContain("3. Architect");
    expect(snippet).not.toContain("4. Build");
  });

  it("does not mention Ralph or Phase 4 in workflow", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).not.toContain("Ralph autonomous loop");
    expect(snippet).not.toContain("bmax-implement");
  });

  it("includes the unsupported platform note", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("Ralph (Phases 4-5");
    expect(snippet).toContain("not supported on this platform");
  });

  it("references COMMANDS.md for command discovery", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("_bmad/COMMANDS.md");
  });

  it("references lite workflow for PRD creation", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("_bmad/lite/create-prd.md");
  });

  it("includes command reference section", () => {
    const snippet = generateInstructionsOnlySnippet();
    expect(snippet).toContain("Command Reference");
    expect(snippet).toContain("look it up in");
  });
});
