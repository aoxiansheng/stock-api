#!/usr/bin/env bash
set -euo pipefail

# 用法示例：
# APP_KEY=xxx ACCESS_TOKEN=yyy \
# BASE_URL="http://127.0.0.1:3001" SYMBOL="AAPL.US" PROVIDER="infoway" \
# bash scripts/tools/local-project/test-chart-intraday-line-endpoint.sh
#
# 或使用 JWT：
# AUTH_BEARER="eyJ..." bash scripts/tools/local-project/test-chart-intraday-line-endpoint.sh
#
# 可选参数：
# MARKET=US TRADING_DAY=20260308 POINT_LIMIT=30000 DELTA_LIMIT=2000 NEGATIVE_TESTS=1
# MIN_DELTA_UPDATES=50 DELTA_POLL_ATTEMPTS=60 DELTA_POLL_INTERVAL_SECONDS=1
# SNAPSHOT_PREWARM_ATTEMPTS=8 SNAPSHOT_PREWARM_INTERVAL_SECONDS=1
# AUTO_START_WS_FEED=1 REQUIRE_REALTIME_PREWARM=1

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
SNAPSHOT_ENDPOINT="${SNAPSHOT_ENDPOINT:-/api/v1/chart/intraday-line/snapshot}"
DELTA_ENDPOINT="${DELTA_ENDPOINT:-/api/v1/chart/intraday-line/delta}"

SYMBOL="${SYMBOL:-AAPL.US}"
MARKET="${MARKET:-}"
TRADING_DAY="${TRADING_DAY:-}"
PROVIDER="${PROVIDER:-infoway}"
POINT_LIMIT="${POINT_LIMIT:-30000}"
DELTA_LIMIT="${DELTA_LIMIT:-2000}"
NEGATIVE_TESTS="${NEGATIVE_TESTS:-1}"
STRICT_MISMATCH_PROVIDER="${STRICT_MISMATCH_PROVIDER:-longport}"
MIN_DELTA_UPDATES="${MIN_DELTA_UPDATES:-50}"
MAX_DELTA_ATTEMPTS="${MAX_DELTA_ATTEMPTS:-60}"
DELTA_POLL_ATTEMPTS="${DELTA_POLL_ATTEMPTS:-${MAX_DELTA_ATTEMPTS}}"
DELTA_POLL_INTERVAL_SECONDS="${DELTA_POLL_INTERVAL_SECONDS:-1}"
SNAPSHOT_PREWARM_ATTEMPTS="${SNAPSHOT_PREWARM_ATTEMPTS:-8}"
SNAPSHOT_PREWARM_INTERVAL_SECONDS="${SNAPSHOT_PREWARM_INTERVAL_SECONDS:-1}"
REQUIRE_REALTIME_PREWARM="${REQUIRE_REALTIME_PREWARM:-1}"
AUTO_START_WS_FEED="${AUTO_START_WS_FEED:-1}"
WS_FEED_SCRIPT="${WS_FEED_SCRIPT:-scripts/tools/local-project/test-ws-latest-price.js}"
WS_FEED_MIN_TICK_COUNT="${WS_FEED_MIN_TICK_COUNT:-100000}"
WS_FEED_TIMEOUT_MS="${WS_FEED_TIMEOUT_MS:-180000}"
WS_FEED_BOOT_WAIT_SECONDS="${WS_FEED_BOOT_WAIT_SECONDS:-2}"

