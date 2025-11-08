#!/usr/bin/env bash
set -euo pipefail

# 完整流程脚本：注册(用户名≥7) → 登录获取JWT → 创建API Key → 获取 AAPL.US 报价
# 依赖：curl，推荐 jq（若无 jq 则使用 python3 解析关键字段）
# 默认 Base URL: http://localhost:3001
#
# 用法：
#   bash scripts/full-quote-flow.sh [BASE_URL]
#   或通过环境变量指定：USERNAME / PASSWORD / EMAIL / BASE_URL
#     USERNAME: 至少7位，未设置则自动生成
#     PASSWORD: 未设置则自动生成
#     EMAIL:    未设置则使用 <USERNAME>@example.com

BASE_URL="${1:-${BASE_URL:-http://localhost:3001}}"

has_cmd() { command -v "$1" >/dev/null 2>&1; }
has_jq() { has_cmd jq; }
has_python() { has_cmd python3; }

gen_random_alnum() {
  # 生成10位字母数字随机串（兼容性较好）
  if has_cmd openssl; then
    # openssl 随机后 base64，再过滤为字母数字
    openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 10
  else
    # /dev/urandom 回退方案
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 10
  fi
}

USERNAME="${USERNAME:-}"
PASSWORD="${PASSWORD:-}"
EMAIL="${EMAIL:-}"

# 生成默认用户名/密码/邮箱（确保用户名≥7位）
if [[ -z "$USERNAME" ]]; then
  USERNAME="qauser_$(date +%s)"
