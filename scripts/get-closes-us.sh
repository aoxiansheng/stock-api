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

# 容错提取函数（字段可能因规则不同而命名略异）
extract_field() {
  local base="$1"
  local candidates=(${@:2})
  for c in "${candidates[@]}"; do
    local val
    local expr="${base}.${c}"
    val=$(printf '%s' "$RESP" | (has_jq && jq -r "$expr // empty" || python3 - "$base" "$c" <<'PY'
import sys, json
doc=json.load(sys.stdin)
base=sys.argv[1]; field=sys.argv[2]
def get(d, path):
  cur=d
  for p in path.split('.'):
    if not p: continue
    if isinstance(cur, dict): cur=cur.get(p)
    else: return None
  return cur
v=get(doc, base)
if isinstance(v, dict): v=v.get(field)
print('' if v is None else (str(v) if not isinstance(v,(dict,list)) else ''))
PY
    ))
    if [[ -n "$val" && "$val" != "null" ]]; then echo "$val"; return; fi
  done
  echo ""
}

BASE_PATH='.data.data[0]'
LAST_PRICE=$(extract_field "$BASE_PATH" 'lastPrice' 'last_done' 'lastDone' 'price' )
PREV_CLOSE=$(extract_field "$BASE_PATH" 'previousClose' 'prevClose' 'prev_close' 'preClose')
TRADE_STATUS=$(extract_field "$BASE_PATH" 'tradeStatus' 'marketStatus')
TS=$(extract_field "$BASE_PATH" 'timestamp' '_timestamp')

# 计算逻辑：
# yesterdayClose = previousClose
# todayClose:
#  - 若交易状态显示收盘/盘后(Closed/AfterHours/Post)，使用 lastPrice 作为当日收盘
#  - 否则（交易中或未知），回退 previousClose 作为最近交易日收盘

norm() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

STATUS_NORM=$(norm "${TRADE_STATUS:-}")

if [[ -z "${PREV_CLOSE}" ]]; then PREV_CLOSE=""; fi
if [[ -z "${LAST_PRICE}" ]]; then LAST_PRICE=""; fi

TODAY_CLOSE="$PREV_CLOSE"
NOTE="fallback_to_previous_close"
if [[ "$STATUS_NORM" == *"closed"* || "$STATUS_NORM" == *"after"* || "$STATUS_NORM" == *"post"* ]]; then
  if [[ -n "$LAST_PRICE" ]]; then
    TODAY_CLOSE="$LAST_PRICE"
    NOTE="closed_or_afterhours_use_lastPrice"
  fi
fi

echo "== 结果 =="
echo "symbol:        ${SYMBOL}"
echo "tradeStatus:   ${TRADE_STATUS:-unknown}"
echo "timestamp:     ${TS:-unknown}"
echo "yesterdayClose:${PREV_CLOSE:-unknown}"
echo "todayClose:    ${TODAY_CLOSE:-unknown}"
echo "rule:          ${NOTE}"

# JSON 输出（便于集成）
if [[ "${JSON:-false}" == "true" ]]; then
  if has_jq; then
    jq -n --arg symbol "$SYMBOL" \
      --arg tradeStatus "${TRADE_STATUS:-}" \
      --arg timestamp "${TS:-}" \
      --arg yesterdayClose "${PREV_CLOSE:-}" \
      --arg todayClose "${TODAY_CLOSE:-}" \
      --arg note "${NOTE}" '{symbol:$symbol, tradeStatus:$tradeStatus, timestamp:$timestamp, yesterdayClose: ($yesterdayClose|tonumber?), todayClose: ($todayClose|tonumber?), note:$note}'
  else
    printf '{"symbol":"%s","tradeStatus":"%s","timestamp":"%s","yesterdayClose":%s,"todayClose":%s,"note":"%s"}\n' \
      "$SYMBOL" "${TRADE_STATUS:-}" "${TS:-}" \
      "${PREV_CLOSE:-null}" "${TODAY_CLOSE:-null}" "$NOTE"
  fi
fi
