#!/bin/bash

################################################################################
# Expo Project Structure Generator
#
# Creates an industry-standard modular folder structure for Expo/React Native.
# Folders only — tracked with .gitkeep. No dummy files.
#
# Usage:
#   bash structure.sh                  # runs from cwd
#   bash structure.sh <project-dir>    # runs inside the given directory
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }

################################################################################
# Resolve target directory
################################################################################

TARGET_DIR="${1:-$(pwd)}"

if [ ! -d "$TARGET_DIR" ]; then
    print_error "Directory not found: $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR"

if [ ! -f "package.json" ]; then
    print_error "No package.json found in $TARGET_DIR. Are you in an Expo project?"
    exit 1
fi

print_header "Scaffolding Project Structure"
print_info "Target: $(pwd)"

################################################################################
# Helper — create folder and track with .gitkeep
################################################################################

mk() {
    mkdir -p "$1"
    touch "$1/.gitkeep"
}

################################################################################
# src/app — expo-router file-based routing (single app dir, lives inside src)
################################################################################

mk src/app
mk src/app/"(auth)"
mk src/app/"(tabs)"
mk src/app/"(screens)"
mk src/app/"(modals)"

################################################################################
# src/components
################################################################################

mk src/components/common
mk src/components/ui
mk src/components/layout
mk src/components/forms
mk src/components/modals

################################################################################
# src/hooks
################################################################################

mk src/hooks

################################################################################
# src/store — Zustand slices
################################################################################

mk src/store

################################################################################
# src/services
################################################################################

mk src/services/api
mk src/services/auth
mk src/services/storage
mk src/services/notifications
mk src/services/analytics

################################################################################
# src/utils
################################################################################

mk src/utils

################################################################################
# src/constants
################################################################################

mk src/constants

################################################################################
# src/types
################################################################################

mk src/types

################################################################################
# src/config
################################################################################

mk src/config

################################################################################
# src/errors
################################################################################

mk src/errors

################################################################################
# src/assets
################################################################################

mk src/assets/fonts
mk src/assets/images
mk src/assets/icons
mk src/assets/animations

################################################################################
# Root-level supporting dirs (if not already present)
################################################################################

[ ! -d "__tests__" ] && mk __tests__
[ ! -d "scripts" ]   && mk scripts

################################################################################
# Summary
################################################################################

print_header "Structure Created ✓"

echo -e "${BLUE}src/${NC}"
echo "  ├── app/"
echo "  │   ├── (auth)/            ← auth route group"
echo "  │   ├── (tabs)/            ← bottom tab route group"
echo "  │   ├── (screens)/         ← stack screens"
echo "  │   └── (modals)/          ← modal screens"
echo "  ├── components/"
echo "  │   ├── common/            ← shared across features"
echo "  │   ├── ui/                ← design-system primitives"
echo "  │   ├── layout/            ← wrappers & containers"
echo "  │   ├── forms/             ← inputs & field components"
echo "  │   └── modals/            ← modal components"
echo "  ├── hooks/                 ← shared custom hooks"
echo "  ├── store/                 ← Zustand state slices"
echo "  ├── services/"
echo "  │   ├── api/               ← Axios client & endpoints"
echo "  │   ├── auth/              ← authentication logic"
echo "  │   ├── storage/           ← SecureStore / AsyncStorage"
echo "  │   ├── notifications/     ← push notification handlers"
echo "  │   └── analytics/         ← analytics & tracking"
echo "  ├── utils/                 ← formatters, validators, helpers"
echo "  ├── constants/             ← colors, typography, spacing, routes"
echo "  ├── types/                 ← shared TypeScript interfaces"
echo "  ├── config/                ← typed env & feature flags"
echo "  ├── errors/                ← error classes & boundaries"
echo "  └── assets/"
echo "      ├── fonts/"
echo "      ├── images/"
echo "      ├── icons/"
echo "      └── animations/"
echo ""

print_success "All folders ready. Start adding your files!"
echo ""

