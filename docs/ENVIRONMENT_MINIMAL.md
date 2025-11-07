# 开发环境最小化环境变量清单

仅保留运行所需的最小集合，其余大部分历史变量可删除。

必需
- `NODE_ENV`: `development` | `production` | `test`
- `PORT`: HTTP 端口（如 `3000`）
- `MONGODB_URI`: 例如 `mongodb://localhost:27017/smart-stock-data`
- `JWT_SECRET`: 至少 32 字符的强随机字符串
- Redis（二选一）
  - `REDIS_URL`: 例如 `redis://localhost:6379`（优先）
  - 或 `REDIS_HOST` + `REDIS_PORT`

建议
- `CORS_ORIGIN`: 逗号分隔的白名单，如 `http://localhost:3000`
- `JWT_EXPIRES_IN`: 令牌有效期，如 `24h`
- `CACHE_DEFAULT_TTL_SECONDS`: 缓存默认 TTL 秒数，如 `300`

数据源（可选，按需启用相应 Provider）
- LongPort: `LONGPORT_APP_KEY`/`LONGPORT_APP_SECRET`/`LONGPORT_ACCESS_TOKEN`
- LongPort SG: `LONGPORT_SG_APP_KEY`/`LONGPORT_SG_APP_SECRET`/`LONGPORT_SG_ACCESS_TOKEN`

已废弃/未使用（可删除）
- 旧 Cache 配置：`CACHE_STRONG_TTL`、`CACHE_COMPRESSION_THRESHOLD`、`CACHE_MAX_ITEMS`、`CACHE_MAX_BATCH_SIZE`、`CACHE_MAX_KEY_LENGTH`、`CACHE_MAX_VALUE_SIZE_MB` 等
- 大段通用参数：`DEFAULT_BATCH_SIZE`、`MAX_BATCH_SIZE`、`FAST_OPERATION_THRESHOLD_MS` 等（现由代码默认值控制）
- Alert / Monitoring / Rate-limit 旧变量：`ALERT_*`、`RATE_LIMIT_*`、`IP_RATE_LIMIT_*`、`API_RATE_LIMIT_*`
- `ENV_*` 调试开关（未被读取）
- 未用数据源：`FUTU_*`、`ITICK_TOKEN`、`TWELVEDATA_API_KEY`

说明
- 代码已统一优先读取 `REDIS_URL`；未设置时回退 `REDIS_HOST/REDIS_PORT`。
- basic-cache 服务已兼容旧变量 `CACHE_DEFAULT_TTL`，但推荐迁移为 `CACHE_DEFAULT_TTL_SECONDS`。

