#!/usr/bin/env bash
set -euo pipefail

# Redis 流缓存诊断（StreamCache / DB=1 / keyPrefix=stream:）
# 用法示例：
#   bash scripts/redis-stream-diagnostics.sh                    # 基本信息 + 扫描stream:*
#   SYMBOL=AAPL.US bash scripts/redis-stream-diagnostics.sh     # 诊断某个符号的 quote 键
#   REDIS_URL=redis://localhost:6379 bash scripts/redis-stream-diagnostics.sh

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
STREAM_DB="${STREAM_DB:-1}"
SYMBOL="${SYMBOL:-}"

echo "[Redis] URL=${REDIS_URL} (Stream DB=${STREAM_DB})"

redis_cmd() {
  redis-cli -u "$REDIS_URL" "$@"
}

echo "[1/4] PING (DB $STREAM_DB) ..."
redis_cmd -n "$STREAM_DB" PING || true

echo "[2/4] INFO keyspace (前20行)"
redis_cmd -n "$STREAM_DB" INFO keyspace | sed -n '1,20p'

if [[ -n "$SYMBOL" ]]; then
  echo "[3/4] 诊断 symbol=${SYMBOL} 的 quote 键"
  KEY="stream:quote:${SYMBOL}"
  TYPE=$(redis_cmd -n "$STREAM_DB" TYPE "$KEY" || true)
  EXISTS=$(redis_cmd -n "$STREAM_DB" EXISTS "$KEY" || echo 0)
  PTTL=$(redis_cmd -n "$STREAM_DB" PTTL "$KEY" || echo -2)
  STRLEN=$(redis_cmd -n "$STREAM_DB" STRLEN "$KEY" 2>/dev/null || echo 0)
  echo "- KEY=${KEY}"
  echo "- EXISTS=${EXISTS} TYPE=${TYPE} PTTL(ms)=${PTTL} SIZE(bytes)=${STRLEN}"
  echo "- 样本 (前200字节)："
  redis_cmd -n "$STREAM_DB" GET "$KEY" | head -c 200 || true
  echo
else
  echo "[3/4] 扫描 stream:* (COUNT=200)"
  redis_cmd -n "$STREAM_DB" --scan --pattern 'stream:*' | head -n 50
fi

echo "[4/4] 小结"
echo "- StreamCache 使用独立 DB=${STREAM_DB}，前缀 stream:*"
echo "- quote 键格式: stream:quote:<SYMBOL>"
echo "- 如未见键：请先通过 WS 订阅并等待数据/或检查广播与缓存开关"
