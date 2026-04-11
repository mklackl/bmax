# Check Project Health

Run diagnostic checks on the bmax installation and report any issues.

## How to Run

Execute the CLI command:
    bmax doctor

## What It Does

- Verifies required directories exist (`_bmad/`, `.ralph/`, `bmax/`)
- Checks that slash commands are installed correctly
- Validates the instructions file contains the BMAD snippet
- Reports version mismatches between installed and bundled assets
- Suggests remediation steps for any issues found
