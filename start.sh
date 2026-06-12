#!/bin/bash
# Yotta Core - AI Tech Control Dashboard
# En terminal, en ukaz

set -e

cd "$(dirname "$0")"

# Load .env if exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "🚀 Yotta Core - AI Tech Control"
echo ""

# Check dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  bun install
fi

echo "📊 Starting backend..."
echo "   Dashboard: http://localhost:${PORT:-3100}/admin/"
echo "   Geslo: ${AITECH_CONTROL_PASSWORD:-admin123}"
echo ""

node src/serve.mjs