OUTPUT_DIR="${OUTPUT_DIR:-/tmp/chart-intraday-line-test}"
SNAPSHOT_FILE="${OUTPUT_DIR}/snapshot.json"
DELTA_FILE="${OUTPUT_DIR}/delta.json"
DELTA_LOOP_FILE="${OUTPUT_DIR}/delta-loop.json"
NEG_NO_CURSOR_FILE="${OUTPUT_DIR}/delta-no-cursor.json"
NEG_TAMPERED_CURSOR_FILE="${OUTPUT_DIR}/delta-tampered-cursor.json"
NEG_PROVIDER_MISMATCH_FILE="${OUTPUT_DIR}/delta-provider-mismatch.json"
NEG_SINCE_FILE="${OUTPUT_DIR}/delta-with-since.json"
NEG_INCLUDE_PREPOST_FILE="${OUTPUT_DIR}/snapshot-with-includePrePost.json"
WS_FEED_LOG_FILE="${OUTPUT_DIR}/ws-feed.log"

mkdir -p "${OUTPUT_DIR}"

fail() {
  echo "[FAIL] $1"
  exit 1
}

WS_FEED_PID=""
cleanup() {
  if [[ -n "${WS_FEED_PID}" ]]; then
    kill "${WS_FEED_PID}" >/dev/null 2>&1 || true
    wait "${WS_FEED_PID}" >/dev/null 2>&1 || true
    WS_FEED_PID=""
  fi
}
trap cleanup EXIT

section() {
  echo
  echo "== $1 =="
}

