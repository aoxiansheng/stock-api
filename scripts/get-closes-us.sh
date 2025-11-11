#!/usr/bin/env bash
set -euo pipefail

# 获取昨日收盘价与今日收盘价（若今日为非交易日，则返回最近一个交易日的收盘价）
# 依赖：curl、jq(可选，若无jq则使用python内置解析)

BASE_URL="${BASE_URL:-http://localhost:3001}"
SYMBOL="${SYMBOL:-${1:-AAPL.US}}"
USERNAME="${USERNAME:-close_user_$(date +%s)}"
PASSWORD="${PASSWORD:-User@123456}"
EMAIL="${EMAIL:-${USERNAME}@example.com}"

# 认证优先读取已存在的API Key；若未提供则自动注册/登录并创建API Key
APP_KEY="${APP_KEY:-}";
ACCESS_TOKEN="${ACCESS_TOKEN:-}";

WORKDIR="scripts/tmp"
mkdir -p "$WORKDIR"

has_jq() { command -v jq >/dev/null 2>&1; }
json_get() {
  local expr="$1"; shift || true
  if has_jq; then jq -r "$expr"; else python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
def get(d, path):
  cur=d
  for p in path.split('.'):
    if p=='': continue
    if isinstance(cur, dict): cur=cur.get(p)
    else: cur=None
  return cur
expr=sys.argv[1]
val=get(doc, expr)
if isinstance(val,(dict,list)): print(json.dumps(val))
else: print(val if val is not None else '')
PY
  fi
}

extract_field() {
  local base="$1"; shift
  local val=""
  for key in "$@"; do
    local path="${base}.${key}"
    val=$(printf '%s' "$RESP" | json_get "$path" "$path")
    if [[ -n "$val" && "$val" != "null" ]]; then
      echo "$val"
      return 0
    fi
  done
  echo ""
  return 1
}

echo "[基址] BASE_URL=${BASE_URL}"
echo "[目标] SYMBOL=${SYMBOL}"

if [[ -z "$APP_KEY" || -z "$ACCESS_TOKEN" ]]; then
  echo "[1/4] 注册用户（若已存在将跳过）..."
  REG_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"email\":\"${EMAIL}\",\"role\":\"DEVELOPER\"}") || true
  printf '%s' "$REG_OUT" > "$WORKDIR/getcloses_register.json"
  echo "注册响应: $(printf '%s' "$REG_OUT" | (has_jq && jq -r '.statusCode // 0' || sed -n '1p'))"

  echo "[2/4] 登录获取 JWT ..."
  LOGIN_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
  printf '%s' "$LOGIN_OUT" > "$WORKDIR/getcloses_login.json"
  JWT=$(printf '%s' "$LOGIN_OUT" | json_get '.data.accessToken' '.data.accessToken')
  if [[ -z "${JWT}" || "${JWT}" == "null" ]]; then echo "登录失败: $LOGIN_OUT"; exit 1; fi
  echo "获取 JWT 成功"

  echo "[3/4] 使用 JWT 创建 API Key（READ，30d）..."
  APIKEY_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -d '{"name":"get_closes_key","profile":"READ","expiresIn":"30d","permissions":["stream:read","stream:subscribe","data:read","query:execute","providers:read"]}')
  printf '%s' "$APIKEY_OUT" > "$WORKDIR/getcloses_apikey.json"
  APP_KEY=$(printf '%s' "$APIKEY_OUT" | json_get '.data.appKey' '.data.appKey')
  ACCESS_TOKEN=$(printf '%s' "$APIKEY_OUT" | json_get '.data.accessToken' '.data.accessToken')
  if [[ -z "$APP_KEY" || -z "$ACCESS_TOKEN" || "$APP_KEY" == "null" || "$ACCESS_TOKEN" == "null" ]]; then echo "创建 API Key 失败: $APIKEY_OUT"; exit 1; fi
  echo "创建成功：APP_KEY=${APP_KEY:0:8}..., ACCESS_TOKEN=${ACCESS_TOKEN:0:8}..."
else
  echo "[认证] 使用现有 APP_KEY/ACCESS_TOKEN"
fi

echo "[4/4] 调用 /api/v1/receiver/data 获取报价 ..."
REQ_PAYLOAD=$(cat <<JSON
{ "symbols": ["${SYMBOL}"], "receiverType": "get-stock-quote", "options": { "realtime": false } }
JSON
)

