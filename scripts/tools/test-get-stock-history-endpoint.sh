#!/usr/bin/env bash
set -euo pipefail

# 用法示例：
# APP_KEY=xxx ACCESS_TOKEN=yyy \
# BASE_URL="http://127.0.0.1:3001" SYMBOL="AAPL.US" MARKET="US" \
# KLINE_NUM=5 TIMESTAMP=1758553860 \
# bash scripts/tools/test-get-stock-history-endpoint.sh
#
# 或使用 JWT：
# AUTH_BEARER="eyJ..." bash scripts/tools/test-get-stock-history-endpoint.sh

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
ENDPOINT="${ENDPOINT:-/api/v1/receiver/data}"
SYMBOL="${SYMBOL:-AAPL.US}"
MARKET="${MARKET:-US}"
PROVIDER="${PROVIDER:-infoway}"
KLINE_NUM="${KLINE_NUM:-}"
TIMESTAMP="${TIMESTAMP:-}"
OUTPUT_FILE="${OUTPUT_FILE:-/tmp/get-stock-history-response.json}"

if [[ -z "${APP_KEY:-}" || -z "${ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${AUTH_BEARER:-}" ]]; then
    echo "缺少认证信息：请提供 APP_KEY+ACCESS_TOKEN，或 AUTH_BEARER"
    exit 1
  fi
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "缺少 curl"
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  if [[ -n "${TIMESTAMP}" && -n "${KLINE_NUM}" ]]; then
    PAYLOAD="$(jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg market "${MARKET}" \
      --arg provider "${PROVIDER}" \
      --argjson klineNum "${KLINE_NUM}" \
      --argjson timestamp "${TIMESTAMP}" \
      '{
        symbols: [$symbol],
        receiverType: "get-stock-history",
        options: {
          preferredProvider: $provider,
          market: $market,
          klineNum: $klineNum,
          timestamp: $timestamp
        }
      }')"
  elif [[ -n "${TIMESTAMP}" ]]; then
    PAYLOAD="$(jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg market "${MARKET}" \
      --arg provider "${PROVIDER}" \
      --argjson timestamp "${TIMESTAMP}" \
      '{
        symbols: [$symbol],
        receiverType: "get-stock-history",
        options: {
          preferredProvider: $provider,
          market: $market,
          timestamp: $timestamp
        }
      }')"
  elif [[ -n "${KLINE_NUM}" ]]; then
    PAYLOAD="$(jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg market "${MARKET}" \
      --arg provider "${PROVIDER}" \
      --argjson klineNum "${KLINE_NUM}" \
      '{
        symbols: [$symbol],
        receiverType: "get-stock-history",
        options: {
          preferredProvider: $provider,
          market: $market,
          klineNum: $klineNum
        }
      }')"
  else
    PAYLOAD="$(jq -nc \
      --arg symbol "${SYMBOL}" \
      --arg market "${MARKET}" \
      --arg provider "${PROVIDER}" \
      '{
        symbols: [$symbol],
        receiverType: "get-stock-history",
        options: {
          preferredProvider: $provider,
          market: $market
        }
      }')"
  fi
else
  if [[ -n "${TIMESTAMP}" && -n "${KLINE_NUM}" ]]; then
    PAYLOAD="{\"symbols\":[\"${SYMBOL}\"],\"receiverType\":\"get-stock-history\",\"options\":{\"preferredProvider\":\"${PROVIDER}\",\"market\":\"${MARKET}\",\"klineNum\":${KLINE_NUM},\"timestamp\":${TIMESTAMP}}}"
  elif [[ -n "${TIMESTAMP}" ]]; then
    PAYLOAD="{\"symbols\":[\"${SYMBOL}\"],\"receiverType\":\"get-stock-history\",\"options\":{\"preferredProvider\":\"${PROVIDER}\",\"market\":\"${MARKET}\",\"timestamp\":${TIMESTAMP}}}"
  elif [[ -n "${KLINE_NUM}" ]]; then
    PAYLOAD="{\"symbols\":[\"${SYMBOL}\"],\"receiverType\":\"get-stock-history\",\"options\":{\"preferredProvider\":\"${PROVIDER}\",\"market\":\"${MARKET}\",\"klineNum\":${KLINE_NUM}}}"
  else
    PAYLOAD="{\"symbols\":[\"${SYMBOL}\"],\"receiverType\":\"get-stock-history\",\"options\":{\"preferredProvider\":\"${PROVIDER}\",\"market\":\"${MARKET}\"}}"
  fi
