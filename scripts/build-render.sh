#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python -m pip install -r backend/requirements.txt
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
