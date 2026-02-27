#!/usr/bin/env bats
# Tests for ralph/ralph_loop.sh
# Validates pure logic functions: load_ralphrc, can_make_call,
# validate_allowed_tools, build_loop_context, generate_session_id,
# check_claude_version, init_claude_session.

setup() {
    load 'test_helper/common-setup'
    _common_setup

    # Save the temp RALPH_DIR created by _common_setup before sourcing.
    local temp_ralph_dir="$RALPH_DIR"

    # Source ralph_loop.sh to load function definitions.
    # The source guard (BASH_SOURCE[0] == $0) prevents main() from running.
    # Side effects: set -e, library sourcing, variable init, mkdir on ".ralph/".
    # We must re-set path variables AFTER sourcing because the script
    # unconditionally assigns RALPH_DIR=".ralph" and derives paths from it.
    source "$PROJECT_ROOT/ralph/ralph_loop.sh"

    # Restore temp dir and re-derive all path variables for test isolation.
    RALPH_DIR="$temp_ralph_dir"
    export RALPH_DIR
    LOG_DIR="$RALPH_DIR/logs"
    DOCS_DIR="$RALPH_DIR/docs/generated"
    STATUS_FILE="$RALPH_DIR/status.json"
    PROGRESS_FILE="$RALPH_DIR/progress.json"
    CALL_COUNT_FILE="$RALPH_DIR/.call_count"
    TIMESTAMP_FILE="$RALPH_DIR/.last_reset"
    EXIT_SIGNALS_FILE="$RALPH_DIR/.exit_signals"
    RESPONSE_ANALYSIS_FILE="$RALPH_DIR/.response_analysis"
    CLAUDE_SESSION_FILE="$RALPH_DIR/.claude_session_id"
    RALPH_SESSION_FILE="$RALPH_DIR/.ralph_session"
    RALPH_SESSION_HISTORY_FILE="$RALPH_DIR/.ralph_session_history"
    RALPHRC_FILE="$RALPH_DIR/.ralphrc"
    LIVE_LOG_FILE="$RALPH_DIR/live.log"

    # Reset defaults after sourcing (sourcing captures env state in _env_ vars)
    MAX_CALLS_PER_HOUR=100
    CLAUDE_TIMEOUT_MINUTES=15
    CLAUDE_OUTPUT_FORMAT="json"
    CLAUDE_ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"
    CLAUDE_USE_CONTINUE="true"
    CLAUDE_SESSION_EXPIRY_HOURS=24
    VERBOSE_PROGRESS="false"
    CLAUDE_MIN_VERSION="2.0.76"
    CLAUDE_CODE_CMD="claude"
    PLATFORM_DRIVER="claude-code"
    RALPHRC_LOADED=false

    # Clear _env_ prefixed vars so .ralphrc overrides are not blocked
    _env_MAX_CALLS_PER_HOUR=""
    _env_CLAUDE_TIMEOUT_MINUTES=""
    _env_CLAUDE_OUTPUT_FORMAT=""
    _env_CLAUDE_ALLOWED_TOOLS=""
    _env_CLAUDE_USE_CONTINUE=""
    _env_CLAUDE_SESSION_EXPIRY_HOURS=""
    _env_VERBOSE_PROGRESS=""
    _env_CB_COOLDOWN_MINUTES=""
    _env_CB_AUTO_RESET=""

    mkdir -p "$RALPH_DIR/logs" "$RALPH_DIR/docs/generated"
}

teardown() {
    _common_teardown
}

# ===========================================================================
# load_ralphrc
# ===========================================================================

@test "load_ralphrc returns 0 when no .ralphrc file exists" {
    run load_ralphrc
    assert_success
}

@test "load_ralphrc sets RALPHRC_LOADED=true when file exists" {
    echo 'MAX_CALLS_PER_HOUR=50' > "$RALPHRC_FILE"
    load_ralphrc
    assert_equal "$RALPHRC_LOADED" "true"
}

@test "load_ralphrc applies .ralphrc overrides" {
    echo 'MAX_CALLS_PER_HOUR=42' > "$RALPHRC_FILE"
    load_ralphrc
    assert_equal "$MAX_CALLS_PER_HOUR" "42"
}

@test "load_ralphrc: env vars take precedence over .ralphrc" {
    echo 'MAX_CALLS_PER_HOUR=42' > "$RALPHRC_FILE"
    _env_MAX_CALLS_PER_HOUR="200"
    MAX_CALLS_PER_HOUR="200"
    load_ralphrc
    assert_equal "$MAX_CALLS_PER_HOUR" "200"
}