fi

URL="${BASE_URL%/}${ENDPOINT}"

echo "== 请求地址 =="
echo "${URL}"
echo
echo "== 请求体 =="
echo "${PAYLOAD}"
echo
if command -v jq >/dev/null 2>&1; then
  REQUEST_HAS_KLINE_NUM="$(echo "${PAYLOAD}" | jq -r '.options | has("klineNum")')"
  echo "request_has_klineNum=${REQUEST_HAS_KLINE_NUM}"
  echo
fi

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

if command -v jq >/dev/null 2>&1; then
  BACKEND_ROW_COUNT="$(
    jq -r '
      (.data.data // .data // .quote_data // [])
      | if type=="array" then length else 0 end
    ' "${OUTPUT_FILE}" 2>/dev/null || echo "0"
  )"
  BACKEND_SHAPE="$(
    jq -r '
      (
        (.data.data // .data // .quote_data // [])
        | if type=="array" and length>0 then .[0] else {} end
      ) as $first
      | if ($first | has("respList")) then "nested_respList"
        elif ($first | has("timestamp")) then "flattened_kline_rows"
        else "unknown"
        end
    ' "${OUTPUT_FILE}" 2>/dev/null || echo "unknown"
  )"

  echo "== 后端返回总条数 =="
  echo "rows=${BACKEND_ROW_COUNT}"
  echo "shape=${BACKEND_SHAPE}"
  echo "note=rows 为后端本次实际响应条数，不是脚本固定值"
  echo

  echo "== 响应顶层 =="
  jq '{success, statusCode, message, timestamp, hasError: (.error!=null)}' "${OUTPUT_FILE}" || true
  echo

  echo "== 数据结构摘要 =="
  jq '{
    hasData: (.data != null),
    dataType: (.data | type),
    rowCount: (
      (.data.data // .data // .quote_data // [])
      | if type=="array" then length else 0 end
    ),
    shape: (
      (
        (.data.data // .data // .quote_data // [])
        | if type=="array" and length>0 then .[0] else {} end
      ) as $first
      | if ($first | has("respList")) then "nested_respList"
        elif ($first | has("timestamp")) then "flattened_kline_rows"
        else "unknown"
        end
    ),
    firstEntryKeys: (
      (
        (.data.data // .data // .quote_data // [])
        | if type=="array" and length>0 then .[0] else {} end
      ) | keys
    ),
    firstRespListCount: (
      (
        (.data.data // .data // .quote_data // [])
        | if type=="array" and length>0 then .[0].respList else [] end
      ) | if type=="array" then length else 0 end
    )
  }' "${OUTPUT_FILE}" || true
  echo

  echo "== 后端数据前 3 条（按响应顺序） =="
  jq '
    (
      (.data.data // .data // .quote_data // [])
      | if type=="array" and length>0 then . else [] end
    ) as $rows
    | (
      if ($rows|length)==0 then []
      elif ($rows[0] | has("respList")) then ($rows[0].respList // [])
      else $rows
      end
    ) as $list
    | $list[:3]
  ' "${OUTPUT_FILE}" || true
  echo

  echo "== 后端数据最后 3 条（按响应顺序） =="
  jq '
    (
      (.data.data // .data // .quote_data // [])
      | if type=="array" and length>0 then . else [] end
    ) as $rows
    | (
      if ($rows|length)==0 then []
      elif ($rows[0] | has("respList")) then ($rows[0].respList // [])
      else $rows
      end
    ) as $list
    | if ($list|length) <= 3 then $list else $list[-3:] end
  ' "${OUTPUT_FILE}" || true
else
  echo "未检测到 jq，直接输出原始响应："
  cat "${OUTPUT_FILE}"
fi
