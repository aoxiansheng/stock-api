#!/usr/bin/env bash
set -euo pipefail

# 触发一次强时效请求后，立即对 Redis 做只读诊断（同一脚本内完成）
# 目标：规避短TTL导致的观测窗口问题；快速验证是否写入了 BasicCache( Redis )
# 依赖：curl、redis-cli；可选 jq 或 python3 用于解析 JSON

BASE_URL="${BASE_URL:-http://localhost:3001}"
USERNAME="${USERNAME:-diag_user_$(date +%s)}"
PASSWORD="${PASSWORD:-User@123456}"
EMAIL="${EMAIL:-${USERNAME}@example.com}"

# 诊断目标（用于派生缓存键）
DIAG_SYMBOL="${DIAG_SYMBOL:-AAPL.US}"
DIAG_PROVIDER="${DIAG_PROVIDER:-longport}"
DIAG_OP="${DIAG_OP:-get-stock-quote}"

# Redis 连接
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
BASE_DB="${BASE_DB:-}"

has_jq() { command -v jq >/dev/null 2>&1; }
has_py() { command -v python3 >/dev/null 2>&1; }
has_redis_cli() { command -v redis-cli >/dev/null 2>&1; }

json_get() {
  local expr="$1"
  shift
  if has_jq; then
    jq -r "$expr"
  elif has_py; then
    python3 - "$@" <<'PY'
import sys, json
data=sys.stdin.read()
try:
  j=json.loads(data)
except Exception:
  print("")
  sys.exit(0)
expr=sys.argv[1]
cur=j
for p in expr.strip('.').split('.'):
  if not p:
    continue
  if isinstance(cur, dict) and p in cur:
    cur=cur[p]
  else:
    cur=None; break
if isinstance(cur,(dict,list)):
  print(json.dumps(cur))
elif cur is None:
  print("")
else:
  print(cur)
PY
  else
    # 尽力而为
    cat
  fi
}

