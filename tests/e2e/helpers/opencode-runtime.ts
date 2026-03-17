import { spawnSync } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { resolveBashCommand } from "../../../src/run/ralph-process.js";

export async function setupOpencodeRunEnv(projectPath: string): Promise<Record<string, string>> {
  const binDir = await setupOpencodeRuntime(projectPath, buildOpencodeRunStub(projectPath));
  return { PATH: buildPathWithBin(binDir) };
}

async function setupOpencodeRuntime(projectPath: string, opencodeContent: string): Promise<string> {
  const binDir = join(projectPath, ".test-bin");
  await mkdir(binDir, { recursive: true });

  await writeExecutable(join(binDir, "jq"), buildJqShimContent(await resolveJqBinary(projectPath)));
  await writeExecutable(join(binDir, "opencode"), opencodeContent);

  return binDir;
}

function buildPathWithBin(binDir: string): string {
  return [binDir, process.env.PATH ?? ""].filter(Boolean).join(delimiter);
}

async function resolveJqBinary(projectPath: string): Promise<string> {
  const bashCommand = await resolveBashCommand();
  const locator = spawnSync(bashCommand, ["-lc", "command -v jq"], {
    cwd: projectPath,
    encoding: "utf8",
    windowsHide: true,
  });

  if (locator.status !== 0) {
    throw new Error("jq is required for OpenCode e2e tests");
  }

  const jqPath = locator.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!jqPath) {
    throw new Error("Unable to resolve jq path for OpenCode e2e tests");
  }

  return jqPath;
}

function buildJqShimContent(realJqPath: string): string {
  return `#!/usr/bin/env bash
exec '${escapeForSingleQuotedBash(realJqPath)}' "$@"
`;
}

function buildOpencodeRunStub(projectPath: string): string {
  const callLogPath = join(projectPath, ".opencode.calls.log").replaceAll("\\", "/");
  const counterPath = join(projectPath, ".opencode.count").replaceAll("\\", "/");

  return `#!/usr/bin/env bash
set -euo pipefail

CALL_LOG='${escapeForSingleQuotedBash(callLogPath)}'
COUNTER_FILE='${escapeForSingleQuotedBash(counterPath)}'

printf '%s|%s\\n' "\${1:-}" "$*" >> "$CALL_LOG"

if [[ "\${1:-}" == "session" && "\${2:-}" == "list" ]]; then
  cat <<'EOF'
[{"id":"opencode-session-123"}]
EOF
  exit 0
fi

if [[ "\${1:-}" != "run" ]]; then
  echo "unexpected opencode invocation: $*" >&2
  exit 1
fi

count=0
if [[ -f "$COUNTER_FILE" ]]; then
  count=$(cat "$COUNTER_FILE")
fi
count=$((count + 1))
printf '%s' "$count" > "$COUNTER_FILE"

if [[ "$count" -eq 1 ]]; then
  if printf '%s' "$*" | grep -q -- '--continue'; then
    echo "unexpected --continue on first OpenCode call" >&2
    exit 1
  fi
  if printf '%s' "$*" | grep -q -- '--session'; then
    echo "unexpected --session on first OpenCode call" >&2
    exit 1
  fi
  cat <<'EOF'
{"type":"session.created","session":{"id":"opencode-session-123"}}
{"type":"message.updated","message":{"role":"assistant","parts":[{"type":"text","text":"Completed the initial OpenCode run.\\n\\n---RALPH_STATUS---\\nSTATUS: COMPLETE\\nEXIT_SIGNAL: true\\n---END_RALPH_STATUS---"}]}}
EOF
  exit 0
fi

if ! printf '%s' "$*" | grep -q -- '--continue'; then
  echo "expected --continue on resumed OpenCode call" >&2
  exit 1
fi

if ! printf '%s' "$*" | grep -q -- '--session opencode-session-123'; then
  echo "expected --session opencode-session-123 on resumed OpenCode call" >&2
  exit 1
fi

cat <<'EOF'
{"type":"session.updated","session":{"id":"opencode-session-123"}}
{"type":"message.updated","message":{"role":"assistant","parts":[{"type":"text","text":"Completed the follow-up OpenCode run.\\n\\n---RALPH_STATUS---\\nSTATUS: COMPLETE\\nEXIT_SIGNAL: true\\n---END_RALPH_STATUS---"}]}}
EOF
`;
}

async function writeExecutable(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf-8");
  await chmod(path, 0o755);
}

function escapeForSingleQuotedBash(value: string): string {
  return value.replaceAll("'", `'"'"'`);
}
