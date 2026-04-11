# bmax

Solo SaaS Builder Framework — AI-powered planning, building, and launching for indie hackers.

Fork of [bmalph](https://github.com/LarsCowe/bmalph), radically stripped down for solo SaaS founders.

## What is bmax?

bmax gives you 5 AI agents that cover the entire solo SaaS lifecycle:

| Agent | Name | Role |
|-------|------|------|
| Researcher | Scout | Market research, competitor analysis, idea validation |
| Product Designer | Ada | PRD + UX + pricing strategy in one pass |
| Architect | Kit | SaaS architecture, tech stack, billing integration |
| Builder | Max | Implementation, testing, code review (Quick Flow default) |
| Launcher | Pip | Wire services, deploy, SEO, legal, analytics, growth |

## 5-Phase Workflow

```
Phase 1: Research    → Validate the idea (Scout)
Phase 2: Design      → PRD + UX + Pricing (Ada)
Phase 3: Architect   → Tech architecture (Kit)
Phase 4: Build       → Implementation via Ralph loop (Max)
Phase 5: Launch      → Wire, verify, ship, grow (Pip)
```

Quick Flow (`bmax quick`) skips the ceremony and goes straight to Builder.

## CLI Commands

| Command              | Action                                                       |
| -------------------- | ------------------------------------------------------------ |
| `bmax init`          | Install agents + Ralph, configure project                    |
| `bmax quick`         | Skip to Quick Flow — straight to Builder agent               |
| `bmax implement`     | Transition planning artifacts to Ralph format                |
| `bmax run`           | Start Ralph loop with live dashboard                         |
| `bmax launch`        | Transition to Phase 5 — wire, verify, ship                   |
| `bmax status`        | Show current phase and progress                              |
| `bmax doctor`        | Check installation health                                    |
| `bmax upgrade`       | Update bundled assets to current version                     |
| `bmax run --swarm N` | Run N parallel workers in git worktrees (default: 2, max: 6) |
| `bmax reset`         | Remove all bmax files from the project                       |

## Key Slash Commands

### Research (Phase 1)
- `/validate-idea` — 30-min idea validation (go/no-go)
- `/competitor-research` — Structured competitor analysis
- `/market-research` — Market size, trends, demand signals
- `/seo-keyword-research` — Keyword discovery + content strategy
- `/market-positioning` — Positioning statement + value prop

### Design (Phase 2)
- `/create-prd` — Product requirements with pricing baked in
- `/pricing-strategy` — Pricing model selection + tier design
- `/subscription-model` — Subscription lifecycle design
- `/create-ux` — User flows + interaction design

### Architect (Phase 3)
- `/create-architecture` — SaaS architecture (auth, billing, multi-tenancy)
- `/create-epics-stories` — Break down PRD into implementable stories
- `/implementation-readiness` — Pre-build alignment check

### Build (Phase 4)
- `/builder` — Builder agent with full menu
- `/quick-dev-new` — Unified: intent → plan → implement → review
- `/quick-dev` — Quick implementation of a story

### Launch (Phase 5)
- `/wire` — Connect services (Stripe, DB, hosting), deploy, smoke test
- `/design-review` — Evaluate UI/UX quality, compare with competitors
- `/launch-checklist` — Pre-launch audit
- `/stripe-setup` — Stripe integration checklist
- `/legal-compliance` — DSGVO, Impressum, AGB
- `/seo-audit` — Technical SEO checklist
- `/analytics-setup` — Tracking implementation guide
- `/landing-page` — Landing page structure + copy
- `/beta-launch` — Beta launch strategy

### Growth (anytime post-launch)
- `/growth-metrics` — SaaS metrics (MRR, churn, LTV, CAC)
- `/user-feedback` — Collect and prioritize feedback
- `/feature-prioritize` — Prioritize by revenue impact
- `/churn-analysis` — Churn patterns + retention strategies

## Provider Fallback

Configure `PROVIDER_CHAIN` in `.ralphrc` to auto-fallback between LLM providers:

```
PROVIDER_CHAIN="claude-code,codex,generic-api"
```

The `generic-api` driver calls LLM APIs via curl (needs `OPENAI_API_KEY` or `MINIMAX_API_KEY`).

## Architecture

```
Phases 1-3 (Planning): Solo SaaS agents + workflows (interactive)
Phase 4 (Build):       Ralph loop (autonomous, bash-driven)
Phase 5 (Launch):      Wire, verify, ship, grow (interactive)
bmax:                  CLI + transition logic + provider fallback
```

### Directory structure after `bmax init`

```
project-root/
├── _bmad/              # Agents, workflows, core skills
├── .ralph/             # Ralph runtime (loop, libs, specs, logs, drivers)
│   ├── drivers/        # Platform drivers (claude-code, codex, opencode, copilot, cursor, generic-api)
│   ├── lib/            # Shell libraries (circuit breaker, response analysis, etc.)
│   └── templates/      # Prompt, agent, fix plan, review templates
├── bmax/               # bmax state (config.json, state/)
└── <instructions file> # CLAUDE.md, AGENTS.md, etc. (varies by platform)
```

## Dev Workflow

- TDD: write tests first, then implement
- When a test fails, analyse the root cause before changing anything
- Tests live in `tests/<module>/` (mirrors `src/` structure), not colocated
- Conventional Commits with SemVer
- Application language: English
- Node 20+ LTS
- Always run `npm run ci` locally before committing

`npm run ci` runs (in order):

1. `type-check` — `tsc --noEmit`
2. `lint` — ESLint
3. `fmt:check` — Prettier (check only)
4. `build` — compile TypeScript
5. `test:all` — unit + e2e + bash tests

### Bash tests (BATS)

Ralph's shell scripts and platform drivers are tested with [BATS](https://github.com/bats-core/bats-core):

- Test files: `tests/bash/*.bats` + `tests/bash/drivers/*.bats`
- Fixtures: `tests/bash/fixtures/`
- Helpers: `tests/bash/test_helper/` (bats-assert, bats-support, common-setup.bash)
- Runner: `npm run test:bash` (via `scripts/run-bash-tests.mjs`)
- First-time setup: `scripts/setup-bats.sh` (installs BATS dependencies)

## CI Pipeline

- **Triggers:** push to `main`, PRs targeting `main`
- **Lint job** (ubuntu, Node 22): type-check, lint, fmt:check
- **Test matrix** (3 jobs): ubuntu/Node 22, ubuntu/Node 20, windows/Node 22
- **Test steps:** build, unit tests, e2e tests, bash tests (ubuntu only), coverage, `npm pack --dry-run`
- **Coverage:** Codecov upload on Node 22 + ubuntu only
- **Gate job:** `ci-success` aggregates all jobs — single required check for branch protection

## Release Process

- [release-please](https://github.com/googleapis/release-please) manages changelogs, version bumps, and release PRs
- On release creation: publish job runs build + test + `npm publish` to npm
- Version bumps follow Conventional Commits: `feat` = MINOR, `fix` = PATCH, `BREAKING CHANGE` = MAJOR
