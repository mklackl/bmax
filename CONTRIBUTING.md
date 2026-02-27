# Contributing to bmalph

## Development Setup

```bash
# Clone the repository
git clone https://github.com/LarsCowe/bmalph.git
cd bmalph

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

### Requirements

- Node.js 20+ (LTS)
- npm 10+

## Project Structure

```
bmalph/
├── src/                    # TypeScript source
│   ├── cli.ts              # Commander.js CLI entry point
│   ├── installer.ts        # Asset copying and manifest generation
│   ├── commands/           # CLI command handlers
│   │   ├── init.ts         # bmalph init
│   │   ├── upgrade.ts      # bmalph upgrade
│   │   ├── doctor.ts       # bmalph doctor
│   │   ├── check-updates.ts # bmalph check-updates
│   │   ├── status.ts       # bmalph status
│   │   ├── implement.ts    # bmalph implement
│   │   ├── reset.ts        # bmalph reset
│   │   └── watch.ts        # bmalph watch
│   ├── platform/           # Platform abstraction layer
│   │   ├── types.ts        # PlatformId, PlatformTier, CommandDelivery types
│   │   ├── registry.ts     # Platform registry (get, list, validate)
│   │   ├── detect.ts       # Auto-detect platform from project markers
│   │   ├── resolve.ts      # Resolve platform from config with fallback
│   │   ├── claude-code.ts  # Claude Code platform definition
│   │   ├── codex.ts        # OpenAI Codex platform definition
│   │   ├── cursor.ts       # Cursor platform definition
│   │   ├── windsurf.ts     # Windsurf platform definition
│   │   ├── copilot.ts      # GitHub Copilot platform definition
│   │   ├── aider.ts        # Aider platform definition
│   │   └── index.ts        # Module barrel export
│   ├── transition/         # Transition logic modules
│   │   ├── orchestration.ts # Main transition orchestrator
│   │   ├── story-parsing.ts # Parse BMAD stories
│   │   ├── fix-plan.ts     # Generate @fix_plan.md
│   │   ├── artifacts.ts    # Locate BMAD artifacts
│   │   ├── artifact-scan.ts # Artifact scanning
│   │   ├── context.ts      # Generate PROJECT_CONTEXT.md
│   │   ├── preflight.ts    # Pre-flight validation checks
│   │   ├── tech-stack.ts   # Detect tech stack
│   │   ├── specs-*.ts      # Spec generation modules
│   │   ├── types.ts        # Shared transition types
│   │   └── index.ts        # Module barrel export
│   ├── watch/              # Live dashboard module
│   │   ├── dashboard.ts    # Dashboard orchestrator
│   │   ├── file-watcher.ts # File system polling
│   │   ├── renderer.ts     # Terminal UI rendering
│   │   ├── state-reader.ts # Ralph state parsing
│   │   └── types.ts        # Watch types
│   ├── reset.ts            # Reset plan-build + execute logic
│   └── utils/              # Shared utilities
│       ├── config.ts       # Config file operations
│       ├── state.ts        # State management
│       ├── validate.ts     # Runtime validation
│       ├── json.ts         # Safe JSON parsing
│       ├── github.ts       # GitHub API client
│       ├── constants.ts    # Path constants
│       ├── errors.ts       # Error formatting
│       ├── logger.ts       # Debug logging
│       ├── dryrun.ts       # Dry-run utilities
│       └── file-system.ts  # Atomic file writes, exists helper
├── tests/                  # Test files (mirrors src/ structure)
│   ├── commands/           # Command unit tests
│   ├── platform/           # Platform unit tests
│   ├── utils/              # Utility unit tests
│   ├── transition/         # Transition unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── bmad/                   # Bundled BMAD-METHOD assets
├── ralph/                  # Bundled Ralph assets
│   └── drivers/            # Platform driver scripts (claude-code.sh, codex.sh)
├── slash-commands/         # bmalph slash commands
├── bin/                    # CLI entry point
└── dist/                   # Compiled JavaScript (generated)
```

## Test Workflow

### Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- tests/utils/github.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### End-to-End Tests

E2E tests verify complete workflows in isolated temp directories.

```bash
# Run E2E tests only
npm run test:e2e

# Run all tests (unit + e2e)
npm run test:all
```

### Test Philosophy

- **TDD**: Write tests first, then implement
- Unit tests mock external dependencies
- E2E tests run actual CLI commands in real directories
- Aim for 80%+ coverage on new code

## Updating Bundled Assets

bmalph bundles BMAD-METHOD from its upstream repository. Ralph is fully owned by bmalph and maintained in-tree.

### Check for Updates

```bash
# Check if bundled versions are up to date
bmalph check-updates
```

### Update Process

```bash
# Run the update script
npm run update-bundled

# This script:
# 1. Fetches latest from BMAD-METHOD repo
# 2. Copies relevant files to bmad/
# 3. Updates version markers

# After updating:
npm run build
npm test
```

### What Gets Bundled

| Source           | Destination | Contents                            |
| ---------------- | ----------- | ----------------------------------- |
| BMAD-METHOD/src/ | bmad/       | Agents, workflows, personas, config |

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) with SemVer versioning.

### Commit Types

| Type       | SemVer | Description           |
| ---------- | ------ | --------------------- |
| `feat`     | MINOR  | New feature           |
| `fix`      | PATCH  | Bug fix               |
| `docs`     | PATCH  | Documentation only    |
| `refactor` | PATCH  | Code restructuring    |
| `test`     | PATCH  | Adding/updating tests |
| `chore`    | PATCH  | Maintenance tasks     |

### Version Bumping

Versions are managed automatically by [release-please](https://github.com/googleapis/release-please). Do **not** manually edit `package.json` version.

On every push to `main`, release-please analyzes commit messages and opens (or updates) a release PR with the correct version bump and changelog. Merging that PR triggers npm publish.

### Breaking Changes

Use `!` after type or add `BREAKING CHANGE:` footer:

```bash
git commit -m "feat(api)!: change response format"
```

## Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting

```bash
# Check lint
npm run lint

# Format code
npm run format

# Full check (lint + build + test)
npm run ci
```

## Pull Request Process

1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Ensure all tests pass: `npm run ci`
5. Create PR with clear description (version bumps are automated)

## Questions?

Open an issue at [github.com/LarsCowe/bmalph/issues](https://github.com/LarsCowe/bmalph/issues)
