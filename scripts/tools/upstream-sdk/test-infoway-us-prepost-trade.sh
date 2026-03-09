#!/usr/bin/env bash
set -euo pipefail

# 用法示例：
# API_KEY="7ffce79114f840b6a749fb59344159d2-infoway" \
# SYMBOL="AAPL.US" \
# SAMPLES=12 \
# INTERVAL_SEC=5 \
# bash scripts/tools/upstream-sdk/test-infoway-us-prepost-trade.sh
#
# 说明：
# - 按 Infoway 文档调用 GET /stock/batch_trade/{codes}
# - 按美东时间把成交点归类为：pre/regular/post/offhours
# - 输出是否检测到盘前、盘后样本

BASE_URL="${BASE_URL:-https://data.infoway.io}"
SYMBOL="${SYMBOL:-AAPL.US}"
API_KEY="${API_KEY:-${TOKEN:-}}"
SAMPLES="${SAMPLES:-12}"
INTERVAL_SEC="${INTERVAL_SEC:-5}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/infoway-us-prepost-test}"
RAW_FILE="${OUTPUT_DIR}/raw-last-response.json"
SAMPLE_FILE="${OUTPUT_DIR}/samples.ndjson"
RAW_SAMPLES_FILE="${OUTPUT_DIR}/raw-samples.ndjson"

mkdir -p "${OUTPUT_DIR}"
rm -f "${SAMPLE_FILE}"
rm -f "${RAW_SAMPLES_FILE}"

fail() {
  echo "[FAIL] $1"
  exit 1
}

section() {
  echo
  echo "== $1 =="
}

mask_key() {
  local key="$1"
  local len=${#key}
  if (( len <= 10 )); then
    echo "***"
    return
  fi
  echo "${key:0:6}***${key:len-4:4}"
}

if ! command -v curl >/dev/null 2>&1; then
  fail "缺少 curl"
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "缺少 jq"
fi

if ! command -v python3 >/dev/null 2>&1; then
  fail "缺少 python3（用于时区判定）"
fi

if [[ -z "${API_KEY}" ]]; then
  fail "缺少 API_KEY（可通过 API_KEY 或 TOKEN 传入）"
fi

if ! [[ "${SAMPLES}" =~ ^[0-9]+$ ]] || (( SAMPLES < 1 )); then
  fail "SAMPLES 必须是正整数"
fi

if ! [[ "${INTERVAL_SEC}" =~ ^[0-9]+$ ]] || (( INTERVAL_SEC < 0 )); then
  fail "INTERVAL_SEC 必须是非负整数"
fi

URL="${BASE_URL%/}/stock/batch_trade/${SYMBOL}"
MASKED_KEY="$(mask_key "${API_KEY}")"

section "请求配置"
echo "url=${URL}"
echo "symbol=${SYMBOL}"
echo "samples=${SAMPLES}"
echo "interval_sec=${INTERVAL_SEC}"
echo "api_key_masked=${MASKED_KEY}"
echo "output_dir=${OUTPUT_DIR}"

extract_sample() {
  local response_file="$1"
  local symbol="$2"

  python3 - "$response_file" "$symbol" <<'PY'
import json
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

response_file = sys.argv[1]
target_symbol = sys.argv[2].strip().upper()

with open(response_file, "r", encoding="utf-8") as f:
    payload = json.load(f)

if payload.get("ret") != 200:
    raise SystemExit(f"upstream ret != 200: {payload.get('ret')} msg={payload.get('msg')}")

rows = payload.get("data") or []
row = None
for item in rows:
    symbol = str(item.get("s", "")).strip().upper()
    if symbol == target_symbol:
        row = item
        break
if row is None and rows:
    row = rows[0]

if row is None:
    raise SystemExit("upstream data is empty")

ts_raw = row.get("t")
try:
    ts_ms = int(ts_raw)
except Exception as exc:
    raise SystemExit(f"invalid timestamp: {ts_raw}") from exc

price_raw = row.get("p")
volume_raw = row.get("v")
trade_direction = row.get("td")
symbol = str(row.get("s", "")).strip().upper()

et = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).astimezone(ZoneInfo("America/New_York"))
et_minutes = et.hour * 60 + et.minute + et.second / 60.0

if 4 * 60 <= et_minutes < 9 * 60 + 30:
    session = "pre"
elif 9 * 60 + 30 <= et_minutes < 16 * 60:
    session = "regular"
elif 16 * 60 <= et_minutes < 20 * 60:
    session = "post"
else:
    session = "offhours"

out = {
    "symbol": symbol,
    "timestampMs": ts_ms,
    "utcTime": datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z"),
    "etTime": et.isoformat(),
    "etClock": et.strftime("%H:%M:%S"),
    "session": session,
    "price": price_raw,
    "volume": volume_raw,
    "td": trade_direction,
    "rawTrade": row,
}
print(json.dumps(out, ensure_ascii=False))
PY
}

