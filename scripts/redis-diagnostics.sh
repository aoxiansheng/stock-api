#!/usr/bin/env bash
set -euo pipefail

# 加强版 Redis 诊断（只读）：
# - PING / INFO
# - 深度 SCAN（可配置页数与COUNT），支持多个前缀
# - 精确键直查（根据能力/符号/提供商推导 receiver 键）
#
# 环境变量（可选）：
#   REDIS_URL=redis://localhost:6379
#   BASE_DB=0             # BasicCache/SmartCache 所在DB
#   STREAM_DB=1           # StreamCache 所在DB
#   SCAN_COUNT=5000       # 每次SCAN的 COUNT
#   SCAN_MAX_ITER=50      # 每个前缀最多扫描的迭代次数
#   PATTERNS="receiver:*,data_change_detector:snapshot:*,sm:*,symbol-mapper:*"
#   DIAG_OP=get-stock-quote
#   DIAG_SYMBOL=AAPL.US
#   DIAG_PROVIDER=longport

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
BASE_DB="${BASE_DB:-}"
STREAM_DB="${STREAM_DB:-1}"
SCAN_COUNT="${SCAN_COUNT:-5000}"
SCAN_MAX_ITER="${SCAN_MAX_ITER:-50}"
PATTERNS_CSV="${PATTERNS:-receiver:*,data_change_detector:snapshot:*,sm:*,symbol-mapper:*}"
DIAG_OP="${DIAG_OP:-get-stock-quote}"
DIAG_SYMBOL="${DIAG_SYMBOL:-AAPL.US}"
DIAG_PROVIDER="${DIAG_PROVIDER:-longport}"

has_redis_cli() { command -v redis-cli >/dev/null 2>&1; }
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
  echo "未找到 redis-cli，请先安装（brew install redis 或使用 Docker redis-cli）" >&2
  exit 2
fi

BASE_DB="$(url_db "$REDIS_URL")"

echo "[Redis] URL=${REDIS_URL} (Base DB=${BASE_DB}, Stream DB=${STREAM_DB})"

echo "[1/6] PING..."
redis-cli -u "$REDIS_URL" PING || { echo "PING 失败" >&2; exit 1; }

echo "[2/6] INFO keyspace (前20行)"
redis-cli -u "$REDIS_URL" INFO keyspace | sed -n '1,20p'

scan_deep() {
  local url="$1"; shift
  local db="$1"; shift
  local pattern="$1"; shift
  local count="$1"; shift
  local max_iter="$1"; shift
  local found=0
  local cursor=0
  local iter=0
  echo "-- DB ${db} 深度扫描: '${pattern}' (COUNT=${count}, MAX_ITER=${max_iter})"
  while :; do
    # 使用 --raw：第一行是新游标，后续为命中的key（若有）
    out=$(redis-cli -u "$url" -n "$db" --raw SCAN "$cursor" MATCH "$pattern" COUNT "$count" || true)
    # 若命令失败或无输出，结束
    if [ -z "$out" ]; then break; fi
    cursor=$(printf '%s\n' "$out" | sed -n '1p')
    keys=$(printf '%s\n' "$out" | sed -n '2,$p')
    if [ -n "$keys" ]; then
      printf '%s\n' "$keys"
      kcnt=$(printf '%s\n' "$keys" | wc -l | awk '{print $1}')
      found=$((found + kcnt))
    fi
    iter=$((iter+1))
    if [[ "$cursor" == "0" || $iter -ge $max_iter ]]; then
      break
    fi
  done
  echo "-- 结束: 命中 ${found}，迭代 ${iter}，游标 ${cursor}"
}

echo "[3/6] 关键前缀深度扫描 (Base DB=${BASE_DB})"
IFS=',' read -r -a patterns <<< "$PATTERNS_CSV"
for p in "${patterns[@]}"; do
  scan_deep "$REDIS_URL" "$BASE_DB" "$p" "$SCAN_COUNT" "$SCAN_MAX_ITER" | sed -n '1,120p'
done

echo "[4/6] 关键前缀深度扫描 (Stream DB=${STREAM_DB})"
scan_deep "$REDIS_URL" "$STREAM_DB" "stream:*" "$SCAN_COUNT" "$SCAN_MAX_ITER" | sed -n '1,120p'

echo "[5/6] 样本TTL与值大小 (Base DB=${BASE_DB}, pattern=receiver:*)"
SAMPLE_KEY=$(redis-cli -u "$REDIS_URL" -n "$BASE_DB" --raw SCAN 0 MATCH "receiver:*" COUNT "$SCAN_COUNT" | awk 'NR==1{next} {print $0; exit}')
if [[ -n "${SAMPLE_KEY}" ]]; then
  echo "样本键: $SAMPLE_KEY"
  TTL=$(redis-cli -u "$REDIS_URL" -n "$BASE_DB" TTL "$SAMPLE_KEY")
  echo "TTL(s): $TTL"
  VAL=$(redis-cli -u "$REDIS_URL" -n "$BASE_DB" GET "$SAMPLE_KEY")
  BYTES=$(printf "%s" "$VAL" | wc -c | awk '{print $1}')
  echo "值大小(bytes): ${BYTES}"
else
  echo "未找到 receiver:* 样本键"
fi

echo "[6/6] 精确键直查 (推导 receiver 键)"
DERIVED_KEY="receiver:${DIAG_OP}:${DIAG_SYMBOL}:provider:${DIAG_PROVIDER}"
echo "派生键: ${DERIVED_KEY}"
TTL2=$(redis-cli -u "$REDIS_URL" -n "$BASE_DB" TTL "$DERIVED_KEY" 2>/dev/null || true)
if [[ -n "${TTL2}" && "$TTL2" != "-2" ]]; then
  echo "TTL(s): $TTL2"
  # 不打印值，避免打日志泄露；仅打印大小
  VAL2=$(redis-cli -u "$REDIS_URL" -n "$BASE_DB" GET "$DERIVED_KEY")
  BYTES2=$(printf "%s" "$VAL2" | wc -c | awk '{print $1}')
  echo "值大小(bytes): ${BYTES2}"
else
  echo "未命中派生键（可能未触发、已过期或键格式不同）"
fi

echo
echo "诊断解读："
echo "- 若TTL极短(1s)，建议临时将 SMART_CACHE_TTL_STRONG_S 调至 5 便于观察，然后重试"
echo "- 若依旧无 receiver:*，检查 SMARTCACHE_USE_REDIS 是否开启（默认true）及服务端是否降级到内存（查看日志）"
echo "- DB 1 为 StreamCache 专用，只有跑流场景才会出现 stream:*"
