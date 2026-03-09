#!/usr/bin/env bash
set -euo pipefail

# 用法示例：
# APP_KEY=xxx ACCESS_TOKEN=yyy \
# BASE_URL="http://127.0.0.1:3001" \
# SYMBOL="AAPL.US" \
# PROVIDER="infoway" \
# bash scripts/tools/local-project/test-rest-latest-price.sh
#
# 或使用 JWT：
# AUTH_BEARER="eyJ..." bash scripts/tools/local-project/test-rest-latest-price.sh

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
ENDPOINT="${ENDPOINT:-/api/v1/receiver/data}"
SYMBOL="${SYMBOL:-AAPL.US}"
PROVIDER="${PROVIDER:-infoway}"
MARKET="${MARKET:-}"
OUTPUT_FILE="${OUTPUT_FILE:-/tmp/local-rest-latest-price.json}"

if [[ -z "${APP_KEY:-}" || -z "${ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${AUTH_BEARER:-}" ]]; then
    echo "[FAIL] 缺少认证信息：请提供 APP_KEY+ACCESS_TOKEN，或 AUTH_BEARER"
    exit 1
  fi
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[FAIL] 缺少 curl"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] 缺少 jq（本脚本依赖 jq）"
  exit 1
fi

PAYLOAD="$(
  jq -nc \
    --arg symbol "${SYMBOL}" \
    --arg provider "${PROVIDER}" \
    --arg market "${MARKET}" \
    '
    {
      symbols: [$symbol],
      receiverType: "get-stock-quote",
      options: {
        preferredProvider: $provider,
        useSmartCache: false
      }
    }
    | if ($market | length) > 0 then .options.market = $market else . end
    '
)"

URL="${BASE_URL%/}${ENDPOINT}"

echo "== 请求地址 =="
echo "${URL}"
echo
echo "== 请求体 =="
echo "${PAYLOAD}"
echo

CURL_ARGS=(
  -sS
  -o "${OUTPUT_FILE}"
  -w "%{http_code}"
  -X POST "${URL}"
  -H "Content-Type: application/json"
  -d "${PAYLOAD}"
)

if [[ -n "${APP_KEY:-}" && -n "${ACCESS_TOKEN:-}" ]]; then
  CURL_ARGS+=(-H "X-App-Key: ${APP_KEY}" -H "X-Access-Token: ${ACCESS_TOKEN}")
else
  CURL_ARGS+=(-H "Authorization: Bearer ${AUTH_BEARER}")
fi

HTTP_CODE="$(curl "${CURL_ARGS[@]}")"

echo "== HTTP 状态码 =="
echo "${HTTP_CODE}"
echo
echo "== 原始响应文件 =="
echo "${OUTPUT_FILE}"
echo

if [[ "${HTTP_CODE}" != "200" ]]; then
  jq '.' "${OUTPUT_FILE}" || cat "${OUTPUT_FILE}" || true
  echo "[FAIL] 请求失败"
  exit 1
fi

SUMMARY="$(
  jq -c '
    (
      (.data.data // .data // .quote_data // [])
      | if type == "array" and length > 0 then .[0] else {} end
    ) as $q
    | {
        success: (.success // false),
        statusCode: (.statusCode // null),
        message: (.message // ""),
        symbol: ($q.symbol // $q.s // ""),
        lastPrice: ($q.lastPrice // $q.price // $q.p // null),
        timestamp: ($q.timestamp // $q.t // null),
        provider: ($q.sourceProvider // .data.metadata.provider // ""),
        hasError: (.error != null)
      }
  ' "${OUTPUT_FILE}" 2>/dev/null
)"

LATEST_PRICE="$(echo "${SUMMARY}" | jq -r '.lastPrice')"

echo "== 最新价格摘要 =="
echo "${SUMMARY}" | jq '.'
echo

if [[ "${LATEST_PRICE}" == "null" || "${LATEST_PRICE}" == "" ]]; then
  echo "[FAIL] 未解析到 latest price"
  exit 1
fi

echo "[PASS] REST 最新价获取成功：${LATEST_PRICE}"
