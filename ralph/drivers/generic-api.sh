#!/bin/bash
# Generic API Driver for Ralph Loop
# Calls LLM APIs directly via curl — no CLI tool required.
# Used as a fallback when primary CLI drivers are rate-limited or unavailable.
#
# Supported providers (via GENERIC_API_PROVIDER env var):
#   - openai (default): Uses OpenAI Chat Completions API
#   - minimax: Uses Minimax Chat API
#
# Required env vars:
#   - OPENAI_API_KEY (for openai provider)
#   - MINIMAX_API_KEY (for minimax provider)
#
# Optional env vars:
#   - GENERIC_API_PROVIDER: "openai" or "minimax" (default: openai)
#   - GENERIC_API_MODEL: Model name override
#   - GENERIC_API_BASE_URL: API base URL override
#   - GENERIC_API_MAX_TOKENS: Max output tokens (default: 16384)

GENERIC_API_PROVIDER="${GENERIC_API_PROVIDER:-openai}"
GENERIC_API_MAX_TOKENS="${GENERIC_API_MAX_TOKENS:-16384}"

_get_api_config() {
    case "$GENERIC_API_PROVIDER" in
        openai)
            GENERIC_API_KEY="${OPENAI_API_KEY:-}"
            GENERIC_API_MODEL="${GENERIC_API_MODEL:-gpt-4o}"
            GENERIC_API_BASE_URL="${GENERIC_API_BASE_URL:-https://api.openai.com/v1}"
            ;;
        minimax)
            GENERIC_API_KEY="${MINIMAX_API_KEY:-}"
            GENERIC_API_MODEL="${GENERIC_API_MODEL:-MiniMax-Text-01}"
            GENERIC_API_BASE_URL="${GENERIC_API_BASE_URL:-https://api.minimax.chat/v1}"
            ;;
        *)
            log_status "ERROR" "Unknown GENERIC_API_PROVIDER: $GENERIC_API_PROVIDER"
            return 1
            ;;
    esac
}

driver_name() {
    echo "generic-api"
}

driver_display_name() {
    echo "Generic API ($GENERIC_API_PROVIDER)"
}

driver_cli_binary() {
    echo "curl"
}

driver_check_available() {
    _get_api_config || return 1
    if [[ -z "$GENERIC_API_KEY" ]]; then
        log_status "ERROR" "No API key set for $GENERIC_API_PROVIDER provider"
        return 1
    fi
    command -v curl &>/dev/null && command -v python3 &>/dev/null
}

driver_valid_tools() {
    # Generic API driver doesn't use tool allowlists
    VALID_TOOL_PATTERNS=()
}

driver_supports_tool_allowlist() {
    return 1  # false
}

driver_supports_sessions() {
    return 1  # false — no session continuity via API
}

driver_supports_live_output() {
    return 1  # false
}

driver_build_command() {
    local prompt_file="$1"
    local loop_context="${2:-}"
    local session_id="${3:-}"

    _get_api_config || return 1

    if [[ -z "$GENERIC_API_KEY" ]]; then
        log_status "ERROR" "No API key for $GENERIC_API_PROVIDER. Set ${GENERIC_API_PROVIDER^^}_API_KEY"
        return 1
    fi

    # Read the prompt
    local prompt=""
    if [[ -f "$prompt_file" ]]; then
        prompt=$(cat "$prompt_file")
    fi

    # Append loop context if provided
    if [[ -n "$loop_context" ]]; then
        prompt="$prompt

---
## Loop Context
$loop_context"
    fi

    # Escape for JSON
    local escaped_prompt
    escaped_prompt=$(printf '%s' "$prompt" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

    # Build the API request
    local request_body
    request_body=$(cat <<APIJSON
{
    "model": "$GENERIC_API_MODEL",
    "max_tokens": $GENERIC_API_MAX_TOKENS,
    "messages": [
        {"role": "user", "content": $escaped_prompt}
    ]
}
APIJSON
)

    # Build curl command
    CLAUDE_CMD_ARGS=(
        curl -s -w "\n%{http_code}"
        -X POST "${GENERIC_API_BASE_URL}/chat/completions"
        -H "Content-Type: application/json"
        -H "Authorization: Bearer ${GENERIC_API_KEY}"
        -d "$request_body"
    )
}

driver_permission_denial_help() {
    echo "Generic API driver does not require permission configuration."
    echo "Ensure your API key has sufficient permissions and quota."
}
