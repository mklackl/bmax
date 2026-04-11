import type { Platform } from "./types.js";
import { buildPlatformDoctorChecks } from "./doctor-checks.js";

export const claudeCodePlatform: Platform = {
  id: "claude-code",
  displayName: "Claude Code",
  tier: "full",
  instructionsFile: "CLAUDE.md",
  commandDelivery: { kind: "directory", dir: ".claude/commands" },
  instructionsSectionMarker: "## bmax",
  generateInstructionsSnippet: () => `
## bmax — Solo SaaS Builder

Use \`/bmax\` to navigate phases. Use \`/bmad-help\` to discover all commands. Use \`/bmax-status\` for a quick overview.

### Phases

| Phase | Focus | Key Commands |
|-------|-------|-------------|
| 1. Research | Validate the idea | \`/researcher\`, \`/create-brief\`, \`/market-research\` |
| 2. Design | PRD + UX + Pricing | \`/product-designer\`, \`/create-prd\`, \`/create-ux\` |
| 3. Architect | Tech architecture | \`/architect\`, \`/create-architecture\`, \`/implementation-readiness\` |
| 4. Build | Implementation | \`/builder\`, then \`/bmax-implement\` for Ralph |
| 5. Launch | Ship & grow | \`/launcher\` — SEO, legal, analytics, Stripe, growth |

### Workflow

1. Work through Phases 1-3 using agents and workflows
2. Run \`/bmax-implement\` to transition to Ralph format, then start building
3. Use \`/launcher\` for Phase 5 — SEO, legal, analytics, go-to-market

### Management Commands

| Command | Description |
|---------|-------------|
| \`/bmax-status\` | Show current phase, Ralph progress, version info |
| \`/bmax-implement\` | Transition planning artifacts → prepare Ralph loop |
| \`/bmax-upgrade\` | Update bundled assets to match current bmax version |
| \`/bmax-doctor\` | Check project health and report issues |

### Available Agents

| Command | Agent | Role |
|---------|-------|------|
| \`/researcher\` | Scout | Market research, competitor analysis, idea validation |
| \`/product-designer\` | Ada | PRDs, UX design, pricing strategy |
| \`/architect\` | Kit | SaaS architecture, tech stack, billing integration |
| \`/builder\` | Max | Implementation, testing, quick flow, code review |
| \`/launcher\` | Pip | Launch checklists, SEO, analytics, legal, growth |
`,
  getDoctorChecks() {
    return buildPlatformDoctorChecks(this);
  },
};
