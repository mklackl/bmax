# bmax

Solo SaaS Builder Framework — AI agents for the full lifecycle, from idea to revenue.

## 5 Agents, 5 Phases

| Phase | Agent | What happens |
|-------|-------|-------------|
| 1. Research | **Scout** | Validate idea, research competitors, find keywords |
| 2. Design | **Ada** | PRD + UX + pricing in one pass |
| 3. Architect | **Kit** | Tech stack, auth, billing, deployment plan |
| 4. Build | **Max** | Autonomous implementation via Ralph loop |
| 5. Launch | **Pip** | Wire services, deploy, SEO, legal, ship |

Each agent guides you to the next phase when done. `bmax quick` skips straight to building.

## Quick Start

```bash
npm install -g bmax
cd my-project
bmax init --name my-project
```

Then in Claude Code:
```
/validate-idea       # Is it worth building?
/create-prd          # Define what to build
/create-architecture # Define how to build it
```

Then in terminal:
```bash
bmax implement       # Convert stories to Ralph format
bmax run             # Ralph builds it autonomously
bmax launch          # Enter launch phase
```

## CLI

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `bmax init`          | Install agents + Ralph into your project    |
| `bmax quick`         | Skip planning, straight to Builder          |
| `bmax implement`     | Transition planning to Ralph format         |
| `bmax run`           | Start Ralph autonomous build loop           |
| `bmax launch`        | Enter Phase 5 (wire, verify, ship)          |
| `bmax status`        | Show current phase and progress             |
| `bmax run --swarm N` | Parallel workers in git worktrees (max: 6)  |

## Slash Commands

**Research** `/validate-idea` `/competitor-research` `/market-research` `/seo-keyword-research` `/market-positioning`

**Design** `/create-prd` `/pricing-strategy` `/subscription-model` `/create-ux`

**Architect** `/create-architecture` `/create-epics-stories` `/implementation-readiness`

**Build** `/builder` `/quick-dev-new` `/quick-dev`

**Launch** `/wire` `/design-review` `/launch-checklist` `/stripe-setup` `/legal-compliance` `/seo-audit` `/analytics-setup` `/landing-page` `/beta-launch`

**Growth** `/growth-metrics` `/user-feedback` `/feature-prioritize` `/churn-analysis`

## Provider Fallback

Auto-switch between LLM providers on rate limits:

```ini
# .ralphrc
PROVIDER_CHAIN="claude-code,codex,generic-api"
```

## Platforms

Works with Claude Code, OpenAI Codex, OpenCode, Cursor, GitHub Copilot, Windsurf, and Aider. Ralph (Phases 4-5) requires a CLI-based platform.

## License

MIT
