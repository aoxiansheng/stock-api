#!/usr/bin/env bash
set -euo pipefail

# Crypto 分时图当前复用统一的 /api/v1/chart/intraday-line/* 路由。
# 本脚本只负责注入 crypto 默认参数，并转调通用分时图 HTTP 测试脚本。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SYMBOL="${SYMBOL:-BTCUSDT.CRYPTO}"
export MARKET="${MARKET:-CRYPTO}"
export PROVIDER="${PROVIDER:-infoway}"
export SNAPSHOT_ENDPOINT="${SNAPSHOT_ENDPOINT:-/api/v1/chart/intraday-line/snapshot}"
export DELTA_ENDPOINT="${DELTA_ENDPOINT:-/api/v1/chart/intraday-line/delta}"
export OUTPUT_DIR="${OUTPUT_DIR:-/tmp/crypto-intraday-line-test}"

exec bash "${SCRIPT_DIR}/test-chart-intraday-line-endpoint.sh"
