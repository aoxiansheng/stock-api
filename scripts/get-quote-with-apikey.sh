#!/usr/bin/env bash
set -euo pipefail

# 简介：
# - 使用提供的 JWT 创建 API Key（READ，30d），然后用 API Key 获取 AAPL.US 的报价
# - 需要本服务运行在 BASE_URL（默认 http://localhost:3000）
# - 优先使用 jq 解析返回；若无 jq，则使用 python3 解析关键字段
#
# 用法：
#   scripts/get-quote-with-apikey.sh <JWT> [BASE_URL]
#   或者：导出 JWT 环境变量后调用
#   export JWT=... && scripts/get-quote-with-apikey.sh

BASE_URL="${2:-${BASE_URL:-http://localhost:3000}}"

if [[ "${1:-}" != "" ]]; then
  JWT="$1"
else
  JWT="${JWT:-}"
fi

if [[ -z "${JWT}" ]]; then
  echo "用法: $0 <JWT> [BASE_URL]" >&2
  echo "示例: $0 eyJhbGciOi... http://localhost:3000" >&2
  exit 2
fi

has_jq() { command -v jq >/dev/null 2>&1; }
json_get_appkey() {
  if has_jq; then jq -r '.data.appKey'; else python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
data=doc.get('data') or {}
print(data.get('appKey',''))
PY
  fi
}
json_get_acctoken() {
  if has_jq; then jq -r '.data.accessToken'; else python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
data=doc.get('data') or {}
print(data.get('accessToken',''))
PY
  fi
}

echo "[1/3] 使用 JWT 创建 API Key (READ, 30d) ..." >&2
KEY_JSON=$(curl -sS -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"local-read","profile":"READ","expiresIn":"30d"}')

APP_KEY=$(printf '%s' "$KEY_JSON" | json_get_appkey)
API_ACCESS_TOKEN=$(printf '%s' "$KEY_JSON" | json_get_acctoken)

if [[ -z "$APP_KEY" || -z "$API_ACCESS_TOKEN" || "$APP_KEY" == "null" || "$API_ACCESS_TOKEN" == "null" ]]; then
  echo "创建 API Key 失败，原始响应如下：" >&2
  echo "$KEY_JSON" >&2
  exit 1
fi

echo "创建成功：APP_KEY=$APP_KEY" >&2
echo "创建成功：API_ACCESS_TOKEN=$API_ACCESS_TOKEN" >&2

echo "[2/3] 使用 API Key 请求 AAPL.US 报价 (强时效 /receiver/data) ..." >&2
QUOTE_JSON=$(curl -sS -X POST "${BASE_URL%/}/api/v1/receiver/data" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${API_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
        "symbols":["AAPL.US"],
        "receiverType":"get-stock-quote",
        "options":{
          "realtime":true,
          "preferredProvider":"longport",
          "timeout":3000,
          "fields":["lastDone","volume","prev_close","open","high","low"]
        }
      }')

echo "[3/3] 响应（标准格式）:" >&2
if has_jq; then
  echo "$QUOTE_JSON" | jq
else
  echo "$QUOTE_JSON"
fi

# 简要提示
echo >&2
echo "校验要点：" >&2
echo "- 顶层 success=true, statusCode=200/201" >&2
echo "- .data.metadata.provider 应为 longport；hasPartialFailures=false" >&2
echo "- .data.data[0] 为 AAPL.US 报价，含 lastPrice/volume 等字段" >&2

