#!/bin/bash
# Run this after every `npx expo prebuild --clean --platform ios`
# 1. Adds the native Swift App Clip target
# 2. Patches main app entitlements

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Post-Prebuild: Adding Swift App Clip ==="
ruby "$SCRIPT_DIR/add-app-clip-target.rb"

echo "=== Done ==="
