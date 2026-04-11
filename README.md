<div align="center">

# bmax

**Solo SaaS Builder Framework**

5 AI agents. 5 phases. From idea to revenue.

[![npm](https://img.shields.io/npm/v/bmax?style=flat-square&color=cb3837)](https://www.npmjs.com/package/bmax)
[![license](https://img.shields.io/npm/l/bmax?style=flat-square)](LICENSE)
[![node](https://img.shields.io/node/v/bmax?style=flat-square&color=417e38)](https://nodejs.org)

</div>

---

No team roles. No sprint ceremonies. No stakeholder alignment.<br>
Just you, your idea, and 5 agents that know what a solo founder actually needs.

<br>

## The Flow

```
 Research       Design        Architect       Build          Launch
 ────────       ──────        ─────────       ─────          ──────
   Scout    →     Ada     →     Kit      →     Max      →     Pip
                                                │
                                          Ralph Loop
                                       (autonomous TDD)
```

| Phase | Agent | What happens |
|:------|:------|:-------------|
| **1. Research** | Scout | Validate idea, research competitors, find keywords |
| **2. Design** | Ada | PRD + UX + pricing strategy — one pass, no handoffs |
| **3. Architect** | Kit | Tech stack, auth, billing, deployment plan |
| **4. Build** | Max | Autonomous implementation via Ralph loop |
| **5. Launch** | Pip | Wire services, deploy, verify, SEO, legal, ship |

Each agent guides you to the next phase when done.

<br>

## Quick Start

```bash
npm install -g bmax
```

```bash
cd my-project
bmax init --name my-project
```

**Full flow** — plan first, build second:

```bash
# In Claude Code:
/validate-idea           # Worth building?
/create-prd              # Define the product
/create-architecture     # Design the system

# In terminal:
bmax implement           # Convert stories to Ralph format
bmax run                 # Ralph builds it autonomously
bmax launch              # Wire services, verify, ship
```

**Quick flow** — skip planning, start building:

```bash
bmax quick
```

<br>

## Commands

### CLI

| Command | Description |
|:--------|:------------|
| `bmax init` | Install agents + Ralph into your project |
| `bmax quick` | Skip to Builder (Quick Flow) |
| `bmax implement` | Transition planning artifacts to Ralph |
| `bmax run` | Start Ralph autonomous build loop |
| `bmax launch` | Enter Phase 5 — wire, verify, ship |
| `bmax status` | Current phase and progress |
| `bmax doctor` | Installation health check |
| `bmax run --swarm N` | Parallel workers in git worktrees |

### Slash Commands

<table>
<tr>
<td width="50%" valign="top">

**Research**
- `/validate-idea` — 30-min go/no-go
- `/competitor-research`
- `/market-research`
- `/seo-keyword-research`
- `/market-positioning`

**Design**
- `/create-prd` — PRD with pricing
- `/pricing-strategy`
- `/subscription-model`
- `/create-ux`

**Architect**
- `/create-architecture`
- `/create-epics-stories`
- `/implementation-readiness`

</td>
<td width="50%" valign="top">

**Build**
- `/builder` — Full agent menu
- `/quick-dev-new` — Intent to review
- `/quick-dev`

**Launch**
- `/wire` — Connect + deploy + smoke test
- `/design-review` — UI/UX audit
- `/launch-checklist`
- `/stripe-setup`
- `/legal-compliance` — DSGVO, Impressum
- `/seo-audit`
- `/analytics-setup`
- `/landing-page`
- `/beta-launch`

**Growth**
- `/growth-metrics` — MRR, churn, LTV
- `/user-feedback`
- `/feature-prioritize`
- `/churn-analysis`

</td>
</tr>
</table>

<br>

## Provider Fallback

Auto-switch between LLM providers when rate-limited:

```ini
# .ralphrc
PROVIDER_CHAIN="claude-code,codex,generic-api"
```

The `generic-api` driver calls LLM APIs via curl. Set `OPENAI_API_KEY` or `MINIMAX_API_KEY`.

<br>

## Platforms

| Platform | Ralph Support | Notes |
|:---------|:-------------|:------|
| Claude Code | Full | Primary target |
| OpenAI Codex | Full | |
| OpenCode | Full | |
| Cursor | Experimental | |
| GitHub Copilot | Experimental | |
| Windsurf | Planning only | No Ralph |
| Aider | Planning only | No Ralph |

<br>

## How It Works

```
project/
├── _bmad/          # Agents, workflows, skills
├── .ralph/         # Ralph runtime, drivers, specs
├── bmax/           # State and config
├── _bmad-output/   # Your artifacts (PRD, architecture, stories)
└── CLAUDE.md       # Agent instructions
```

1. **Phases 1-3**: Interactive planning with AI agents
2. **Phase 4**: `bmax implement` + `bmax run` — Ralph builds autonomously with TDD
3. **Phase 5**: `bmax launch` — wire services, verify, ship

Ralph picks stories one by one, writes tests first, implements, and commits. Circuit breaker stops the loop if it gets stuck.

<br>

## Prerequisites

- Node.js 20+
- Bash (WSL or Git Bash on Windows)
- A [supported platform](#platforms)

<br>

## Credits

Fork of [bmalph](https://github.com/LarsCowe/bmalph), built on [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) and [Ralph](https://github.com/snarktank/ralph).

## License

MIT
