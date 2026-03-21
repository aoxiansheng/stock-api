#!/usr/bin/env bash
set -euo pipefail

# 分时图 WS 主链路包装脚本
# 按消费指南执行：
#   snapshot -> WS subscribe -> unsubscribe -> delta 补洞 -> release

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="${SCRIPT_DIR}/test-chart-intraday-unified-protocol.js"

ARGS=()

if [[ -n "${BASE_URL:-}" ]]; then
  ARGS+=(--base-url "${BASE_URL}")
fi
if [[ -n "${API_PREFIX:-}" ]]; then
  ARGS+=(--api-prefix "${API_PREFIX}")
fi
if [[ -n "${TIMEOUT_MS:-}" ]]; then
  ARGS+=(--timeout-ms "${TIMEOUT_MS}")
fi

ARGS+=(--symbol "${SYMBOL:-AAPL.US}")

if [[ -n "${MARKET:-}" ]]; then
  ARGS+=(--market "${MARKET}")
fi
if [[ -n "${TRADING_DAY:-}" ]]; then
  ARGS+=(--trading-day "${TRADING_DAY}")
fi
if [[ -n "${PROVIDER:-}" ]]; then
  ARGS+=(--provider "${PROVIDER}")
fi

ARGS+=(--point-limit "${POINT_LIMIT:-30000}")
ARGS+=(--delta-limit "${DELTA_LIMIT:-2000}")
ARGS+=(--min-ws-points "${MIN_CHART_POINT_COUNT:-1}")
ARGS+=(--ws-timeout-ms "${WS_TIMEOUT_MS:-${TIMEOUT_MS:-45000}}")
ARGS+=(--unsubscribe-timeout-ms "${UNSUBSCRIBE_TIMEOUT_MS:-5000}")
ARGS+=(--post-unsubscribe-observe-ms "${POST_UNSUBSCRIBE_OBSERVE_MS:-1500}")
ARGS+=(--allow-empty "$( [[ "${ALLOW_EMPTY_SNAPSHOT:-0}" =~ ^(1|true|TRUE|yes|YES)$ ]] && echo true || echo false )")
if [[ -n "${OUTPUT_FILE:-}" ]]; then
  ARGS+=(--output-file "${OUTPUT_FILE}")
fi

if [[ "${SKIP_WS:-0}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
  ARGS+=(--skip-ws true)
fi

exec node "${TARGET_SCRIPT}" "${ARGS[@]}"
