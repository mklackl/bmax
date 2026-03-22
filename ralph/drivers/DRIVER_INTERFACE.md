# Ralph Driver Interface Contract

A Ralph driver is a Bash script that teaches `ralph_loop.sh` how to invoke a
specific AI coding CLI. The orchestrator sources the driver file and calls the
functions documented below.

Existing drivers live in `ralph/drivers/` — use `claude-code.sh` as the
reference implementation.

---

## Required Functions

Every driver **must** implement these 9 functions.

### `driver_name()`

Echo a short, unique identifier for the driver.

```bash
driver_name() { echo "claude-code"; }
```

Used internally for conditional logic (`if [[ "$(driver_name)" == "claude-code" ]]`).

### `driver_display_name()`

Echo a human-readable name shown in logs and UI.

```bash
driver_display_name() { echo "Claude Code"; }
```

Stored in the global `DRIVER_DISPLAY_NAME` by the orchestrator after loading.

### `driver_cli_binary()`

Echo the CLI command name (or path) to invoke.

```bash
driver_cli_binary() { echo "claude"; }
```

Stored in the global `CLAUDE_CODE_CMD` by the orchestrator. May return a
dynamically resolved path (see cursor.sh for Windows `.cmd` resolution).

### `driver_min_version()`

Echo the minimum supported semantic version string (`major.minor.patch`).

```bash
driver_min_version() { echo "2.0.76"; }
```

### `driver_check_available()`

Return exit code 0 if the CLI binary is installed, 1 otherwise.

```bash
driver_check_available() {
    command -v "$(driver_cli_binary)" &>/dev/null
}
```

### `driver_valid_tools()`

Populate the global `VALID_TOOL_PATTERNS` array with platform-specific tool
names used for `--allowedTools` validation.

```bash
driver_valid_tools() {
    VALID_TOOL_PATTERNS=(
        "Write" "Read" "Edit" "Bash" "Bash(npm *)"
    )
}
```

### `driver_supports_tool_allowlist()`

Return 0 if the driver honours `--allowedTools` permission control, 1
otherwise. Currently only `claude-code` returns 0; all other drivers use their
native permission models and ignore `ALLOWED_TOOLS`.

### `driver_permission_denial_help()`

Echo driver-specific guidance when a permission denial is detected. Use the
globals `$DRIVER_DISPLAY_NAME` and `$RALPHRC_FILE` in the output.

### `driver_build_command(prompt_file, loop_context, session_id)`

Build the execution command and store it in the global `CLAUDE_CMD_ARGS` array.

| Parameter | Description |
|---|---|
| `$1` — prompt_file | Absolute path to the prompt file (e.g. `.ralph/PROMPT.md`) |
| `$2` — loop_context | Optional metadata string for session continuity (may be empty) |
| `$3` — session_id | Optional session ID to resume (may be empty) |

**Returns:** 0 on success, 1 if the prompt file is missing.

**Sets global:** `CLAUDE_CMD_ARGS` — a Bash array that the orchestrator
executes directly (`"${CLAUDE_CMD_ARGS[@]}"`).

**Environment variables read:**

| Variable | Used by | Description |
|---|---|---|
| `CLAUDE_USE_CONTINUE` | all session-capable drivers | `"true"` to enable session resume (gates `session_id` usage) |
| `CLAUDE_OUTPUT_FORMAT` | claude-code | `"json"` or `"text"` — other drivers hardcode their output format flags |
| `CLAUDE_ALLOWED_TOOLS` | claude-code | Comma-separated tool list (only if `driver_supports_tool_allowlist` returns 0) |
| `CLAUDE_PERMISSION_MODE` | claude-code | Permission mode string (default: `bypassPermissions`) |

**Convention:** Loop context is typically prepended to the prompt content or
passed via `--append-system-prompt`, depending on the driver's CLI flags.

---

## Optional Functions

Drivers may implement these functions to enable additional capabilities.
The orchestrator checks for their existence before calling.

### `driver_supports_sessions()`

Return 0 if the driver can resume sessions with explicit session IDs, 1
otherwise. When returning 0, `driver_build_command` must handle the
`session_id` parameter.

Session resume flag syntax varies by driver:

| Driver | Flag |
|---|---|
| claude-code, codex, cursor | `--resume <id>` |
| opencode | `--continue --session <id>` |
| copilot | _(not supported)_ |

### `driver_supports_live_output()`

Return 0 if the driver can stream structured JSON output for real-time
display, 1 otherwise. When returning 0, the driver should also implement
`driver_prepare_live_command` and `driver_stream_filter`.

### `driver_prepare_live_command()`

Transform the already-built `CLAUDE_CMD_ARGS` into a streaming variant and
store it in the global `LIVE_CMD_ARGS` array.

Typical transformations:
- Replace `json` output format with `stream-json`
- Add `--verbose` / `--include-partial-messages` flags

