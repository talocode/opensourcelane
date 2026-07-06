#!/usr/bin/env bash
set -euo pipefail
VERSION="${VERSION:-0.1.0}"
REPO="${REPO:-talocode/opensourcelane}"

echo "OpenSourceLane installer v${VERSION}"
echo "Installing via npm (Node.js launcher)..."

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required. Install Node.js 18+ first."
  exit 1
fi

npm install -g "@talocode/opensourcelane@${VERSION}"
echo "Installed. Run: opensourcelane --help"
echo "Sponsor: https://github.com/sponsors/Abdulmuiz44"