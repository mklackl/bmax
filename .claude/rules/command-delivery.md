---
paths:
  - "src/installer/commands.ts"
  - "src/installer/metadata.ts"
  - "src/platform/**"
  - "slash-commands/**"
---

# Command Delivery

bmax bundles slash commands for solo SaaS development. Delivery varies by platform:

- **Claude Code** — `.claude/commands/` slash commands
- **OpenAI Codex** — `.agents/skills/` Codex Skills
- **OpenCode** — `.opencode/skills/` OpenCode Skills
- **Cursor, Windsurf, Copilot, Aider** — `_bmad/COMMANDS.md` reference index

Key commands in Claude Code syntax:

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `/bmax`                 | Master agent — navigate phases           |
| `/researcher`           | Scout — market research, idea validation |
| `/product-designer`     | Ada — PRD, UX, pricing                   |
| `/architect`            | Kit — SaaS architecture                  |
| `/builder`              | Max — implementation, quick flow         |
| `/launcher`             | Pip — wire, deploy, SEO, legal, growth   |
| `/validate-idea`        | 30-min idea validation                   |
| `/create-prd`           | Create PRD workflow                      |
| `/create-architecture`  | Create architecture workflow             |
| `/wire`                 | Connect services, deploy, smoke test     |
| `/launch-checklist`     | Pre-launch audit                         |
| `/bmad-help`            | List all commands                        |

## CLI Commands

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `bmax init`      | Install agents + Ralph                   |
| `bmax quick`     | Skip to Quick Flow (Builder agent)       |
| `bmax implement` | Transition planning to Ralph format      |
| `bmax run`       | Start Ralph autonomous loop              |
| `bmax launch`    | Enter Phase 5 (wire, verify, ship)       |
| `bmax status`    | Show current phase and progress          |
| `bmax doctor`    | Check installation health                |
