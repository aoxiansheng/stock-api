#!/usr/bin/env bash
set -euo pipefail

# 分时图 HTTP-only 回归包装脚本
# 按消费指南执行：
#   snapshot -> delta -> release

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="${SCRIPT_DIR}/test-chart-intraday-api-contract.js"

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
ARGS+=(--allow-empty-snapshot "$( [[ "${ALLOW_EMPTY_SNAPSHOT:-0}" =~ ^(1|true|TRUE|yes|YES)$ ]] && echo true || echo false )")
ARGS+=(--require-reference "$( [[ "${REQUIRE_REFERENCE:-0}" =~ ^(1|true|TRUE|yes|YES)$ ]] && echo true || echo false )")
ARGS+=(--negative-tests "$( [[ "${NEGATIVE_TESTS:-1}" =~ ^(0|false|FALSE|no|NO)$ ]] && echo false || echo true )")
if [[ -n "${OUTPUT_FILE:-}" ]]; then
  ARGS+=(--output-file "${OUTPUT_FILE}")
fi

exec node "${TARGET_SCRIPT}" "${ARGS[@]}"