fi
if (( ${#USERNAME} < 7 )); then
  USERNAME="${USERNAME}_$(gen_random_alnum)"
fi
if [[ -z "$PASSWORD" ]]; then
  PASSWORD="P@ss$(gen_random_alnum)"
fi
if [[ -z "$EMAIL" ]]; then
  EMAIL="${USERNAME}@example.com"
fi

echo "[基址] BASE_URL=${BASE_URL}"
echo "[用户] USERNAME=${USERNAME} (≥7位要求满足)"
echo "[用户] EMAIL=${EMAIL}"

parse_json_login_access_token() {
  if has_jq; then
    jq -r '.data.accessToken'
  elif has_python; then
    python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
print((doc.get('data') or {}).get('accessToken',''))
PY
  else
    echo ""  # 无解析器时返回空，后续会提示错误
  fi
}

parse_json_key_appkey() {
  if has_jq; then
    jq -r '.data.appKey'
  elif has_python; then
    python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
print((doc.get('data') or {}).get('appKey',''))
PY
  else
    echo ""
  fi
}

parse_json_key_acctoken() {
  if has_jq; then
    jq -r '.data.accessToken'
  elif has_python; then
    python3 - "$@" <<'PY'
import sys, json
doc=json.load(sys.stdin)
print((doc.get('data') or {}).get('accessToken',''))
PY
  else
    echo ""
  fi
}

http_post_json() {
  local url="$1"; shift
  curl -sS -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" "$@"
}

http_get_auth_me() {
  local token="$1"
  curl -sS -w "\n%{http_code}" -X GET "${BASE_URL%/}/api/v1/auth/me" \
    -H "Authorization: Bearer ${token}"
}

split_body_code() {
  # 从 curl -w "\n%{http_code}" 的输出中分离 body 与 http_code
  awk 'NR==1{b=$0; next} {c=$0} END{print b > "/dev/stderr"; print c}'
}

echo "[1/5] 注册用户（若已存在将跳过）..."
REGISTER_OUT=$(http_post_json "${BASE_URL%/}/api/v1/auth/register" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"email\":\"${EMAIL}\"}")

REGISTER_HTTP_CODE=$(printf '%s' "$REGISTER_OUT" | tail -n1)
REGISTER_BODY=$(printf '%s' "$REGISTER_OUT" | sed '$d')

if [[ "$REGISTER_HTTP_CODE" == "201" || "$REGISTER_HTTP_CODE" == "200" ]]; then
  echo "注册成功"
else
  echo "注册返回HTTP: $REGISTER_HTTP_CODE（可能已存在），继续尝试登录..." >&2
fi

echo "[2/5] 登录获取 JWT ..."
LOGIN_OUT=$(http_post_json "${BASE_URL%/}/api/v1/auth/login" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
LOGIN_HTTP_CODE=$(printf '%s' "$LOGIN_OUT" | tail -n1)
LOGIN_BODY=$(printf '%s' "$LOGIN_OUT" | sed '$d')

if [[ "$LOGIN_HTTP_CODE" != "200" ]]; then
  echo "登录失败，HTTP=$LOGIN_HTTP_CODE，响应如下：" >&2
  echo "$LOGIN_BODY" >&2
  exit 1
fi

JWT=$(printf '%s' "$LOGIN_BODY" | parse_json_login_access_token)
if [[ -z "$JWT" || "$JWT" == "null" ]]; then
  echo "无法从登录响应解析 accessToken，原始响应如下：" >&2
  echo "$LOGIN_BODY" >&2
  echo "建议安装 jq 或确保 python3 可用。" >&2
  exit 1
fi
echo "获取 JWT 成功"

echo "[3/5] 校验 JWT（/auth/me）..."
ME_OUT=$(http_get_auth_me "$JWT")
ME_HTTP_CODE=$(printf '%s' "$ME_OUT" | tail -n1)
ME_BODY=$(printf '%s' "$ME_OUT" | sed '$d')
if [[ "$ME_HTTP_CODE" != "200" ]]; then
  echo "校验失败，HTTP=$ME_HTTP_CODE，响应如下：" >&2
  echo "$ME_BODY" >&2
  exit 1
fi
echo "JWT 有效"

echo "[4/5] 使用 JWT 创建 API Key（READ，30d）..."
KEY_OUT=$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL%/}/api/v1/auth/api-keys" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"local-read","profile":"READ","expiresIn":"30d"}')
KEY_HTTP_CODE=$(printf '%s' "$KEY_OUT" | tail -n1)
KEY_BODY=$(printf '%s' "$KEY_OUT" | sed '$d')
if [[ "$KEY_HTTP_CODE" != "201" && "$KEY_HTTP_CODE" != "200" ]]; then
  echo "创建 API Key 失败，HTTP=$KEY_HTTP_CODE，响应如下：" >&2
  echo "$KEY_BODY" >&2
  exit 1
fi

APP_KEY=$(printf '%s' "$KEY_BODY" | parse_json_key_appkey)
API_ACCESS_TOKEN=$(printf '%s' "$KEY_BODY" | parse_json_key_acctoken)
if [[ -z "$APP_KEY" || "$APP_KEY" == "null" || -z "$API_ACCESS_TOKEN" || "$API_ACCESS_TOKEN" == "null" ]]; then
  echo "无法解析 API Key/AccessToken，响应如下：" >&2
  echo "$KEY_BODY" >&2
  exit 1
fi
echo "创建成功：APP_KEY=$APP_KEY"

echo "[5/5] 使用 API Key 获取 AAPL.US 报价（强时效 /receiver/data）..."
QUOTE_OUT=$(curl -sS -X POST "${BASE_URL%/}/api/v1/receiver/data" \
  -H "X-App-Key: ${APP_KEY}" \
  -H "X-Access-Token: ${API_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
        "symbols":["00700.HK"],
        "receiverType":"get-stock-quote",
        "options":{
          "realtime":true,
          "preferredProvider":"longport",
          "timeout":3000,
          "fields":["lastPrice","volume","prev_close","open","high","low"]
        }
      }')

echo "=== 报价响应（标准结构） ==="
if has_jq; then
  echo "$QUOTE_OUT" | jq
else
  echo "$QUOTE_OUT"
fi

echo
echo "校验提示：" >&2
echo "- 顶层 success 应为 true，statusCode=200/201" >&2
echo "- .data.metadata.provider 应为 longport；hasPartialFailures=false" >&2
echo "- .data.data[0] 为 AAPL.US 的报价（含 lastPrice/volume 等）" >&2

