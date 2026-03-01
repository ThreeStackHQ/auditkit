#!/usr/bin/env bash
set -e
mkdir -p dist
esbuild src/index.ts --bundle --outfile=dist/widget.js --minify --target=es2018
echo "Widget built to dist/widget.js"