# ===========================================================================
# can_make_call
# ===========================================================================

@test "can_make_call returns 0 when under limit" {
    echo "5" > "$CALL_COUNT_FILE"
    run can_make_call
    assert_success
}

@test "can_make_call returns 1 when at limit" {
    echo "$MAX_CALLS_PER_HOUR" > "$CALL_COUNT_FILE"
    run can_make_call
    assert_failure
}

@test "can_make_call returns 0 when count file missing" {
    rm -f "$CALL_COUNT_FILE"
    run can_make_call
    assert_success
}

# ===========================================================================
# validate_allowed_tools
# ===========================================================================

@test "validate_allowed_tools accepts empty input" {
    run validate_allowed_tools ""
    assert_success
}

@test "validate_allowed_tools accepts valid tools" {
    run validate_allowed_tools "Write,Read,Edit"
    assert_success
}

@test "validate_allowed_tools rejects invalid tools" {
    run validate_allowed_tools "Write,InvalidTool,Read"
    assert_failure
    assert_output --partial "Invalid tool"
}

@test "validate_allowed_tools accepts Bash with any parenthesized content" {
    run validate_allowed_tools "Bash(docker compose *),Write"
    assert_success
}

# ===========================================================================
# build_loop_context
# ===========================================================================

@test "build_loop_context includes loop number" {
    run build_loop_context 7
    assert_success
    assert_output --partial "Loop #7"
}

@test "build_loop_context includes remaining task count" {
    cat > "$RALPH_DIR/@fix_plan.md" << 'EOF'
- [ ] First incomplete task
- [x] Completed task
- [ ] Second incomplete task
EOF
    run build_loop_context 3
    assert_success
    assert_output --partial "Remaining tasks: 2"
}

