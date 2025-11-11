#!/usr/bin/env bash
set -euo pipefail

# WebSocket 实时广播冒烟测试
# 功能：
# 1) 注册/登录/创建API Key（READ 30d）
# 2) Socket.IO 连接到 /api/v1/stream-receiver/connect 并订阅符号
# 3) 在指定时间窗口内统计收到的 "data" 事件条数，并输出关键日志

BASE_URL="${BASE_URL:-http://localhost:3001}"
USERNAME="${USERNAME:-smoke_user_$(date +%s)}"
PASSWORD="${PASSWORD:-User@123456}"
EMAIL="${EMAIL:-${USERNAME}@example.com}"
SYMBOLS_CSV="${SYMBOLS:-700.HK}"
WS_CAPABILITY="${WS_CAPABILITY:-stream-stock-quote}"
DURATION_SEC="${DURATION_SEC:-10}"

echo "[基址] BASE_URL=${BASE_URL}"
echo "[用户] USERNAME=${USERNAME}"
echo "[订阅] SYMBOLS=${SYMBOLS_CSV}"
echo "[能力] WS_CAPABILITY=${WS_CAPABILITY}"
echo "[窗口] 统计时长=${DURATION_SEC}s"

has_jq() { command -v jq >/dev/null 2>&1; }
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

WORKDIR="scripts/tmp"
mkdir -p "$WORKDIR"

echo "[1/4] 注册用户（若已存在将跳过）..."
REG_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"email\":\"${EMAIL}\",\"role\":\"DEVELOPER\"}") || true
printf '%s' "$REG_OUT" > "$WORKDIR/stream_register.json"
if has_jq; then REG_STATUS=$(printf '%s' "$REG_OUT" | jq -r '.statusCode // 0'); else REG_STATUS=0; fi
echo "注册响应: ${REG_STATUS}"

echo "[2/4] 登录获取 JWT ..."
LOGIN_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
printf '%s' "$LOGIN_OUT" > "$WORKDIR/stream_login.json"
JWT=$(printf '%s' "$LOGIN_OUT" | json_get '.data.accessToken' '.data.accessToken')
if [[ -z "${JWT}" || "${JWT}" == "null" ]]; then echo "登录失败: $LOGIN_OUT"; exit 1; fi
echo "获取 JWT 成功"

echo "[3/4] 使用 JWT 创建 API Key（READ，30d）..."
APIKEY_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"stream_smoke_key","profile":"READ","expiresIn":"30d","permissions":["stream:read","stream:subscribe"]}')
printf '%s' "$APIKEY_OUT" > "$WORKDIR/stream_apikey.json"
APP_KEY=$(printf '%s' "$APIKEY_OUT" | json_get '.data.appKey' '.data.appKey')
ACC_TOKEN=$(printf '%s' "$APIKEY_OUT" | json_get '.data.accessToken' '.data.accessToken')
if [[ -z "$APP_KEY" || -z "$ACC_TOKEN" || "$APP_KEY" == "null" || "$ACC_TOKEN" == "null" ]]; then echo "创建 API Key 失败: $APIKEY_OUT"; exit 1; fi
echo "创建成功：APP_KEY=${APP_KEY:0:8}..., ACCESS_TOKEN=${ACC_TOKEN:0:8}..."

echo "[4/4] 启动 Socket.IO 冒烟测试 ..."
NODE_SCRIPT="$WORKDIR/stream_smoke.mjs"
cat > "$NODE_SCRIPT" <<'NODE'
import { io } from 'socket.io-client'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const APP_KEY = process.env.APP_KEY
const ACCESS_TOKEN = process.env.ACCESS_TOKEN
const SYMBOLS_CSV = process.env.SYMBOLS || '700.HK'
const WS_CAPABILITY = process.env.WS_CAPABILITY || 'stream-stock-quote'
const DURATION_SEC = parseInt(process.env.DURATION_SEC || '10', 10)
const PREFERRED_PROVIDER = process.env.PREFERRED_PROVIDER || ''

if (!APP_KEY || !ACCESS_TOKEN) {
  console.error('缺少 APP_KEY 或 ACCESS_TOKEN')
  process.exit(2)
}

const symbols = SYMBOLS_CSV.split(',').map(s => s.trim()).filter(Boolean)
const url = BASE_URL.replace(/\/$/, '')
const path = '/api/v1/stream-receiver/connect'

console.log(`[连接] ${url}${path} symbols=${symbols.join(',')} capability=${WS_CAPABILITY}`)

const socket = io(url, {
  path,
  transports: ['websocket'],
  auth: { appKey: APP_KEY, accessToken: ACCESS_TOKEN },
  forceNew: true,
})

let dataCount = 0
let errors = []

socket.on('connect', () => {
  console.log(`[WS] connected id=${socket.id}`)
  const payload = { symbols, wsCapabilityType: WS_CAPABILITY }
  if (PREFERRED_PROVIDER) payload.preferredProvider = PREFERRED_PROVIDER
  socket.emit('subscribe', payload)
})

socket.on('connected', (msg) => {
  console.log('[WS] connected event:', msg)
})

socket.on('subscribe-ack', (msg) => {
  console.log('[WS] subscribe-ack:', JSON.stringify(msg))
})

socket.on('subscribe-error', (msg) => {
  console.log('[WS] subscribe-error:', JSON.stringify(msg))
  errors.push('subscribe-error')
})

socket.on('data', (payload) => {
  dataCount++
  if (dataCount <= 5) {
    console.log('[WS] data sample:', JSON.stringify(payload).slice(0, 200) + '...')
  }
})

socket.on('error', (err) => {
  console.log('[WS] error:', err?.message || err)
  errors.push('error')
})
socket.on('connect_error', (err) => {
  console.log('[WS] connect_error:', err?.message || err)
  errors.push('connect_error')
})

setTimeout(() => {
  console.log(`[结果] 收到 data 事件次数: ${dataCount} (窗口=${DURATION_SEC}s) 错误=${errors.length}`)
  socket.close()
  process.exit(0)
}, DURATION_SEC * 1000)
NODE

BASE_URL="$BASE_URL" \
APP_KEY="$APP_KEY" \
ACCESS_TOKEN="$ACC_TOKEN" \
SYMBOLS="$SYMBOLS_CSV" \
WS_CAPABILITY="$WS_CAPABILITY" \
DURATION_SEC="$DURATION_SEC" \
node "$NODE_SCRIPT"

echo "完成: 如未收到 data，可能需要触发真实流或检查广播接线/Provider数据源"