RESP=$(curl -sS -X POST "${BASE_URL%/}/api/v1/receiver/data" \
  -H "Content-Type: application/json" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${ACCESS_TOKEN}" \
  -d "$REQ_PAYLOAD")
printf '%s' "$RESP" > "$WORKDIR/getcloses_receiver.json"

STATUS=$(printf '%s' "$RESP" | (has_jq && jq -r '.statusCode // 0' || sed -n '1p'))
if [[ "$STATUS" != "200" && "$STATUS" != "201" ]]; then
  echo "请求失败，状态: $STATUS"; echo "$RESP"; exit 2
fi

echo "== 原始响应 =="
if has_jq; then
  printf '%s' "$RESP" | jq
else
  printf '%s\n' "$RESP"
fi

BASE_ITEM='.data.data[0]'
RAW_SYMBOL=$(extract_field "$BASE_ITEM" symbol ticker code)
LAST_PRICE=$(extract_field "$BASE_ITEM" lastPrice last_price lastDone last_done price last close)
PREV_CLOSE=$(extract_field "$BASE_ITEM" previousClose previous_close prevClose prev_close yesterdayClose yesterday_close)
TRADE_STATUS=$(extract_field "$BASE_ITEM" tradeStatus trade_status marketStatus market_status status)
TS=$(extract_field "$BASE_ITEM" timestamp time updatedAt updated_at lastUpdate last_update)

norm() {
  if [[ -z "$1" ]]; then
    printf ''
  else
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
  fi
}

STATUS_TEXT=${TRADE_STATUS:-}
STATUS_NORM=$(norm "$STATUS_TEXT")

TODAY_CLOSE="$PREV_CLOSE"
NOTE="fallback_to_previous_close"
if [[ -n "$STATUS_NORM" ]]; then
  if [[ "$STATUS_NORM" == *"closed"* || "$STATUS_NORM" == *"after"* || "$STATUS_NORM" == *"post"* ]]; then
    if [[ -n "$LAST_PRICE" && "$LAST_PRICE" != "null" ]]; then
      TODAY_CLOSE="$LAST_PRICE"
      NOTE="closed_or_afterhours_use_lastPrice"
    fi
  fi
fi

RESULT_SYMBOL="$SYMBOL"
TRADE_STATUS_DISPLAY="${TRADE_STATUS:-unknown}"
TIMESTAMP_DISPLAY="${TS:-unknown}"
YESTERDAY_DISPLAY="${PREV_CLOSE:-unknown}"
TODAY_DISPLAY="${TODAY_CLOSE:-unknown}"

if [[ -n "$RAW_SYMBOL" && "$RAW_SYMBOL" != "null" ]]; then
  RESULT_SYMBOL="$RAW_SYMBOL"
else
  NOTE="no_data"
fi

echo "== 结果(强时效) =="
echo "symbol:        ${RESULT_SYMBOL}"
echo "tradeStatus:   ${TRADE_STATUS_DISPLAY}"
echo "timestamp:     ${TIMESTAMP_DISPLAY}"
echo "yesterdayClose:${YESTERDAY_DISPLAY}"
echo "todayClose:    ${TODAY_DISPLAY}"
echo "rule:          ${NOTE}"

if [[ "${JSON:-false}" == "true" ]]; then
  if has_jq; then
    jq -n \
      --arg symbol "$RESULT_SYMBOL" \
      --arg tradeStatus "$TRADE_STATUS_DISPLAY" \
      --arg timestamp "$TIMESTAMP_DISPLAY" \
      --arg yesterdayClose "${PREV_CLOSE:-}" \
      --arg todayClose "${TODAY_CLOSE:-}" \
      --arg note "$NOTE" \
      '{symbol:$symbol, tradeStatus:$tradeStatus, timestamp:$timestamp, yesterdayClose: ($yesterdayClose|tonumber?), todayClose: ($todayClose|tonumber?), note:$note}'
  else
    yc="${PREV_CLOSE:-}"
    tc="${TODAY_CLOSE:-}"
    [[ -z "$yc" || "$yc" == "null" ]] && yc="null"
    [[ -z "$tc" || "$tc" == "null" ]] && tc="null"
    printf '{"symbol":"%s","tradeStatus":"%s","timestamp":"%s","yesterdayClose":%s,"todayClose":%s,"note":"%s"}\n' \
      "$RESULT_SYMBOL" "$TRADE_STATUS_DISPLAY" "$TIMESTAMP_DISPLAY" \
      "$yc" "$tc" "$NOTE"
  fi
fi
