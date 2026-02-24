#!/usr/bin/env bash
# Install bats-core test helpers for local development
# CI installs these automatically; this script is for local dev convenience.
#
# Usage: bash scripts/setup-bats.sh
#
# Prerequisites: bats-core must be installed separately:
#   macOS:  brew install bats-core
#   Ubuntu: sudo apt-get install bats

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HELPER_DIR="$PROJECT_ROOT/tests/bash/test_helper"

install_helper() {
    local name=$1
    local repo="https://github.com/bats-core/$name.git"
    local dest="$HELPER_DIR/$name"

    if [[ -d "$dest" ]]; then
        echo "  $name already installed"
        return
    fi

    echo "  Installing $name..."
    git clone --depth 1 "$repo" "$dest"
}

echo "Installing bats helpers into $HELPER_DIR"
mkdir -p "$HELPER_DIR"

install_helper "bats-support"
install_helper "bats-assert"

echo ""
echo "Done. Run bash tests with: npm run test:bash"
