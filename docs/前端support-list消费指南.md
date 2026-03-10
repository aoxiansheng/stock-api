# 前端 Support List 消费指南

- 写入时间：2026-03-10 08:13:22 +0800
- 版本：v1.0.0
- 适用范围：`/api/v1/query/support-list`、`/api/v1/query/support-list/meta`

## 1. 目标

前端只消费你们后端聚合后的接口，不直接访问上游 provider。这样可以避免上游地址暴露、屏蔽 provider 切换细节，并复用后端已实现的版本与增量编排能力。

## 2. 对外端点（前端应调用）

1. `GET /api/v1/query/support-list/meta?type=STOCK_US`
2. `GET /api/v1/query/support-list?type=STOCK_US&since=20260309020000&symbols=AAPL.US,TSLA.US`

说明：
1. `since` 为空时返回全量。
2. `since` 有值时返回增量；若版本链不可用，服务端返回 `409 + SUPPORT_LIST_RESYNC_REQUIRED`，不会自动回退全量。
3. `symbols` 为可选过滤条件；最多 1000 项，单项最长 64，仅允许 `A-Z0-9._:-`（服务端会规范化）。

## 3. 鉴权与响应结构

鉴权（两选一）：
1. JWT：`Authorization: Bearer <token>`
2. API Key：`X-App-Key` + `X-Access-Token`

统一响应包裹：
```json
{
  "success": true,
  "statusCode": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2026-03-10T00:13:22.000Z"
}
```

业务数据在 `data` 字段内。

## 4. 全量 / 增量语义（当前已支持）

`GET /api/v1/query/support-list` 的 `data` 存在两种形态：

全量：
```json
{
  "full": true,
  "version": "20260309020000",
  "items": [{ "symbol": "AAPL.US" }]
}
```

增量：
```json
{
  "full": false,
  "from": "20260301020000",
  "to": "20260309020000",
  "added": [{ "symbol": "TSLA.US" }],
  "updated": [{ "symbol": "META.US" }],
  "removed": ["BABA.US"]
}
```

关键行为：
1. `since == currentVersion` 返回空增量（`added/updated/removed` 都为空）。
2. 带 `since` 且版本链不可用（如 `since` 不在历史、增量链缺失、meta/current 失配）时，服务端返回 `409`，`errorCode=SUPPORT_LIST_RESYNC_REQUIRED`。
3. 客户端收到该 `409` 后，必须先发起一次不带 `since` 的全量重同步，再恢复增量请求。
4. 服务端已做按 `symbol` 的去重（last-win），客户端不需要二次去重策略。

## 5. 前端消费状态机（推荐）

1. 计算流键：`streamKey = type + '|' + sorted(symbols).join(',')`（无 symbols 用 `*`）。
2. 读取本地状态：`{ version, map<symbol,item> }`。
3. 首次或无本地版本：请求全量（不传 `since`）。
4. 有本地版本：请求增量（传 `since=local.version`）。
5. 若返回 `409 + SUPPORT_LIST_RESYNC_REQUIRED`：立即改为不带 `since` 请求全量重同步。
6. 若返回 `full:true`：用 `items` 全量覆盖本地 map，版本设为 `version`。
7. 若返回 `full:false`：按顺序应用 `added -> updated -> removed`，版本设为 `to`。
8. 将 `{version,map}` 持久化到本地存储（IndexedDB/LocalStorage）。

注意：
1. `streamKey` 必须隔离，不同 `symbols` 子集不能共享版本号。
2. 每次应用成功后才推进版本，失败则保持旧版本并重试。
3. 收到 `SUPPORT_LIST_RESYNC_REQUIRED` 后，只允许走“全量重同步 -> 恢复增量”路径，不要在同一次增量请求内兜底自动回退全量。

409 重同步示例流程：
1. 本地 `version=20260301020000`，请求 `GET /query/support-list?type=STOCK_US&since=20260301020000`。
2. 服务端返回 `409`，`errorCode=SUPPORT_LIST_RESYNC_REQUIRED`。
3. 客户端立即请求 `GET /query/support-list?type=STOCK_US`（不带 `since`）。
4. 用返回的 `full:true` 数据覆盖本地并更新 `version`。
5. 后续轮询继续携带新 `version` 走增量同步。

## 6. 最小实现示例（TypeScript）

