#!/usr/bin/env bash

set -euo pipefail

if ! command -v nova-expo >/dev/null 2>&1; then
  echo "Nova Expo is not installed globally yet."
  echo ""
  echo "Run this once from the initializer repository:"
  echo "  npm install --global ."
  echo ""
  exit 1
fi

exec nova-expo --interactive "$@"
