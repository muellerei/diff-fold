#!/bin/sh
# Rebuilds the generated pictures in docs/images/ (banner, fold).
set -e
cd "$(dirname "$0")"
for g in banner fold; do python3 "$g.py"; done