```ts
type Item = { symbol: string; [k: string]: unknown };
type FullData = { full: true; version: string; items: Item[] };
type DeltaData = {
  full: false;
  from: string;
  to: string;
  added: Item[];
  updated: Item[];
  removed: string[];
};

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
};

type LocalState = { version: string | null; map: Map<string, Item> };
type ResyncRequiredError = {
  success: false;
  statusCode: 409;
  errorCode: "SUPPORT_LIST_RESYNC_REQUIRED";
  message: string;
};

function applyDelta(state: LocalState, delta: DeltaData): LocalState {
  const next = new Map(state.map);
  for (const item of delta.added) next.set(item.symbol, item);
  for (const item of delta.updated) next.set(item.symbol, item);
  for (const symbol of delta.removed) next.delete(symbol);
  return { version: delta.to, map: next };
}

function applyFull(full: FullData): LocalState {
  const next = new Map<string, Item>();
  for (const item of full.items) next.set(item.symbol, item);
  return { version: full.version, map: next };
}

async function syncSupportList(
  baseUrl: string,
  type: string,
  state: LocalState,
  symbols?: string[],
): Promise<LocalState> {
  async function request(version: string | null) {
    const qs = new URLSearchParams({ type });
    if (version) qs.set("since", version);
    if (symbols?.length) qs.set("symbols", symbols.join(","));

    const res = await fetch(
      `${baseUrl}/api/v1/query/support-list?${qs.toString()}`,
    );
    const body = (await res.json()) as
      | ApiEnvelope<FullData | DeltaData>
      | ResyncRequiredError;
    return { res, body };
  }

  const first = await request(state.version);
  if (
    first.res.status === 409 &&
    "errorCode" in first.body &&
    first.body.errorCode === "SUPPORT_LIST_RESYNC_REQUIRED"
  ) {
    const full = await request(null);
    if (
      !full.res.ok ||
      !("success" in full.body) ||
      !full.body.success ||
      !full.body.data.full
    ) {
      throw new Error("full resync failed");
    }
    return applyFull(full.body.data);
  }

  if (!first.res.ok || !("success" in first.body) || !first.body.success) {
    throw new Error(("message" in first.body && first.body.message) || "sync failed");
  }
  return first.body.data.full
    ? applyFull(first.body.data)
    : applyDelta(state, first.body.data);
}
```

## 7. 缓存结论（回答“是否需要后端再次缓存”）

结论：当前后端已经完成 support-list 缓存与版本化存储，默认不需要再加一层后端缓存。

已存在的后端缓存/存储能力：
1. `current` 快照：`support_list_current_{type}`
2. `meta` 元数据：`support_list_meta_{type}`
3. `delta` 增量链：`support_list_delta_{toVersion}_{type}`（TTL=7天）
4. 分布式刷新锁，避免并发刷新踩踏

何时才考虑再加 BFF 短 TTL 缓存：
1. 同一 `type+since+symbols` 重复请求极高，且读存储已成为瓶颈。
2. 监控显示接口 P95 持续超标并确认瓶颈在读取层而非网络层。
3. 有明确成本收益评估。

若满足以上条件，再增加 30~120 秒短 TTL 响应缓存即可；当前阶段建议先保持现状，避免过度工程化。

## 8. 错误码表与处理建议

| HTTP | errorCode | 场景 | 客户端处理 |
| --- | --- | --- | --- |
| `400` | - | 参数错误（如 `since` 非 14 位、未来时间、`type` 不支持） | 不重试，提示修正参数 |
| `401/403` | - | 鉴权失败 | 刷新凭证后重试 |
| `409` | `SUPPORT_LIST_RESYNC_REQUIRED` | 带 `since` 请求但版本链不可用 | 立即执行不带 `since` 的全量重同步，成功后恢复增量 |
| `5xx` | - | 服务异常 | 指数退避重试（如 1s/2s/4s，上限 30s） |

若连续失败，保留本地旧版本供只读展示，并上报监控。

## 9. 落地清单

1. 接口基址统一走你们后端域名，不透传上游地址。
2. 按 `streamKey` 维度持久化 `version + map`。
3. 先实现“全量覆盖 + 增量合并 + 删除应用”三步闭环。
4. 接入监控：成功率、`409(SUPPORT_LIST_RESYNC_REQUIRED)` 触发率、平均同步耗时。