@test "build_loop_context truncates to 500 characters" {
    run build_loop_context 1
    assert_success
    local len=${#output}
    [[ $len -le 500 ]]
}

# ===========================================================================
# generate_session_id
# ===========================================================================

@test "generate_session_id produces ralph- prefix" {
    run generate_session_id
    assert_success
    assert_output --regexp '^ralph-[0-9]+-[0-9]+$'
}

@test "generate_session_id produces unique values" {
    local id1 id2
    id1=$(generate_session_id)
    id2=$(generate_session_id)
    [[ "$id1" != "$id2" ]] || {
        # Very unlikely but possible with same timestamp+RANDOM
        # Try once more
        id2=$(generate_session_id)
        [[ "$id1" != "$id2" ]]
    }
}

# ===========================================================================
# check_claude_version
# ===========================================================================

@test "check_claude_version: above minimum returns success" {
    _mock_cli claude 0 "claude v3.0.0"
    CLAUDE_CODE_CMD="claude"
    run check_claude_version
    assert_success
}

@test "check_claude_version: below minimum returns failure" {
    _mock_cli claude 0 "claude v1.0.0"
    CLAUDE_CODE_CMD="claude"
    run check_claude_version
    assert_failure
}

@test "check_claude_version: missing binary returns success with warning" {
    CLAUDE_CODE_CMD="nonexistent_claude_binary_xyz"
    run check_claude_version
    assert_success
}

# ===========================================================================
# init_claude_session
# ===========================================================================

@test "init_claude_session: returns empty when no session file" {
    rm -f "$CLAUDE_SESSION_FILE"
    run init_claude_session
    assert_success
    assert_output ""
}

@test "init_claude_session: returns session ID from valid file" {
    echo "session-abc-123" > "$CLAUDE_SESSION_FILE"
    # Touch the file to make it recent (not expired)
    touch "$CLAUDE_SESSION_FILE"
    run init_claude_session
    assert_success
    assert_output "session-abc-123"
}

@test "init_claude_session: returns empty for expired session" {
    echo "old-session-456" > "$CLAUDE_SESSION_FILE"
    CLAUDE_SESSION_EXPIRY_HOURS=0
    run init_claude_session
    assert_success
    assert_output ""
}

# ===========================================================================
# Tier 2 — Filesystem side effects
# ===========================================================================

# ===========================================================================
# init_call_tracking
# ===========================================================================

@test "init_call_tracking resets counter on new hour" {
    echo "2024010100" > "$TIMESTAMP_FILE"
    echo "50" > "$CALL_COUNT_FILE"
    init_call_tracking
    local count
    count=$(cat "$CALL_COUNT_FILE")
    [[ "$count" == "0" ]]
}

@test "init_call_tracking preserves counter for same hour" {
    local current_hour
    current_hour=$(date +%Y%m%d%H)
    echo "$current_hour" > "$TIMESTAMP_FILE"
    echo "25" > "$CALL_COUNT_FILE"
    init_call_tracking
    local count
    count=$(cat "$CALL_COUNT_FILE")
    [[ "$count" == "25" ]]
}

@test "init_call_tracking creates exit signals file if missing" {
    rm -f "$EXIT_SIGNALS_FILE"
    init_call_tracking
    [[ -f "$EXIT_SIGNALS_FILE" ]]
    # Should contain valid JSON
    jq empty "$EXIT_SIGNALS_FILE"
}

# ===========================================================================
# update_status
# ===========================================================================

@test "update_status creates valid JSON status file" {
    update_status 5 10 "executing_loop" "running"
    [[ -f "$STATUS_FILE" ]]
    jq empty "$STATUS_FILE"
    local status
    status=$(jq -r '.status' "$STATUS_FILE")
    assert_equal "$status" "running"
}

@test "update_status includes loop count and calls" {
    update_status 12 45 "analyzing_response" "running"
    local loop_count
    loop_count=$(jq -r '.loop_count' "$STATUS_FILE")
    assert_equal "$loop_count" "12"
    local calls
    calls=$(jq -r '.calls_made_this_hour' "$STATUS_FILE")
    assert_equal "$calls" "45"
}

# ===========================================================================
# save_claude_session
# ===========================================================================

@test "save_claude_session extracts session ID from JSON output" {
    local output_file="$RALPH_DIR/test_output.json"
    echo '{"metadata": {"session_id": "ses-abc-123"}}' > "$output_file"
    save_claude_session "$output_file"
    local saved
    saved=$(cat "$CLAUDE_SESSION_FILE")
    assert_equal "$saved" "ses-abc-123"
}

@test "save_claude_session does nothing when output file missing" {
    rm -f "$CLAUDE_SESSION_FILE"
    save_claude_session "$RALPH_DIR/nonexistent.json"
    [[ ! -f "$CLAUDE_SESSION_FILE" ]]
}

# ===========================================================================
# reset_session
# ===========================================================================

@test "reset_session clears Claude session file" {
    echo "old-session" > "$CLAUDE_SESSION_FILE"
    reset_session "test_reset"
    [[ ! -f "$CLAUDE_SESSION_FILE" ]]
}

@test "reset_session resets exit signals to empty arrays" {
    echo '{"test_only_loops": [1,2], "done_signals": [3], "completion_indicators": [4]}' > "$EXIT_SIGNALS_FILE"
    reset_session "test_reset"
    local test_loops
    test_loops=$(jq '.test_only_loops | length' "$EXIT_SIGNALS_FILE")
    assert_equal "$test_loops" "0"
}

@test "reset_session writes reason to session file" {
    reset_session "circuit_breaker_open"
    [[ -f "$RALPH_SESSION_FILE" ]]
    local reason
    reason=$(jq -r '.reset_reason' "$RALPH_SESSION_FILE")
    assert_equal "$reason" "circuit_breaker_open"
}

# ===========================================================================
# log_session_transition
# ===========================================================================

@test "log_session_transition creates history file on first call" {
    rm -f "$RALPH_SESSION_HISTORY_FILE"
    log_session_transition "active" "reset" "test_reason" 5
    [[ -f "$RALPH_SESSION_HISTORY_FILE" ]]
    local count
    count=$(jq 'length' "$RALPH_SESSION_HISTORY_FILE")
    assert_equal "$count" "1"
}

@test "log_session_transition appends to existing history" {
    echo '[{"timestamp": "2024-01-01T00:00:00", "from_state": "init", "to_state": "active", "reason": "start", "loop_number": 0}]' > "$RALPH_SESSION_HISTORY_FILE"
    log_session_transition "active" "reset" "another_reason" 10
    local count
    count=$(jq 'length' "$RALPH_SESSION_HISTORY_FILE")
    assert_equal "$count" "2"
}

@test "log_session_transition caps history at 50 entries" {
    # Create 50 existing entries
    local entries='['
    for i in $(seq 1 50); do
        [[ $i -gt 1 ]] && entries+=','
        entries+="{\"timestamp\":\"t\",\"from_state\":\"a\",\"to_state\":\"b\",\"reason\":\"r\",\"loop_number\":$i}"
    done
    entries+=']'
    echo "$entries" > "$RALPH_SESSION_HISTORY_FILE"

    log_session_transition "active" "reset" "overflow" 51
    local count
    count=$(jq 'length' "$RALPH_SESSION_HISTORY_FILE")
    assert_equal "$count" "50"
}

# ===========================================================================
# Tier 3 — External dependencies
# ===========================================================================

# ===========================================================================
# load_platform_driver
# ===========================================================================

@test "load_platform_driver: loads claude-code driver and sets CLAUDE_CODE_CMD" {
    PLATFORM_DRIVER="claude-code"
    SCRIPT_DIR="$PROJECT_ROOT/ralph"
    load_platform_driver
    assert_equal "$CLAUDE_CODE_CMD" "claude"
}

@test "load_platform_driver: fails for non-existent driver" {
    PLATFORM_DRIVER="nonexistent-platform"
    SCRIPT_DIR="$PROJECT_ROOT/ralph"
    run load_platform_driver
    assert_failure
}

# ===========================================================================
# should_exit_gracefully
# ===========================================================================

@test "should_exit_gracefully returns empty when no signals" {
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"
    rm -f "$RESPONSE_ANALYSIS_FILE"
    rm -f "$RALPH_DIR/@fix_plan.md"
    local result
    result=$(should_exit_gracefully)
    assert_equal "$result" ""
}

@test "should_exit_gracefully detects permission_denied" {
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"
    _mock_response_analysis true false false 0
    local result
    result=$(should_exit_gracefully)
    assert_equal "$result" "permission_denied"
}

@test "should_exit_gracefully detects test_saturation" {
    echo '{"test_only_loops": [1,2,3], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"
    rm -f "$RESPONSE_ANALYSIS_FILE"
    local result
    result=$(should_exit_gracefully)
    assert_equal "$result" "test_saturation"
}

@test "should_exit_gracefully detects plan_complete" {
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"
    rm -f "$RESPONSE_ANALYSIS_FILE"
    cat > "$RALPH_DIR/@fix_plan.md" << 'PLAN'
- [x] First task done
- [x] Second task done
PLAN
    local result
    result=$(should_exit_gracefully)
    assert_equal "$result" "plan_complete"
}

@test "should_exit_gracefully: no exit when incomplete tasks remain" {
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"
    rm -f "$RESPONSE_ANALYSIS_FILE"
    cat > "$RALPH_DIR/@fix_plan.md" << 'PLAN'
- [x] Done task
- [ ] Still pending
PLAN
    local result
    result=$(should_exit_gracefully)
    assert_equal "$result" ""
}

# ===========================================================================
# execute_claude_code
# ===========================================================================

@test "execute_claude_code: success path increments call count" {
    _skip_if_xargs_broken
    echo "0" > "$CALL_COUNT_FILE"
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"

    # Create a mock claude that outputs valid JSON
    _mock_cli claude 0 '{"result": "ok", "metadata": {"session_id": "test-session"}}'
    CLAUDE_CODE_CMD="claude"
    CLAUDE_USE_CONTINUE="false"
    LIVE_OUTPUT=false

    # Create minimal prompt file
    echo "Test prompt" > "$RALPH_DIR/PROMPT.md"
    PROMPT_FILE="$RALPH_DIR/PROMPT.md"

    # Load the real driver so driver_build_command is available
    SCRIPT_DIR="$PROJECT_ROOT/ralph"
    PLATFORM_DRIVER="claude-code"
    load_platform_driver

    run execute_claude_code 1
    # Check call count was incremented
    local count
    count=$(cat "$CALL_COUNT_FILE" 2>/dev/null || echo "0")
    [[ "$count" -ge 1 ]]
}

@test "execute_claude_code: API limit returns exit code 2" {
    _skip_if_xargs_broken
    echo "0" > "$CALL_COUNT_FILE"
    echo '{"test_only_loops": [], "done_signals": [], "completion_indicators": []}' > "$EXIT_SIGNALS_FILE"

    # Create a mock claude that fails with limit message
    _mock_cli claude 1 "Error: 5 hour usage limit reached. Please try back later."
    CLAUDE_CODE_CMD="claude"
    CLAUDE_USE_CONTINUE="false"
    LIVE_OUTPUT=false

    echo "Test prompt" > "$RALPH_DIR/PROMPT.md"
    PROMPT_FILE="$RALPH_DIR/PROMPT.md"

    # Load the real driver so driver_build_command is available
    SCRIPT_DIR="$PROJECT_ROOT/ralph"
    PLATFORM_DRIVER="claude-code"
    load_platform_driver

    run execute_claude_code 1
    assert_equal "$status" "2"
}