print_snapshot_price_trace() {
  local label="$1"
  local file="$2"
  local tail_count="${3:-10}"

  jq -r \
    --arg label "${label}" \
    --argjson tailCount "${tail_count}" \
    '
    (.data.line.points // []) as $points
    | ($points | length) as $total
    | ($points | if $total > $tailCount then .[-$tailCount:] else . end) as $display
    | "\($label)_points=\($total)",
      "\($label)_recent_prices=[" + ($display | map((.price // null) | tostring) | join(", ")) + "]",
      "\($label)_last_price=" + (if $total > 0 then (($points[-1].price // null) | tostring) else "null" end),
      "\($label)_last_timestamp=" + (if $total > 0 then ($points[-1].timestamp // "") else "" end)
    ' "${file}" 2>/dev/null || true
}

print_delta_price_trace() {
  local label="$1"
  local file="$2"

  jq -r \
    --arg label "${label}" \
    '
    (.data.delta.points // []) as $points
    | ($points | length) as $total
    | "\($label)_points=\($total)",
      "\($label)_prices=[" + ($points | map((.price // null) | tostring) | join(", ")) + "]",
      "\($label)_last_price=" + (if $total > 0 then (($points[-1].price // null) | tostring) else "null" end),
      "\($label)_last_timestamp=" + (if $total > 0 then ($points[-1].timestamp // "") else "" end)
    ' "${file}" 2>/dev/null || true
}

if ! command -v curl >/dev/null 2>&1; then
  fail "缺少 curl"
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "缺少 jq（本脚本依赖 jq 进行断言）"
fi

if [[ -z "${APP_KEY:-}" || -z "${ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${AUTH_BEARER:-}" ]]; then
    fail "缺少认证信息：请提供 APP_KEY+ACCESS_TOKEN，或 AUTH_BEARER"
  fi
fi

AUTH_HEADERS=()
if [[ -n "${APP_KEY:-}" && -n "${ACCESS_TOKEN:-}" ]]; then
  AUTH_HEADERS+=(-H "X-App-Key: ${APP_KEY}" -H "X-Access-Token: ${ACCESS_TOKEN}")
else
  AUTH_HEADERS+=(-H "Authorization: Bearer ${AUTH_BEARER}")
fi

normalize_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

# strictProviderConsistency 负例必须确保 provider 与 cursor 内 provider 不一致
if [[ "$(normalize_lower "${STRICT_MISMATCH_PROVIDER}")" == "$(normalize_lower "${PROVIDER}")" ]]; then
  if [[ "$(normalize_lower "${PROVIDER}")" != "longport" ]]; then
    STRICT_MISMATCH_PROVIDER="longport"
  elif [[ "$(normalize_lower "${PROVIDER}")" != "infoway" ]]; then
    STRICT_MISMATCH_PROVIDER="infoway"
  else
    STRICT_MISMATCH_PROVIDER="jvquant"
  fi
  echo "[INFO] STRICT_MISMATCH_PROVIDER 与 PROVIDER 相同，已自动调整为 ${STRICT_MISMATCH_PROVIDER}"
fi

post_json() {
  local endpoint="$1"
  local payload="$2"
  local output_file="$3"
  local url="${BASE_URL%/}${endpoint}"
  curl -sS \
    -o "${output_file}" \
    -w "%{http_code}" \
    -X POST "${url}" \
    -H "Content-Type: application/json" \
    "${AUTH_HEADERS[@]}" \
    -d "${payload}"
}

start_ws_feed_if_needed() {
  if [[ "${MIN_DELTA_UPDATES}" -le 0 ]]; then
    return
  fi

  if [[ "${AUTO_START_WS_FEED}" != "1" ]]; then
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    fail "AUTO_START_WS_FEED=1 但缺少 node"
  fi

  if [[ ! -f "${WS_FEED_SCRIPT}" ]]; then
    fail "AUTO_START_WS_FEED=1 但脚本不存在: ${WS_FEED_SCRIPT}"
  fi

  if [[ -z "${APP_KEY:-}" || -z "${ACCESS_TOKEN:-}" ]]; then
    if [[ -z "${USERNAME:-}" || -z "${PASSWORD:-}" ]]; then
      fail "AUTO_START_WS_FEED=1 需要 APP_KEY+ACCESS_TOKEN 或 USERNAME+PASSWORD"
    fi
  fi

  section "启动 WS 喂数后台进程"
  : > "${WS_FEED_LOG_FILE}"
  HOLD_CONNECTION_AFTER_TARGET=1 \
  BASE_URL="${BASE_URL}" \
  WS_PATH="${WS_PATH:-/api/v1/stream-receiver/connect}" \
  SYMBOL="${SYMBOL}" \
  PROVIDER="${PROVIDER}" \
  MIN_TICK_COUNT="${WS_FEED_MIN_TICK_COUNT}" \
  TIMEOUT_MS="${WS_FEED_TIMEOUT_MS}" \
  APP_KEY="${APP_KEY:-}" \
  ACCESS_TOKEN="${ACCESS_TOKEN:-}" \
  USERNAME="${USERNAME:-}" \
  PASSWORD="${PASSWORD:-}" \
  node "${WS_FEED_SCRIPT}" > "${WS_FEED_LOG_FILE}" 2>&1 &
  WS_FEED_PID=$!
  echo "[INFO] ws_feed_pid=${WS_FEED_PID}"
  echo "[INFO] ws_feed_log=${WS_FEED_LOG_FILE}"
  sleep "${WS_FEED_BOOT_WAIT_SECONDS}"
}

start_ws_feed_if_needed

section "请求 snapshot"
SNAPSHOT_PAYLOAD="$(
  jq -nc \
    --arg symbol "${SYMBOL}" \
    --arg provider "${PROVIDER}" \
    --argjson pointLimit "${POINT_LIMIT}" \
    --arg market "${MARKET}" \
    --arg tradingDay "${TRADING_DAY}" \
    '
    {
      symbol: $symbol,
      provider: $provider,
      pointLimit: $pointLimit
    }
    | if ($market | length) > 0 then . + { market: $market } else . end
    | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
    '
)"
echo "${SNAPSHOT_PAYLOAD}"

SNAPSHOT_ATTEMPT=1
SNAPSHOT_REALTIME_MERGED_POINTS="0"
while true; do
  SNAPSHOT_HTTP_CODE="$(post_json "${SNAPSHOT_ENDPOINT}" "${SNAPSHOT_PAYLOAD}" "${SNAPSHOT_FILE}")"
  echo "snapshot_http_code=${SNAPSHOT_HTTP_CODE}"
  echo "snapshot_response_file=${SNAPSHOT_FILE}"

  if [[ "${SNAPSHOT_HTTP_CODE}" != "200" ]]; then
    jq '.' "${SNAPSHOT_FILE}" || cat "${SNAPSHOT_FILE}" || true
    fail "snapshot 请求失败，期望 200，实际 ${SNAPSHOT_HTTP_CODE}"
  fi

  SNAPSHOT_SCHEMA_OK="$(
    jq -r '
      (.success == true)
      and (.statusCode == 200)
      and (.data.line | type == "object")
      and (.data.line.symbol | type == "string")
      and (.data.line.market | type == "string")
      and (.data.line.tradingDay | type == "string")
      and (.data.line.granularity == "1s")
      and (.data.line.points | type == "array")
      and (.data.capability.snapshotBaseGranularity == "1m")
      and ((.data.sync.cursor // "") | length > 0)
      and ((.data.sync.lastPointTimestamp // "") | length > 0)
    ' "${SNAPSHOT_FILE}" 2>/dev/null || echo "false"
  )"
  if [[ "${SNAPSHOT_SCHEMA_OK}" != "true" ]]; then
    jq '.' "${SNAPSHOT_FILE}" || cat "${SNAPSHOT_FILE}" || true
    fail "snapshot 响应结构不符合预期"
  fi

  SNAPSHOT_REALTIME_MERGED_POINTS="$(
    jq -r '.data.metadata.realtimeMergedPoints // 0' "${SNAPSHOT_FILE}" 2>/dev/null || echo "0"
  )"
  print_snapshot_price_trace "snapshot_attempt_${SNAPSHOT_ATTEMPT}" "${SNAPSHOT_FILE}"

  if [[ "${MIN_DELTA_UPDATES}" -le 0 ]]; then
    break
  fi

  if [[ "${SNAPSHOT_PREWARM_ATTEMPTS}" -le 1 ]]; then
    break
  fi

  if [[ "${SNAPSHOT_REALTIME_MERGED_POINTS}" -gt 0 ]]; then
    break
  fi

  if [[ "${SNAPSHOT_ATTEMPT}" -ge "${SNAPSHOT_PREWARM_ATTEMPTS}" ]]; then
    if [[ "${REQUIRE_REALTIME_PREWARM}" == "1" ]]; then
      if [[ -n "${WS_FEED_PID}" ]]; then
        echo "[INFO] ws_feed_log_tail:"
        tail -n 20 "${WS_FEED_LOG_FILE}" || true
      fi
      fail "snapshot 预热失败：在 ${SNAPSHOT_PREWARM_ATTEMPTS} 次内未观测到 realtimeMergedPoints>0"
    fi
    echo "[WARN] snapshot 预热结束：仍未观测到 realtimeMergedPoints>0，后续 delta 可能为 0"
    break
  fi

  echo "[INFO] snapshot 预热中：attempt=${SNAPSHOT_ATTEMPT}/${SNAPSHOT_PREWARM_ATTEMPTS} realtimeMergedPoints=${SNAPSHOT_REALTIME_MERGED_POINTS}，${SNAPSHOT_PREWARM_INTERVAL_SECONDS}s 后重试"
  sleep "${SNAPSHOT_PREWARM_INTERVAL_SECONDS}"
  SNAPSHOT_ATTEMPT=$((SNAPSHOT_ATTEMPT + 1))
done

CURSOR="$(jq -r '.data.sync.cursor // empty' "${SNAPSHOT_FILE}")"
SNAPSHOT_MARKET="$(jq -r '.data.line.market // empty' "${SNAPSHOT_FILE}")"
SNAPSHOT_TRADING_DAY="$(jq -r '.data.line.tradingDay // empty' "${SNAPSHOT_FILE}")"
SNAPSHOT_POINTS_COUNT="$(jq -r '(.data.line.points // []) | length' "${SNAPSHOT_FILE}")"

if [[ -z "${CURSOR}" ]]; then
  fail "snapshot 未返回 cursor"
fi

section "snapshot 摘要"
jq '{
  success,
  statusCode,
  message,
  symbol: .data.line.symbol,
  market: .data.line.market,
  tradingDay: .data.line.tradingDay,
  granularity: .data.line.granularity,
  pointsCount: ((.data.line.points // []) | length),
  realtimeMergedPoints: (.data.metadata.realtimeMergedPoints // 0),
  snapshotBaseGranularity: .data.capability.snapshotBaseGranularity,
  lastPointTimestamp: .data.sync.lastPointTimestamp,
  lastPrice: (.data.line.points[-1].price // null),
  hasCursor: ((.data.sync.cursor // "") | length > 0)
}' "${SNAPSHOT_FILE}" || true

section "请求 delta（正例）"
DELTA_PAYLOAD="$(
  jq -nc \
    --arg symbol "${SYMBOL}" \
    --arg provider "${PROVIDER}" \
    --arg cursor "${CURSOR}" \
    --arg market "${SNAPSHOT_MARKET}" \
    --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
    --argjson limit "${DELTA_LIMIT}" \
    '
    {
      symbol: $symbol,
      provider: $provider,
      cursor: $cursor,
      limit: $limit
    }
    | if ($market | length) > 0 then . + { market: $market } else . end
    | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
    '
)"
echo "${DELTA_PAYLOAD}"

DELTA_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${DELTA_PAYLOAD}" "${DELTA_FILE}")"
echo "delta_http_code=${DELTA_HTTP_CODE}"
echo "delta_response_file=${DELTA_FILE}"

if [[ "${DELTA_HTTP_CODE}" != "200" ]]; then
  jq '.' "${DELTA_FILE}" || cat "${DELTA_FILE}" || true
  fail "delta 请求失败，期望 200，实际 ${DELTA_HTTP_CODE}"
fi

DELTA_SCHEMA_OK="$(
  jq -r '
    (.success == true)
    and (.statusCode == 200)
    and (.data.delta | type == "object")
    and (.data.delta.points | type == "array")
    and (.data.delta.hasMore | type == "boolean")
    and ((.data.delta.nextCursor // "") | length > 0)
    and ((.data.delta.lastPointTimestamp // "") | length > 0)
    and ((.data.delta.serverTime // "") | length > 0)
  ' "${DELTA_FILE}" 2>/dev/null || echo "false"
)"
if [[ "${DELTA_SCHEMA_OK}" != "true" ]]; then
  jq '.' "${DELTA_FILE}" || cat "${DELTA_FILE}" || true
  fail "delta 响应结构不符合预期"
fi

NEXT_CURSOR="$(jq -r '.data.delta.nextCursor // empty' "${DELTA_FILE}")"
DELTA_POINTS_COUNT="$(jq -r '(.data.delta.points // []) | length' "${DELTA_FILE}")"
TOTAL_DELTA_POINTS="${DELTA_POINTS_COUNT}"
CURRENT_CURSOR="${NEXT_CURSOR:-$CURSOR}"

section "delta 摘要"
jq '{
  success,
  statusCode,
  message,
  pointsCount: ((.data.delta.points // []) | length),
  hasMore: .data.delta.hasMore,
  hasNextCursor: ((.data.delta.nextCursor // "") | length > 0),
  lastPointTimestamp: .data.delta.lastPointTimestamp,
  lastPrice: (.data.delta.points[-1].price // null)
}' "${DELTA_FILE}" || true
print_delta_price_trace "delta_initial" "${DELTA_FILE}"

if [[ "${DELTA_POLL_ATTEMPTS}" -gt 0 ]]; then
  section "delta 连续拉取（固定 ${DELTA_POLL_ATTEMPTS} 次，每 ${DELTA_POLL_INTERVAL_SECONDS}s 一次）"
  DELTA_ATTEMPT=1
  while [[ "${DELTA_ATTEMPT}" -le "${DELTA_POLL_ATTEMPTS}" ]]; do
    sleep "${DELTA_POLL_INTERVAL_SECONDS}"

    LOOP_DELTA_PAYLOAD="$(
      jq -nc \
        --arg symbol "${SYMBOL}" \
        --arg provider "${PROVIDER}" \
        --arg cursor "${CURRENT_CURSOR}" \
        --arg market "${SNAPSHOT_MARKET}" \
        --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
        --argjson limit "${DELTA_LIMIT}" \
        '
        {
          symbol: $symbol,
          provider: $provider,
          cursor: $cursor,
          limit: $limit
        }
        | if ($market | length) > 0 then . + { market: $market } else . end
        | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
        '
    )"

    LOOP_DELTA_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${LOOP_DELTA_PAYLOAD}" "${DELTA_LOOP_FILE}")"
    if [[ "${LOOP_DELTA_HTTP_CODE}" != "200" ]]; then
      jq '.' "${DELTA_LOOP_FILE}" || cat "${DELTA_LOOP_FILE}" || true
      fail "delta 轮询失败，期望 200，实际 ${LOOP_DELTA_HTTP_CODE}"
    fi

    LOOP_DELTA_SCHEMA_OK="$(
      jq -r '
        (.success == true)
        and (.statusCode == 200)
        and (.data.delta | type == "object")
        and (.data.delta.points | type == "array")
        and ((.data.delta.nextCursor // "") | length > 0)
      ' "${DELTA_LOOP_FILE}" 2>/dev/null || echo "false"
    )"
    if [[ "${LOOP_DELTA_SCHEMA_OK}" != "true" ]]; then
      jq '.' "${DELTA_LOOP_FILE}" || cat "${DELTA_LOOP_FILE}" || true
      fail "delta 轮询响应结构不符合预期"
    fi

    LOOP_POINTS_COUNT="$(jq -r '(.data.delta.points // []) | length' "${DELTA_LOOP_FILE}" 2>/dev/null || echo "0")"
    LOOP_NEXT_CURSOR="$(jq -r '.data.delta.nextCursor // empty' "${DELTA_LOOP_FILE}")"
    if [[ -n "${LOOP_NEXT_CURSOR}" ]]; then
      CURRENT_CURSOR="${LOOP_NEXT_CURSOR}"
      NEXT_CURSOR="${LOOP_NEXT_CURSOR}"
    fi

    TOTAL_DELTA_POINTS=$((TOTAL_DELTA_POINTS + LOOP_POINTS_COUNT))
    echo "delta_attempt=${DELTA_ATTEMPT} new_points=${LOOP_POINTS_COUNT} total_points=${TOTAL_DELTA_POINTS}"
    print_delta_price_trace "delta_attempt_${DELTA_ATTEMPT}" "${DELTA_LOOP_FILE}"

    DELTA_ATTEMPT=$((DELTA_ATTEMPT + 1))
  done
fi

if [[ "${MIN_DELTA_UPDATES}" -gt 0 && "${TOTAL_DELTA_POINTS}" -lt "${MIN_DELTA_UPDATES}" ]]; then
  jq '.' "${DELTA_LOOP_FILE}" || cat "${DELTA_LOOP_FILE}" || true
  fail "delta 更新数量不足，要求至少 ${MIN_DELTA_UPDATES} 条，实际 ${TOTAL_DELTA_POINTS} 条（固定轮询 ${DELTA_POLL_ATTEMPTS} 次）"
fi

DELTA_POINTS_COUNT="${TOTAL_DELTA_POINTS}"

if [[ "${NEGATIVE_TESTS}" == "1" ]]; then
  section "delta 负例：缺失 cursor（期望 400）"
  NEG_NO_CURSOR_PAYLOAD="$(
    jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg provider "${PROVIDER}" \
      --arg market "${SNAPSHOT_MARKET}" \
      --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
      '
      {
        symbol: $symbol,
        provider: $provider
      }
      | if ($market | length) > 0 then . + { market: $market } else . end
      | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
      '
  )"
  NEG_NO_CURSOR_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${NEG_NO_CURSOR_PAYLOAD}" "${NEG_NO_CURSOR_FILE}")"
  echo "delta_no_cursor_http_code=${NEG_NO_CURSOR_HTTP_CODE}"
  if [[ "${NEG_NO_CURSOR_HTTP_CODE}" != "400" ]]; then
    jq '.' "${NEG_NO_CURSOR_FILE}" || cat "${NEG_NO_CURSOR_FILE}" || true
    fail "缺失 cursor 断言失败，期望 400，实际 ${NEG_NO_CURSOR_HTTP_CODE}"
  fi

  section "delta 负例：篡改 cursor（期望 400）"
  TAMPERED_CURSOR="$(
    jq -rn \
      --arg cursor "${CURSOR}" \
      '
      ($cursor | @base64d | fromjson)
      | .lastPointTimestamp = "1999-01-01T00:00:00.000Z"
      | @base64
      '
  )"
  if [[ -z "${TAMPERED_CURSOR}" ]]; then
    fail "生成篡改 cursor 失败"
  fi
  NEG_TAMPERED_CURSOR_PAYLOAD="$(
    jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg provider "${PROVIDER}" \
      --arg cursor "${TAMPERED_CURSOR}" \
      --arg market "${SNAPSHOT_MARKET}" \
      --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
      '
      {
        symbol: $symbol,
        provider: $provider,
        cursor: $cursor
      }
      | if ($market | length) > 0 then . + { market: $market } else . end
      | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
      '
  )"
  NEG_TAMPERED_CURSOR_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${NEG_TAMPERED_CURSOR_PAYLOAD}" "${NEG_TAMPERED_CURSOR_FILE}")"
  echo "delta_tampered_cursor_http_code=${NEG_TAMPERED_CURSOR_HTTP_CODE}"
  if [[ "${NEG_TAMPERED_CURSOR_HTTP_CODE}" != "400" ]]; then
    jq '.' "${NEG_TAMPERED_CURSOR_FILE}" || cat "${NEG_TAMPERED_CURSOR_FILE}" || true
    fail "篡改 cursor 断言失败，期望 400，实际 ${NEG_TAMPERED_CURSOR_HTTP_CODE}"
  fi

  section "delta 负例：strictProviderConsistency 冲突（期望 409）"
  NEG_PROVIDER_MISMATCH_PAYLOAD="$(
    jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg provider "${STRICT_MISMATCH_PROVIDER}" \
      --arg cursor "${NEXT_CURSOR:-$CURSOR}" \
      --arg market "${SNAPSHOT_MARKET}" \
      --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
      '
      {
        symbol: $symbol,
        provider: $provider,
        cursor: $cursor,
        strictProviderConsistency: true
      }
      | if ($market | length) > 0 then . + { market: $market } else . end
      | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
      '
  )"
  NEG_PROVIDER_MISMATCH_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${NEG_PROVIDER_MISMATCH_PAYLOAD}" "${NEG_PROVIDER_MISMATCH_FILE}")"
  echo "delta_provider_mismatch_http_code=${NEG_PROVIDER_MISMATCH_HTTP_CODE}"
  if [[ "${NEG_PROVIDER_MISMATCH_HTTP_CODE}" != "409" ]]; then
    jq '.' "${NEG_PROVIDER_MISMATCH_FILE}" || cat "${NEG_PROVIDER_MISMATCH_FILE}" || true
    fail "strictProviderConsistency 冲突断言失败，期望 409，实际 ${NEG_PROVIDER_MISMATCH_HTTP_CODE}"
  fi

  section "delta 负例：携带 since 字段（期望 400）"
  NEG_SINCE_PAYLOAD="$(
    jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg provider "${PROVIDER}" \
      --arg cursor "${NEXT_CURSOR:-$CURSOR}" \
      --arg market "${SNAPSHOT_MARKET}" \
      --arg tradingDay "${SNAPSHOT_TRADING_DAY}" \
      --arg since "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
      '
      {
        symbol: $symbol,
        provider: $provider,
        cursor: $cursor,
        since: $since
      }
      | if ($market | length) > 0 then . + { market: $market } else . end
      | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
      '
  )"
  NEG_SINCE_HTTP_CODE="$(post_json "${DELTA_ENDPOINT}" "${NEG_SINCE_PAYLOAD}" "${NEG_SINCE_FILE}")"
  echo "delta_with_since_http_code=${NEG_SINCE_HTTP_CODE}"
  if [[ "${NEG_SINCE_HTTP_CODE}" != "400" ]]; then
    jq '.' "${NEG_SINCE_FILE}" || cat "${NEG_SINCE_FILE}" || true
    fail "携带 since 字段断言失败，期望 400，实际 ${NEG_SINCE_HTTP_CODE}"
  fi

  section "snapshot 负例：携带 includePrePost 字段（期望 400）"
  NEG_INCLUDE_PREPOST_PAYLOAD="$(
    jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg provider "${PROVIDER}" \
      --arg market "${MARKET}" \
      --arg tradingDay "${TRADING_DAY}" \
      --argjson pointLimit "${POINT_LIMIT}" \
      '
      {
        symbol: $symbol,
        provider: $provider,
        pointLimit: $pointLimit,
        includePrePost: false
      }
      | if ($market | length) > 0 then . + { market: $market } else . end
      | if ($tradingDay | length) > 0 then . + { tradingDay: $tradingDay } else . end
      '
  )"
  NEG_INCLUDE_PREPOST_HTTP_CODE="$(post_json "${SNAPSHOT_ENDPOINT}" "${NEG_INCLUDE_PREPOST_PAYLOAD}" "${NEG_INCLUDE_PREPOST_FILE}")"
  echo "snapshot_with_includePrePost_http_code=${NEG_INCLUDE_PREPOST_HTTP_CODE}"
  if [[ "${NEG_INCLUDE_PREPOST_HTTP_CODE}" != "400" ]]; then
    jq '.' "${NEG_INCLUDE_PREPOST_FILE}" || cat "${NEG_INCLUDE_PREPOST_FILE}" || true
    fail "携带 includePrePost 字段断言失败，期望 400，实际 ${NEG_INCLUDE_PREPOST_HTTP_CODE}"
  fi
fi

section "测试完成"
echo "symbol=${SYMBOL}"
echo "provider=${PROVIDER}"
echo "snapshot_points=${SNAPSHOT_POINTS_COUNT}"
echo "snapshot_realtime_merged_points=${SNAPSHOT_REALTIME_MERGED_POINTS}"
echo "delta_points=${DELTA_POINTS_COUNT}"
echo "min_delta_updates=${MIN_DELTA_UPDATES}"
echo "delta_poll_attempts=${DELTA_POLL_ATTEMPTS}"
echo "delta_poll_interval_seconds=${DELTA_POLL_INTERVAL_SECONDS}"
echo "snapshot_prewarm_attempts=${SNAPSHOT_PREWARM_ATTEMPTS}"
echo "snapshot_prewarm_interval_seconds=${SNAPSHOT_PREWARM_INTERVAL_SECONDS}"
echo "require_realtime_prewarm=${REQUIRE_REALTIME_PREWARM}"
echo "auto_start_ws_feed=${AUTO_START_WS_FEED}"
echo "ws_feed_log=${WS_FEED_LOG_FILE}"
echo "negative_tests=${NEGATIVE_TESTS}"
echo "output_dir=${OUTPUT_DIR}"
echo "[PASS] 分时折线 API 开发成果验证通过"
