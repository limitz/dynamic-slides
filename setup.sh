#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing slide-engine dependencies..."
cd "$DIR/slide-engine" && npm install

echo "Installing slide-viewer dependencies..."
cd "$DIR/slide-viewer" && npm install

echo "Done. Start with:"
echo "  cd $DIR && npm run dev"
