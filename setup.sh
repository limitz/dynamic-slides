#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing slide-engine dependencies..."
cd "$DIR/slide-engine" && npm install

echo "Installing slide-viewer dependencies..."
cd "$DIR/slide-viewer" && npm install

echo "Done."
echo "To start a presentation, copy a template to your project dir:"
echo "  cp -r $DIR/templates/default/* /path/to/your/project/"
echo "Then run from your project dir:"
echo "  SKILL_DIR=$DIR SCRIPT=/path/to/your/project/script.md node $DIR/slide-engine/index.js &"
echo "  SKILL_DIR=$DIR npx vite"