section "开始采样"
for (( i=1; i<=SAMPLES; i++ )); do
  HTTP_CODE="$(
    curl -sS \
      -o "${RAW_FILE}" \
      -w "%{http_code}" \
      -X GET "${URL}" \
      -H "apiKey: ${API_KEY}"
  )"

  if [[ "${HTTP_CODE}" != "200" ]]; then
    echo "sample=${i} http_code=${HTTP_CODE}"
    cat "${RAW_FILE}" || true
    fail "请求失败"
  fi

  FETCHED_AT="$(date -u "+%Y-%m-%dT%H:%M:%SZ")"
  RAW_JSON_LINE="$(
    jq -c \
      --argjson sample "${i}" \
      --arg fetchedAt "${FETCHED_AT}" \
      '{sample:$sample,fetchedAt:$fetchedAt,response:.}' "${RAW_FILE}" 2>/dev/null \
    || jq -nc \
      --argjson sample "${i}" \
      --arg fetchedAt "${FETCHED_AT}" \
      --rawfile raw "${RAW_FILE}" \
      '{sample:$sample,fetchedAt:$fetchedAt,rawText:$raw}'
  )"
  echo "${RAW_JSON_LINE}" >> "${RAW_SAMPLES_FILE}"

  SAMPLE_JSON="$(extract_sample "${RAW_FILE}" "${SYMBOL}")"
  echo "${SAMPLE_JSON}" >> "${SAMPLE_FILE}"

  ET_CLOCK="$(echo "${SAMPLE_JSON}" | jq -r '.etClock')"
  SESSION="$(echo "${SAMPLE_JSON}" | jq -r '.session')"
  PRICE="$(echo "${SAMPLE_JSON}" | jq -r '.price')"
  echo "sample=${i}/${SAMPLES} et=${ET_CLOCK} session=${SESSION} price=${PRICE}"
  echo "sample=${i}/${SAMPLES} raw_json=${RAW_JSON_LINE}"

  if (( i < SAMPLES )) && (( INTERVAL_SEC > 0 )); then
    sleep "${INTERVAL_SEC}"
  fi
done

section "采样统计"
jq -s '{
  totalSamples: length,
  sessions: (group_by(.session) | map({session: .[0].session, count: length})),
  latest: (if length > 0 then .[-1] else null end)
}' "${SAMPLE_FILE}"

HAS_PRE="$(jq -s 'any(.[]; .session == "pre")' "${SAMPLE_FILE}")"
HAS_POST="$(jq -s 'any(.[]; .session == "post")' "${SAMPLE_FILE}")"
HAS_REGULAR="$(jq -s 'any(.[]; .session == "regular")' "${SAMPLE_FILE}")"

section "结论"
echo "has_pre_market=${HAS_PRE}"
echo "has_regular_market=${HAS_REGULAR}"
echo "has_after_hours=${HAS_POST}"

if [[ "${HAS_PRE}" == "true" || "${HAS_POST}" == "true" ]]; then
  echo "[PASS] 检测到盘前/盘后报价数据"
else
  echo "[INFO] 当前采样窗口未检测到盘前/盘后数据（可能处于盘中或非交易时段）"
fi

echo "samples_file=${SAMPLE_FILE}"
echo "raw_last_response=${RAW_FILE}"
echo "raw_samples_file=${RAW_SAMPLES_FILE}"