url_db() {
  local url="$1"
  if [[ -n "${BASE_DB}" ]]; then echo "$BASE_DB"; return; fi
  if [[ "$url" =~ .*/([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo 0
  fi
}

if ! has_redis_cli; then
  echo "[错误] 未找到 redis-cli，请先安装（brew install redis 或使用 Docker 提供的 redis-cli）" >&2
  exit 2
fi

echo "[基址] BASE_URL=${BASE_URL}"
echo "[用户] USERNAME=${USERNAME}"
echo "[Redis] URL=${REDIS_URL} (Base DB=$(url_db "$REDIS_URL"))"

# 1) 注册（幂等）
REG_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"email\":\"${EMAIL}\",\"role\":\"DEVELOPER\"}") || true
echo "[注册] 状态: $(printf '%s' "$REG_OUT" | json_get '.statusCode' '.statusCode' | tr -d '\n')"

# 2) 登录
LOGIN_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
JWT=$(printf '%s' "$LOGIN_OUT" | json_get '.data.accessToken' '.data.accessToken' | tr -d '\n')
if [[ -z "$JWT" || "$JWT" == "null" ]]; then
  echo "[错误] 登录失败: $LOGIN_OUT" >&2
  exit 1
fi
echo "[登录] 获取 JWT 成功"

# 3) 创建 API Key
APIKEY_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"diag_key","profile":"READ","expiresIn":"30d"}')
APP_KEY=$(printf '%s' "$APIKEY_OUT" | json_get '.data.appKey' '.data.appKey' | tr -d '\n')
ACC_TOKEN=$(printf '%s' "$APIKEY_OUT" | json_get '.data.accessToken' '.data.accessToken' | tr -d '\n')
if [[ -z "$APP_KEY" || -z "$ACC_TOKEN" || "$APP_KEY" == "null" || "$ACC_TOKEN" == "null" ]]; then
  echo "[错误] 创建 API Key 失败: $APIKEY_OUT" >&2
  exit 1
fi
echo "[API Key] 创建成功 APP_KEY=${APP_KEY:0:8}..., ACCESS_TOKEN=${ACC_TOKEN:0:8}..."

# 4) 触发强时效请求（尽量精简 payload 以减少延迟）
RECV_BODY=$(cat <<JSON
{
  "symbols": ["${DIAG_SYMBOL}"],
  "receiverType": "${DIAG_OP}",
  "options": {
    "preferredProvider": "${DIAG_PROVIDER}",
    "market": "US",
    "fields": ["lastPrice","volume"],
    "realtime": true,
    "timeout": 2000
  }
}
JSON
)

RECV_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/receiver/data" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${ACC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$RECV_BODY")

STATUS=$(printf '%s' "$RECV_OUT" | json_get '.statusCode' '.statusCode' | tr -d '\n')
echo "[触发] /receiver/data 状态: ${STATUS}"

# 5) 立即诊断 Redis
DB=$(url_db "$REDIS_URL")
DERIVED_KEY="receiver:${DIAG_OP}:${DIAG_SYMBOL}:provider:${DIAG_PROVIDER}"
echo "[诊断] 派生键: ${DERIVED_KEY}"

TTL=$(redis-cli -u "$REDIS_URL" -n "$DB" TTL "$DERIVED_KEY" 2>/dev/null || true)
if [[ -z "${TTL}" || "${TTL}" == "-2" ]]; then
  # 短暂等待后再试一次，避免极端时序
  sleep 0.2
  TTL=$(redis-cli -u "$REDIS_URL" -n "$DB" TTL "$DERIVED_KEY" 2>/dev/null || true)
fi

if [[ -n "${TTL}" && "${TTL}" != "-2" ]]; then
  echo "[诊断] 命中派生键，TTL(s)=${TTL}"
  VAL=$(redis-cli -u "$REDIS_URL" -n "$DB" GET "$DERIVED_KEY" 2>/dev/null || true)
  BYTES=$(printf "%s" "$VAL" | wc -c | awk '{print $1}')
  echo "[诊断] 值大小(bytes)=${BYTES}"
else
  echo "[诊断] 未命中派生键（可能未写入Redis、已过期、或使用了内存回退）。"
  echo "         - 建议：临时设置 SMART_CACHE_TTL_STRONG_S=5，重启服务，再次运行本脚本以便观察"
  echo "         - 或检查 SMARTCACHE_USE_REDIS 是否为 true（默认true）"
fi

# 6) 可选：执行深度扫描（减少用户时间成本）
if [[ "${DO_SCAN:-true}" == "true" ]]; then
  echo "[扫描] receiver:* 前缀（深度）"
  # 简化深扫实现：连续扫描若干轮，COUNT=10000
  CUR=0; ITER=0; FOUND=0; MAX_ITER=${SCAN_MAX_ITER:-20}
  while :; do
    OUT=$(redis-cli -u "$REDIS_URL" -n "$DB" --raw SCAN "$CUR" MATCH "receiver:*" COUNT 10000 || true)
    if [ -z "$OUT" ]; then break; fi
    CUR=$(printf '%s\n' "$OUT" | sed -n '1p')
    KEYS=$(printf '%s\n' "$OUT" | sed -n '2,$p')
    if [ -n "$KEYS" ]; then
      CNT=$(printf '%s\n' "$KEYS" | wc -l | awk '{print $1}')
      FOUND=$((FOUND + CNT))
      printf '%s\n' "$KEYS" | head -n 10
    fi
    ITER=$((ITER+1))
    if [ "$CUR" = "0" ] || [ $ITER -ge $MAX_ITER ]; then break; fi
  done
  echo "[扫描] receiver:* 命中合计 ${FOUND} 条 (展示最多10条)"
fi

echo "[完成] 如需完整扫描多前缀，请运行 scripts/redis-diagnostics.sh"