Some drivers (codex, opencode) simply copy `CLAUDE_CMD_ARGS` unchanged.

### `driver_stream_filter()`

Echo a `jq` filter expression that transforms live stream JSON events into
readable text. The orchestrator pipes the live log through this filter.

```bash
# Example: passthrough (copilot)
driver_stream_filter() { echo '.'; }
```

### `driver_extract_session_id_from_output(output_file)`

Parse the driver's JSON output file to extract a resumable session ID. Echo
the session ID to stdout; return 0 if found, 1 otherwise.

Called after successful execution. Falls through to
`driver_fallback_session_id` if not implemented or if extraction fails.

### `driver_fallback_session_id()`

Query the driver's native session API to retrieve the active session ID when
output parsing fails. Echo the session ID to stdout; return 0 if found, 1
otherwise.

---

## Global Variables

### Set by drivers

| Variable | Set by | Description |
|---|---|---|
| `CLAUDE_CMD_ARGS` | `driver_build_command` | Bash array — the full command to execute |
| `VALID_TOOL_PATTERNS` | `driver_valid_tools` | Bash array — valid tool names for allowlist validation |
| `LIVE_CMD_ARGS` | `driver_prepare_live_command` | Bash array — streaming variant of the command |

### Set by the orchestrator (available to drivers)

| Variable | Description |
|---|---|
| `DRIVER_DISPLAY_NAME` | Result of `driver_display_name()` |
| `CLAUDE_CODE_CMD` | Result of `driver_cli_binary()` |
| `RALPHRC_FILE` | Path to the `.ralphrc` config file |

---

## Orchestration Flow

The orchestrator (`ralph_loop.sh`) calls driver functions in this order:

1. **Load** — `source drivers/${PLATFORM_DRIVER}.sh`
2. **Initialize** — call `driver_valid_tools`, `driver_cli_binary`, `driver_display_name` to populate globals
3. **Preflight** — call `driver_check_available`, `driver_supports_tool_allowlist` for validation
4. **Session setup** — if `driver_supports_sessions` returns 0, initialize session state
5. **Build command** — call `driver_build_command(prompt_file, loop_context, session_id)` → populates `CLAUDE_CMD_ARGS`
6. **Live mode** _(optional)_ — if `--live` flag and `driver_supports_live_output` returns 0, call `driver_prepare_live_command` and `driver_stream_filter`
7. **Execute** — run `"${CLAUDE_CMD_ARGS[@]}"` (or `"${LIVE_CMD_ARGS[@]}"` in live mode)
8. **Session save** — try `driver_extract_session_id_from_output`, fall back to `driver_fallback_session_id`

---

## Capability Matrix

| Function | claude-code | codex | opencode | copilot | cursor |
|---|:---:|:---:|:---:|:---:|:---:|
| `driver_name` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_display_name` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_cli_binary` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_min_version` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_check_available` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_valid_tools` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_supports_tool_allowlist` | ✓ (yes) | ✓ (no) | ✓ (no) | ✓ (no) | ✓ (no) |
| `driver_permission_denial_help` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_build_command` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_supports_sessions` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `driver_supports_live_output` | ✓ | ✓ | ✓ | ✗ | ✓ |
| `driver_prepare_live_command` | ✓ | ✓ | ✓ | — | ✓ |
| `driver_stream_filter` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `driver_extract_session_id_from_output` | — | — | ✓ | — | — |
| `driver_fallback_session_id` | — | — | ✓ | — | — |

Key: **✓** = implemented, **✗** = explicitly returns false/unsupported,
**—** = not implemented (orchestrator uses default behaviour)

---

## Conventions and Special Cases

### Return values

- Identity functions (`driver_name`, `driver_display_name`, `driver_cli_binary`,
  `driver_min_version`) return values via `echo`.
- Boolean functions (`driver_check_available`, `driver_supports_*`) return via
  exit code: 0 = true, 1 = false.
- Builder functions (`driver_build_command`, `driver_prepare_live_command`) set
  global arrays instead of returning values.

### Windows support (cursor.sh)

The cursor driver resolves the CLI binary across multiple naming conventions
(`cursor-agent`, `cursor-agent.cmd`, `agent`, `agent.cmd`) and falls back to
`LOCALAPPDATA` paths. When a `.cmd` binary is detected, the command is wrapped
via `cursor-agent-wrapper.sh` so that GNU `timeout` works correctly.

On Windows, `driver_build_command` generates a bootstrap prompt that instructs
the agent to read workspace files directly, since passing large prompt content
via `-p` can be unreliable.

### Permission models

Only `claude-code` uses the `--allowedTools` and `--permission-mode` flags.
All other drivers rely on their native permission/sandbox models and ignore
`ALLOWED_TOOLS` from `.ralphrc`.

### Adding a new driver

1. Create `ralph/drivers/<name>.sh`
2. Implement all 9 required functions
3. Optionally implement session and live output functions
4. Register the driver in the platform registry (`src/platform/`)
