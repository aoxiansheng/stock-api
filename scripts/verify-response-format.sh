#!/usr/bin/env bash
set -euo pipefail

# 验证后端响应格式（无需改后端）
# 参考脚本风格：scripts/get-quote-with-apikey.sh（使用 jq/py 解析，健壮容错）

BASE_URL="${BASE_URL:-http://localhost:3001}"
USERNAME="${USERNAME:-fmt_user_$(date +%s)}"
PASSWORD="${PASSWORD:-User@123456}"
EMAIL="${EMAIL:-${USERNAME}@example.com}"

echo "[基址] BASE_URL=${BASE_URL}"
echo "[用户] USERNAME=${USERNAME} (≥7位要求建议满足)"
echo "[用户] EMAIL=${EMAIL}"

has_jq() { command -v jq >/dev/null 2>&1; }
json_pretty() { if has_jq; then jq; else cat; fi; }

json_get() {
  local expr="$1"; shift
  if has_jq; then jq -r "$expr"; else python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
def get(d, path):
  cur=d
  for p in path.split('.'):
    if not p: continue
    cur = (cur or {}).get(p) if isinstance(cur, dict) else None
  return cur
path=sys.argv[1]
val=get(doc, path)
print(val if not isinstance(val, (dict,list)) else json.dumps(val))
PY
  fi
}

print_keys() {
  # 打印关键层级 keys（有 jq 用 jq；否则用 python）
  if has_jq; then
    jq -r '
      def keys_or: if type=="object" then (keys|join(", ")) else "" end;
      "[顶层] keys: " + (keys|join(", ")),
      (if .data then "[data] keys: " + (.data|keys_or) else empty end),
      (if .data and (.data|has("data")) then (if (.data.data|type)=="array" then "[data.data] type: array(len=" + ((.data.data|length)|tostring) + ")" else "[data.data] keys: " + (.data.data|keys_or) end) else empty end),
      (if .data and (.data|has("metadata")) then "[data.metadata] keys: " + (.data.metadata|keys_or) else empty end)
    '
  else
    python3 - "$@" <<'PY'
import sys, json
j=json.load(sys.stdin)
def keys(o):
  return ", ".join(o.keys()) if isinstance(o, dict) else ""
print("[顶层] keys:", keys(j))
if isinstance(j.get('data'), dict):
  d=j['data']
  print("[data] keys:", keys(d))
  if 'data' in d:
    dd=d['data']
    if isinstance(dd, list):
      print(f"[data.data] type: array(len={len(dd)})")
    elif isinstance(dd, dict):
      print("[data.data] keys:", keys(dd))
    else:
      print("[data.data] value:", dd)
  if 'metadata' in d and isinstance(d['metadata'], dict):
    print("[data.metadata] keys:", keys(d['metadata']))
PY
  fi
}

WORKDIR="scripts/tmp"
mkdir -p "$WORKDIR"

echo "[1/5] 注册用户（若已存在将跳过）..."
REG_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"email\":\"${EMAIL}\",\"role\":\"DEVELOPER\"}") || true
printf '%s' "$REG_OUT" > "$WORKDIR/register.json"
if has_jq; then REG_STATUS=$(printf '%s' "$REG_OUT" | jq -r '.statusCode // 0'); else REG_STATUS=0; fi
echo "注册响应: ${REG_STATUS}"

echo "[2/5] 登录获取 JWT ..."
LOGIN_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
printf '%s' "$LOGIN_OUT" > "$WORKDIR/login.json"
JWT=$(printf '%s' "$LOGIN_OUT" | json_get '.data.accessToken' '.data.accessToken')
if [[ -z "${JWT}" || "${JWT}" == "null" ]]; then echo "登录失败: $LOGIN_OUT"; exit 1; fi
echo "获取 JWT 成功"

echo "[3/5] 使用 JWT 创建 API Key（READ，30d）..."
APIKEY_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"fmt_key","profile":"READ","expiresIn":"30d"}')
printf '%s' "$APIKEY_OUT" > "$WORKDIR/apikey.json"
APP_KEY=$(printf '%s' "$APIKEY_OUT" | json_get '.data.appKey' '.data.appKey')
ACC_TOKEN=$(printf '%s' "$APIKEY_OUT" | json_get '.data.accessToken' '.data.accessToken')
if [[ -z "$APP_KEY" || -z "$ACC_TOKEN" || "$APP_KEY" == "null" || "$ACC_TOKEN" == "null" ]]; then echo "创建 API Key 失败: $APIKEY_OUT"; exit 1; fi
echo "创建成功：APP_KEY=${APP_KEY:0:8}..., ACCESS_TOKEN=${ACC_TOKEN:0:8}..."

echo "[4/5] 调用 /api/v1/query/execute (BY_SYMBOLS) ..."
QUERY_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/query/execute" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${ACC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"queryType":"by_symbols","symbols":["AAPL.US"],"options":{"includeMetadata":true}}') || true
printf '%s' "$QUERY_OUT" > "$WORKDIR/query.json"
echo "== Query 响应关键路径 =="
print_keys "$WORKDIR/query.json" < "$WORKDIR/query.json"

echo "[5/5] 调用 /api/v1/receiver/data (get-stock-quote) ..."
RECV_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/receiver/data" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${ACC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["AAPL.US"],"receiverType":"get-stock-quote","options":{"preferredProvider":"longport","market":"US","fields":["lastPrice","volume","open","high","low"]}}') || true
printf '%s' "$RECV_OUT" > "$WORKDIR/receiver.json"
echo "== Receiver 响应关键路径 =="
print_keys "$WORKDIR/receiver.json" < "$WORKDIR/receiver.json"

echo
echo "校验指引："
echo "- 顶层应含: success, statusCode, message, data, timestamp"
echo "- Query: data -> { data(items/pagination), metadata }，items 路径为 data.data.items"
echo "- Receiver: data -> { data(标准化数组或null), metadata }，元信息在 data.metadata"
